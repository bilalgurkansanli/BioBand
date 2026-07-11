import type { PlayMode, SongDefinition, SongEvent, SongPartialWindow, SongScope } from './types';

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
  const lastAt = song.events[song.events.length - 1]?.atMs ?? 0;
  return {
    startMs: eventsStart,
    endMs: eventsStart + lastAt + 2000,
  };
}

/**
 * Map catalog song + wizard choices into session events and audio window.
 * Event `atMs` values are relative to session start (0 = first moment of play).
 */
export function resolvePlaySession(
  song: SongDefinition,
  playMode: PlayMode,
  songScope: SongScope,
): ResolvedPlaySession {
  const useBacking = playMode === 'fullBand' && song.backingTrack != null;
  const eventsStart = song.backingTrack?.eventsStartMs ?? 0;

  if (!useBacking) {
    // Piano-only: keep existing relative events; optional partial trim.
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
        events: sliced.length > 0 ? sliced : song.events,
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
    events: events.length > 0 ? events : song.events,
    useBacking: true,
    audioStartMs,
    audioEndMs,
  };
}

export function songHasBackingTrack(song: SongDefinition | null | undefined): boolean {
  return song?.backingTrack != null;
}
