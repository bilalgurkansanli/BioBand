import { resolveCountedSession } from '../../shared/countedSession';

import type { DrumSongDefinition, DrumSongScope, PlayMode, ResolvedDrumSession } from './types';

/** Session for a drums lesson: the whole chart, or its first `partialCount` events. */
export function resolveDrumPlaySession(
  song: DrumSongDefinition,
  mode: PlayMode,
  scope: DrumSongScope,
): ResolvedDrumSession {
  return resolveCountedSession(song, mode, scope);
}
