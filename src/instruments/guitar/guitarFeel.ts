// Chip-selectable playing-feel presets (settings): strum stagger, one-shot
// sustain tails, and the visible fret range.

export type GuitarStrumTightnessId = 'tight' | 'normal' | 'loose';
export type GuitarSustainLengthId = 'short' | 'normal' | 'long';
export type GuitarFretRange = 5 | 8 | 12;

export const GUITAR_STRUM_TIGHTNESS_IDS: GuitarStrumTightnessId[] = [
  'tight',
  'normal',
  'loose',
];

export const GUITAR_SUSTAIN_LENGTH_IDS: GuitarSustainLengthId[] = [
  'short',
  'normal',
  'long',
];

export const GUITAR_FRET_RANGE_OPTIONS: GuitarFretRange[] = [5, 8, 12];

/** Multiplier on the strum cascade stagger (tight pick vs lazy campfire). */
export const GUITAR_STRUM_TIGHTNESS_SCALE: Record<GuitarStrumTightnessId, number> = {
  tight: 0.55,
  normal: 1,
  loose: 1.9,
};

/** Multiplier on one-shot hold/release tails (held notes end on finger lift). */
export const GUITAR_SUSTAIN_SCALE: Record<GuitarSustainLengthId, number> = {
  short: 0.45,
  normal: 1,
  long: 1.8,
};

export function isGuitarStrumTightnessId(
  value: unknown,
): value is GuitarStrumTightnessId {
  return (
    typeof value === 'string' &&
    (GUITAR_STRUM_TIGHTNESS_IDS as string[]).includes(value)
  );
}

export function isGuitarSustainLengthId(
  value: unknown,
): value is GuitarSustainLengthId {
  return (
    typeof value === 'string' &&
    (GUITAR_SUSTAIN_LENGTH_IDS as string[]).includes(value)
  );
}

export function normalizeGuitarFretRange(value: unknown): GuitarFretRange {
  return value === 5 || value === 8 ? value : 12;
}
