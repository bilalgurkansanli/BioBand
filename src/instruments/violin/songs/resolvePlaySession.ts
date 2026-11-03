import { resolveCountedSession } from '../../shared/countedSession';

import type { ViolinSongDefinition, ViolinSongScope, PlayMode, ResolvedViolinSession } from './types';

/** Session for a violin lesson: the whole chart, or its first `partialCount` events. */
export function resolveViolinPlaySession(
  song: ViolinSongDefinition,
  mode: PlayMode,
  scope: ViolinSongScope,
): ResolvedViolinSession {
  return resolveCountedSession(song, mode, scope);
}
