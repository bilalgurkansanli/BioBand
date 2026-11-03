// Pitch arithmetic shared by every importer that has to land arbitrary MIDI
// numbers on an instrument with a fixed compass: the piano's two octaves, a
// guitar neck, a violin's four strings. Each converter used to carry its own
// copy, and the copies had already started to differ.

/** Lowest and highest octave a pitch name may carry: C-1 is MIDI 0, G9 is 127. */
export const MIN_PITCH_OCTAVE = -1;
export const MAX_PITCH_OCTAVE = 9;

/** Positive modulo — JS `%` keeps the sign of the dividend. */
function mod(n: number, m: number): number {
  return ((n % m) + m) % m;
}

/**
 * Fold a pitch into `[min, max]` by whole octaves, in constant time.
 *
 * This used to be two `while` loops stepping 12 at a time. That is harmless for
 * a real MIDI number, but an imported document can name any octave, and once a
 * value is large enough that `n - 12 === n` in floating point the loop never
 * ends — one bad note froze the whole app. Arithmetic folding gives the same
 * answer for every value the loops ever terminated on.
 *
 * Non-finite input has no octave to fold; it returns null and the caller picks
 * the fallback.
 */
export function foldIntoRange(midiNumber: number, min: number, max: number): number | null {
  if (!Number.isFinite(midiNumber)) {
    return null;
  }
  let n = Math.round(midiNumber);
  if (n < min) {
    n = min + mod(n - min, 12);
  }
  if (n > max) {
    n = max - mod(max - n, 12);
  }
  return n;
}

/**
 * One octave shift for a whole set of pitches — the one leaving the fewest
 * outside `[min, max]`, breaking ties toward the range's centre.
 *
 * Folding each note into range on its own is what makes an imported tune stop
 * sounding like itself: a descending line suddenly leaps an octave up, and
 * contour is the most recognisable thing a melody has. Moving the whole piece
 * keeps every interval intact.
 */
export function chooseOctaveShift(
  midiNumbers: number[],
  min: number,
  max: number,
): number {
  const finite = midiNumbers.filter((n) => Number.isFinite(n));
  if (finite.length === 0) {
    return 0;
  }

  const centre = (min + max) / 2;
  const mean = finite.reduce((sum, n) => sum + n, 0) / finite.length;

  let bestShift = 0;
  let bestOutside = Infinity;
  let bestDistance = Infinity;

  for (let shift = -72; shift <= 72; shift += 12) {
    let outside = 0;
    for (const n of finite) {
      const shifted = n + shift;
      if (shifted < min || shifted > max) {
        outside += 1;
      }
    }
    const distance = Math.abs(mean + shift - centre);

    if (
      outside < bestOutside ||
      (outside === bestOutside && distance < bestDistance)
    ) {
      bestOutside = outside;
      bestDistance = distance;
      bestShift = shift;
    }
  }

  return bestShift;
}
