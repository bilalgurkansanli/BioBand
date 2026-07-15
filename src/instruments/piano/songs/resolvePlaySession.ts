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

function defaultPartialWindow(song: SongDefinition): SongPartialWindow {
  if (song.partialWindowMs) {
    return song.partialWindowMs;
  }
  const eventsStart = song.backingTrack?.eventsStartMs ?? 0;
  const events = song.events;
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
  const endIdx = Math.min(49, song.events.length - 1);
  if (endIdx < 0) {
    return [];
  }
  const startRel = song.events[0].atMs;
  return song.events.slice(0, endIdx + 1).map((event) => ({
    noteId: event.noteId,
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
          noteId: event.noteId,
          atMs: event.atMs - startRel,
        }));
      return {
        events: sliced.length > 0 ? sliced : fallbackPartialEvents(song),
        useBacking: false,
        audioStartMs: 0,
        audioEndMs: null,
      };
    }
    return {
      events: song.events,
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
    noteId: event.noteId,
    atMs: eventsStart + event.atMs,
  }));

  const inWindow = absolute.filter(
    (event) => event.atMs >= audioStartMs && event.atMs <= (audioEndMs ?? Infinity),
  );

  const events = inWindow.map((event) => ({
    noteId: event.noteId,
    atMs: Math.max(0, event.atMs - audioStartMs),
  }));

  return {
    events: events.length > 0 ? events : fallbackPartialEvents(song),
    useBacking: true,
    audioStartMs,
    audioEndMs,
  };
}

export function songHasBackingTrack(song: SongDefinition | null | undefined): boolean {
  return songHasBackingAudio(song?.backingTrack);
}
