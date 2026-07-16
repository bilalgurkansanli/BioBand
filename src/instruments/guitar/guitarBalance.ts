import type { GuitarStringId } from './guitarSounds';

/**
 * Subtle per-string balance — wound bass a touch fuller, plain trebles a touch lighter.
 * Keep the range tight so chords stay even.
 */
const STRING_GAIN_BALANCE: Record<GuitarStringId, number> = {
  s6: 1.07, // low E
  s5: 1.04, // A
  s4: 1.02, // D
  s3: 1.0, // G
  s2: 0.97, // B
  s1: 0.93, // high e
};

export function guitarStringGainBalance(stringId: GuitarStringId): number {
  return STRING_GAIN_BALANCE[stringId] ?? 1;
}
