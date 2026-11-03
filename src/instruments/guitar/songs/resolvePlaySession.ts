import { resolveCountedSession } from '../../shared/countedSession';

import type { GuitarSongDefinition, GuitarSongScope, PlayMode, ResolvedGuitarSession } from './types';

/** Session for a guitar lesson: the whole chart, or its first `partialCount` events. */
export function resolveGuitarPlaySession(
  song: GuitarSongDefinition,
  mode: PlayMode,
  scope: GuitarSongScope,
): ResolvedGuitarSession {
  return resolveCountedSession(song, mode, scope);
}
