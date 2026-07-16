import type { GuitarStringId } from '../guitarSounds';
import { formatPluckSoundId } from '../guitarSounds';
import type { GuitarSongEvent } from './types';

/** Build a timed play-along event. */
export function e(soundId: string, atMs: number): GuitarSongEvent {
  return { soundId, atMs };
}

/** Fretted note shortcut: `note('s2', 3, atMs)` → `s2:f3`. */
export function note(
  stringId: GuitarStringId,
  fret: number,
  atMs: number,
): GuitarSongEvent {
  return e(formatPluckSoundId(stringId, fret), atMs);
}
