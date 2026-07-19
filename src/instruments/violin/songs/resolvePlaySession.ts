import { songHasBackingAudio } from '../../piano/songs/types';

import type {
  PlayMode,
  ResolvedViolinSession,
  ViolinSongDefinition,
  ViolinSongScope,
} from './types';

const FALLBACK_PARTIAL = 12;

export function resolveViolinPlaySession(
  song: ViolinSongDefinition,
  mode: PlayMode,
  scope: ViolinSongScope,
): ResolvedViolinSession {
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
  const lastEventMs = slice[slice.length - 1]?.atMs ?? 0;
  const audioEndMs = useBacking ? audioStartMs + lastEventMs + 2000 : undefined;

  return { events: slice, scope, useBacking, audioStartMs, audioEndMs };
}
