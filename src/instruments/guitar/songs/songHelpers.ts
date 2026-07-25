import type { GuitarStringId } from '../guitarSounds';
import { formatPluckSoundId } from '../guitarSounds';
import type { GuitarSongEvent } from './types';

/**
 * Build a timed play-along event. `durationMs` is the ring time; omit it where
 * the note simply lasts until the next one, give it where the written rhythm
 * says otherwise — a held phrase ending, a stab, a note left to ring on.
 */
export function e(
  soundId: string,
  atMs: number,
  durationMs?: number,
): GuitarSongEvent {
  return durationMs === undefined
    ? { soundId, atMs }
    : { soundId, atMs, durationMs };
}

/** Fretted note shortcut: `note('s2', 3, atMs)` → `s2:f3`. */
export function note(
  stringId: GuitarStringId,
  fret: number,
  atMs: number,
  durationMs?: number,
): GuitarSongEvent {
  return e(formatPluckSoundId(stringId, fret), atMs, durationMs);
}

/**
 * A chord landmark under a single-note tune. It is strummed and heard, but is
 * never highlighted or scored: the chart teaches the melody, and a barre chord
 * dropped into the middle of a riff is a bed, not the next note to play.
 */
export function bed(soundId: string, atMs: number): GuitarSongEvent {
  return { soundId, atMs, role: 'accompaniment' };
}
