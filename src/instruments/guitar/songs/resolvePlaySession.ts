import type { GuitarSongDefinition, GuitarSongScope, ResolvedGuitarSession } from './types';

const FALLBACK_PARTIAL = 12;

export function resolveGuitarPlaySession(
  song: GuitarSongDefinition,
  scope: GuitarSongScope,
): ResolvedGuitarSession {
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

  return { events: song.events.slice(0, count), scope };
}
