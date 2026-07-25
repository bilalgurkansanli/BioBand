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

function defaultPartialWindow(song: SongDefinition): SongPartialWindow {
  if (song.partialWindowMs) {
    return song.partialWindowMs;
  }
  const eventsStart = song.backingTrack?.eventsStartMs ?? 0;
  const events = melodyOnly(song.events);
  if (events.length === 0) {
    return { startMs: eventsStart, endMs: eventsStart };
  }
  // Fallback excerpt: first ~50 notes (until the song gets a real window).
  const endIdx = Math.min(49, events.length - 1);
  return {
    startMs: eventsStart + events[0].atMs,
    endMs: eventsStart + events[endIdx].atMs,
  };
}

function fallbackPartialEvents(song: SongDefinition): SongEvent[] {
  const melody = melodyOnly(song.events);
  const endIdx = Math.min(49, melody.length - 1);
  if (endIdx < 0) {
    return [];
  }
  const startRel = melody[0].atMs;
  const endRel = melody[endIdx].atMs;
  // Only the timeline is rebased — length, strength, role and transpose all
  // have to survive, or accompaniment gets promoted into the scored chart.
  return song.events
    .filter((event) => event.atMs >= startRel && event.atMs <= endRel)
    .map((event) => ({
      ...event,
      atMs: event.atMs - startRel,
    }));
}

/**
 * Map catalog song + wizard choices into session events and audio window.
 * Event `atMs` values are relative to session start (0 = first moment of play)
 * in song-time (tempo rate is applied by the play-along clock / backing player).
 */
export function resolvePlaySession(
  song: SongDefinition,
  playMode: PlayMode,
  songScope: SongScope,
): ResolvedPlaySession {
  const useBacking =
    playMode === 'fullBand' && songHasBackingAudio(song.backingTrack);
  const eventsStart = song.backingTrack?.eventsStartMs ?? 0;

  if (!useBacking) {
    if (songScope === 'partial') {
      const window = defaultPartialWindow(song);
      const startRel = Math.max(0, window.startMs - eventsStart);
      const endRel = Math.max(startRel, window.endMs - eventsStart);
      const sliced = song.events
        .filter((event) => event.atMs >= startRel && event.atMs <= endRel)
        .map((event) => ({
          ...event,
          atMs: event.atMs - startRel,
        }));
      return {
        events: pianoVoiceOnly(
          sliced.length > 0 ? sliced : fallbackPartialEvents(song),
        ),
        useBacking: false,
        audioStartMs: 0,
        audioEndMs: null,
      };
    }
    return {
      events: pianoVoiceOnly(song.events),
      useBacking: false,
      audioStartMs: 0,
      audioEndMs: null,
    };
  }

  const window =
    songScope === 'partial'
      ? defaultPartialWindow(song)
      : { startMs: 0, endMs: Number.POSITIVE_INFINITY };

  const audioStartMs = songScope === 'partial' ? window.startMs : 0;
  const audioEndMs = songScope === 'partial' ? window.endMs : null;

  const absolute = song.events.map((event) => ({
    ...event,
    atMs: eventsStart + event.atMs,
  }));

  const inWindow = absolute.filter(
    (event) => event.atMs >= audioStartMs && event.atMs <= (audioEndMs ?? Infinity),
  );

  const events = inWindow.map((event) => ({
    ...event,
    atMs: Math.max(0, event.atMs - audioStartMs),
  }));

  return {
    events: pianoVoiceOnly(
      events.length > 0 ? events : fallbackPartialEvents(song),
    ),
    useBacking: true,
    audioStartMs,
    audioEndMs,
  };
}
