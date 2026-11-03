import { songHasBackingAudio, type SongBackingTrack } from '../piano/songs/types';

// Session resolution for the instruments whose excerpt is "the first N
// events" (guitar, violin, drums, pads). Four copies of this used to differ
// only in their type names.

/** Excerpt length when a song does not set `partialCount`. */
export const FALLBACK_PARTIAL_COUNT = 12;

/**
 * Backing audio kept after an excerpt's last note, so that note's hit window
 * is open before the track stops. Shared with the piano's window-based
 * excerpts.
 */
export const PARTIAL_TAIL_MS = 2000;

export type CountedSong<TEvent> = {
  events: TEvent[];
  partialCount?: number;
  backingTrack?: SongBackingTrack;
};

export type CountedSession<TEvent, TScope> = {
  events: TEvent[];
  scope: TScope;
  /** True when backing audio should play alongside the chart. */
  useBacking: boolean;
  /** Audio position (ms) where events[0] aligns. */
  audioStartMs: number;
  /** Audio position (ms) where the partial excerpt ends. */
  audioEndMs?: number;
};

export function resolveCountedSession<
  TEvent extends { atMs: number },
  TScope extends 'partial' | 'full',
>(song: CountedSong<TEvent>, mode: string, scope: TScope): CountedSession<TEvent, TScope> {
  const useBacking = mode === 'fullBand' && songHasBackingAudio(song.backingTrack);
  const audioStartMs = song.backingTrack?.eventsStartMs ?? 0;

  if (scope === 'full') {
    return { events: song.events, scope, useBacking, audioStartMs };
  }

  const count = Math.max(
    1,
    Math.min(
      song.events.length,
      song.partialCount && song.partialCount > 0
        ? song.partialCount
        : Math.min(FALLBACK_PARTIAL_COUNT, song.events.length),
    ),
  );

  const slice = song.events.slice(0, count);
  if (slice.length === 0) {
    return { events: slice, scope, useBacking, audioStartMs };
  }

  const lastEventMs = slice[slice.length - 1].atMs;
  const audioEndMs = useBacking ? audioStartMs + lastEventMs + PARTIAL_TAIL_MS : undefined;

  return { events: slice, scope, useBacking, audioStartMs, audioEndMs };
}
