import {
  songHasBackingAudio,
  type PlayMode,
  type SongDefinition,
  type SongEvent,
  type SongPartialWindow,
  type SongScope,
} from './types';

export type ResolvedPlaySession = {
  events: SongEvent[];
  useBacking: boolean;
  /** Seek / start position on the backing track. */
  audioStartMs: number;
  /** Stop backing here; null = play until natural end (full scope). */
  audioEndMs: number | null;
};

/** Notes in the default excerpt when a song does not name one. */
const DEFAULT_PARTIAL_NOTES = 50;

/**
 * Backing audio kept after the excerpt's last note. Stopping exactly on its
 * onset scored that note a miss before its window had even opened fully; the
 * other instruments already played on for the same two seconds.
 */
export const PARTIAL_TAIL_MS = 2000;

/**
 * The excerpt is measured in notes the user actually plays. Counting
 * accompaniment would roughly halve it for any song carrying a bass line.
 */
function melodyOnly(events: SongEvent[]): SongEvent[] {
  return events.filter((event) => (event.role ?? 'melody') === 'melody');
}

/**
 * The piano's sample set starts at C4, so a left hand can only be produced by
 * stretching a sample a full octave down — playback rate 0.5, which smears the
 * attack and reads as some other, duller instrument sitting behind the piano
 * rather than as the piano itself. This is an instrument app: each instrument
 * has to sound like itself, so the piano plays the tune alone.
 *
 * The accompaniment stays in the charts. Give the piano real samples below C4
 * and deleting this one call is all it takes to hear it.
 */
function pianoVoiceOnly(events: SongEvent[]): SongEvent[] {
  return melodyOnly(events);
}

/** First ~50 melody notes — used until a song names its own excerpt. */
function defaultPartialWindow(song: SongDefinition): SongPartialWindow {
  const melody = melodyOnly(song.events);
  if (melody.length === 0) {
    return { startMs: 0, endMs: 0 };
  }
  const endIdx = Math.min(DEFAULT_PARTIAL_NOTES - 1, melody.length - 1);
  return { startMs: melody[0].atMs, endMs: melody[endIdx].atMs };
}

function inWindow(event: SongEvent, window: SongPartialWindow): boolean {
  return event.atMs >= window.startMs && event.atMs <= window.endMs;
}

/**
 * The song's excerpt in chart time (see `SongPartialWindow`). A window that
 * holds no melody at all falls back to the default, rather than to an empty
 * lesson.
 */
function partialWindow(song: SongDefinition): SongPartialWindow {
  const named = song.partialWindowMs;
  if (named && melodyOnly(song.events).some((event) => inWindow(event, named))) {
    return named;
  }
  return defaultPartialWindow(song);
}

/**
 * Map catalog song + wizard choices into session events and audio window.
 * Event `atMs` values are relative to session start (0 = first moment of play)
 * in song-time (tempo rate is applied by the play-along clock / backing player).
 *
 * Chart time and audio time meet here and only here:
 * `audio = backingTrack.eventsStartMs + chart`.
 */
export function resolvePlaySession(
  song: SongDefinition,
  playMode: PlayMode,
  songScope: SongScope,
): ResolvedPlaySession {
  const useBacking =
    playMode === 'fullBand' && songHasBackingAudio(song.backingTrack);
  const eventsStart = useBacking ? (song.backingTrack?.eventsStartMs ?? 0) : 0;

  if (songScope === 'full') {
    if (!useBacking) {
      return {
        events: pianoVoiceOnly(song.events),
        useBacking: false,
        audioStartMs: 0,
        audioEndMs: null,
      };
    }
    // The track plays from its own start; notes sit at their audio position.
    // A chart calibrated to start before the file does loses what would fall
    // before 0 — there is no audio there to play along with.
    return {
      events: pianoVoiceOnly(
        song.events
          .filter((event) => eventsStart + event.atMs >= 0)
          .map((event) => ({ ...event, atMs: eventsStart + event.atMs })),
      ),
      useBacking: true,
      audioStartMs: 0,
      audioEndMs: null,
    };
  }

  const window = partialWindow(song);
  // Without backing this is just the excerpt's first note; with it, the
  // excerpt's place in the user's file (never before the file's start).
  const audioStartMs = Math.max(0, eventsStart + window.startMs);

  // Only the timeline is rebased — length, strength, role and transpose all
  // have to survive, or accompaniment gets promoted into the scored chart.
  const events = song.events
    .filter((event) => inWindow(event, window) && eventsStart + event.atMs >= audioStartMs)
    .map((event) => ({ ...event, atMs: eventsStart + event.atMs - audioStartMs }));

  return {
    events: pianoVoiceOnly(events),
    useBacking,
    audioStartMs: useBacking ? audioStartMs : 0,
    audioEndMs: useBacking ? eventsStart + window.endMs + PARTIAL_TAIL_MS : null,
  };
}
