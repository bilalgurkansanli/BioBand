import { resolveCountedSession } from '../../shared/countedSession';

import type { PadSongDefinition, PadSongScope, PlayMode, ResolvedPadSession } from './types';

/** Session for a pads lesson: the whole chart, or its first `partialCount` events. */
export function resolvePadPlaySession(
  song: PadSongDefinition,
  mode: PlayMode,
  scope: PadSongScope,
): ResolvedPadSession {
  return resolveCountedSession(song, mode, scope);
}
