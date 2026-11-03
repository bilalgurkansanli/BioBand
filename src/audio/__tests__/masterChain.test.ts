import { EncodeCanceledError, processInSlices, SAMPLES_PER_SLICE } from '../cooperative';
import { buildSoftClipCurve, MASTER_HEADROOM, shapeSample, softClipInPlace } from '../masterChain';

describe('shapeSample', () => {
  const curve = buildSoftClipCurve();

  it('follows tanh(3x) inside [-1, 1]', () => {
    for (const x of [-0.9, -0.4, -0.05, 0, 0.05, 0.4, 0.9]) {
      expect(shapeSample(curve, x)).toBeCloseTo(Math.tanh(3 * x), 4);
    }
  });

  it('never exceeds the curve ends, however hot the input', () => {
    expect(shapeSample(curve, 5)).toBeCloseTo(Math.tanh(3), 6);
    expect(shapeSample(curve, -5)).toBeCloseTo(-Math.tanh(3), 6);
    expect(Math.abs(shapeSample(curve, 1.2))).toBeLessThan(1);
  });

  it('turns NaN into a finite sample', () => {
    expect(Number.isFinite(shapeSample(curve, Number.NaN))).toBe(true);
  });

  it('gives quiet material the same small-signal gain as the live chain', () => {
    // A quiet note: headroom 0.55, then tanh(3x) ≈ 3x near zero → ×1.65.
    const raw = 0.01;
    expect(shapeSample(curve, raw * MASTER_HEADROOM)).toBeCloseTo(raw * MASTER_HEADROOM * 3, 3);
  });
});

describe('softClipInPlace', () => {
  it('bounds a summed overload below full scale', async () => {
    const channel = new Float32Array([0, 0.5, 1.4, -2.2, 0.1]);
    await softClipInPlace([channel]);
    for (const sample of channel) {
      expect(Math.abs(sample)).toBeLessThan(1);
    }
    expect(channel[0]).toBeCloseTo(0, 6);
  });
});

describe('processInSlices', () => {
  it('covers every index exactly once, in order', async () => {
    const length = SAMPLES_PER_SLICE * 2 + 17;
    const seen: [number, number][] = [];
    await processInSlices(length, (start, end) => {
      seen.push([start, end]);
    });
    expect(seen[0][0]).toBe(0);
    expect(seen[seen.length - 1][1]).toBe(length);
    for (let i = 1; i < seen.length; i++) {
      expect(seen[i][0]).toBe(seen[i - 1][1]);
    }
  });

  it('stops with EncodeCanceledError when asked to', async () => {
    let slices = 0;
    await expect(
      processInSlices(
        SAMPLES_PER_SLICE * 4,
        () => {
          slices += 1;
        },
        { shouldCancel: () => slices >= 2 },
      ),
    ).rejects.toBeInstanceOf(EncodeCanceledError);
    expect(slices).toBe(2);
  });
});
