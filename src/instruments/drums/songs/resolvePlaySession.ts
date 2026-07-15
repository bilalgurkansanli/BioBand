import type {
  DrumSongDefinition,
  DrumSongScope,
  ResolvedDrumSession,
} from './types';

const FALLBACK_PARTIAL = 12;

export function resolveDrumPlaySession(
  song: DrumSongDefinition,
  scope: DrumSongScope,
): ResolvedDrumSession {
  if (scope === 'full') {
    return { events: song.events, scope };
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
    };
  }

  return { events: slice, scope };
}
