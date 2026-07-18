import { songHasBackingAudio } from '../../piano/songs/types';

import type {
  PadSongDefinition,
  PadSongScope,
  PlayMode,
  ResolvedPadSession,
} from './types';

const FALLBACK_PARTIAL = 12;

export function resolvePadPlaySession(
  song: PadSongDefinition,
  mode: PlayMode,
  scope: PadSongScope,
): ResolvedPadSession {
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
        : Math.min(FALLBACK_PARTIAL, song.events.length),
    ),
  );

  const slice = song.events.slice(0, count);
  if (slice.length === 0) {
    return {
      events: song.events.slice(0, Math.min(FALLBACK_PARTIAL, song.events.length)),
      scope,
      useBacking,
      audioStartMs,
    };
  }

  const lastEventMs = slice[slice.length - 1]?.atMs ?? 0;
  const audioEndMs = useBacking ? audioStartMs + lastEventMs + 2000 : undefined;

  return { events: slice, scope, useBacking, audioStartMs, audioEndMs };
}
