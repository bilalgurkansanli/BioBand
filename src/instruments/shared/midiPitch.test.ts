import { chooseOctaveShift, foldIntoRange } from './midiPitch';

/** The loop the fold replaced — the reference for every value it terminated on. */
function loopFold(n: number, min: number, max: number): number {
  let value = Math.round(n);
  while (value < min) {
    value += 12;
  }
  while (value > max) {
    value -= 12;
  }
  return value;
}

describe('foldIntoRange', () => {
  it('matches the old octave loop for every MIDI number and then some', () => {
    for (let n = -200; n <= 300; n++) {
      expect(foldIntoRange(n, 60, 83)).toBe(loopFold(n, 60, 83));
      // A compass that is not a whole number of octaves (guitar, violin).
      expect(foldIntoRange(n, 40, 76)).toBe(loopFold(n, 40, 76));
      expect(foldIntoRange(n, 55, 85)).toBe(loopFold(n, 55, 85));
    }
  });

  it('rounds fractional input the way the loop did', () => {
    expect(foldIntoRange(59.6, 60, 83)).toBe(60);
    expect(foldIntoRange(84.4, 60, 83)).toBe(72);
  });

  it('terminates on values where n - 12 === n', () => {
    const huge = 1.2e21;
    expect(huge - 12).toBe(huge);
    const folded = foldIntoRange(huge, 60, 83);
    expect(folded).not.toBeNull();
    expect(folded!).toBeGreaterThanOrEqual(60);
    expect(folded!).toBeLessThanOrEqual(83);
    const negative = foldIntoRange(-huge, 60, 83);
    expect(negative!).toBeGreaterThanOrEqual(60);
    expect(negative!).toBeLessThanOrEqual(83);
  });

  it('returns null for non-finite input', () => {
    expect(foldIntoRange(Number.NaN, 60, 83)).toBeNull();
    expect(foldIntoRange(Number.POSITIVE_INFINITY, 60, 83)).toBeNull();
    expect(foldIntoRange(Number.NEGATIVE_INFINITY, 60, 83)).toBeNull();
  });
});

describe('chooseOctaveShift', () => {
  it('moves a whole low tune up by octaves into range', () => {
    // C3 B3 D4 spans more than an octave: only +12 lands all of it on C4–B5.
    expect(chooseOctaveShift([48, 59, 62], 60, 83)).toBe(12);
  });

  it('leaves a tune that already fits alone', () => {
    expect(chooseOctaveShift([60, 64, 67, 72], 60, 83)).toBe(0);
  });

  it('ignores non-finite entries and handles an empty list', () => {
    expect(chooseOctaveShift([], 60, 83)).toBe(0);
    expect(chooseOctaveShift([Number.NaN, 48, 59, 62], 60, 83)).toBe(12);
  });
});
