import {
  bufferRateCompensation,
  FALLBACK_RENDER_SAMPLE_RATE,
  resolveRenderSampleRate,
} from '../renderSampleRate';

describe('resolveRenderSampleRate', () => {
  it('renders at the live context rate, not a fixed 44.1 kHz', () => {
    expect(resolveRenderSampleRate(48000)).toBe(48000);
    expect(resolveRenderSampleRate(44100)).toBe(44100);
    expect(resolveRenderSampleRate(24000)).toBe(24000);
  });

  it('falls back only when the live rate is unusable', () => {
    expect(resolveRenderSampleRate(undefined)).toBe(FALLBACK_RENDER_SAMPLE_RATE);
    expect(resolveRenderSampleRate(Number.NaN)).toBe(FALLBACK_RENDER_SAMPLE_RATE);
    expect(resolveRenderSampleRate(0)).toBe(FALLBACK_RENDER_SAMPLE_RATE);
    expect(resolveRenderSampleRate(192000)).toBe(FALLBACK_RENDER_SAMPLE_RATE);
  });
});

describe('bufferRateCompensation', () => {
  it('leaves a buffer at the render rate untouched', () => {
    expect(bufferRateCompensation(48000, 48000)).toBe(1);
  });

  it('corrects a 48 kHz buffer rendered at 44.1 kHz back to its own pitch', () => {
    const ratio = bufferRateCompensation(48000, 44100);
    // Without it the buffer plays 8.8 % slow, ~1.47 semitones flat.
    const semitones = 12 * Math.log2(ratio);
    expect(semitones).toBeCloseTo(1.469, 2);
  });

  it('ignores nonsense rates instead of producing NaN pitch', () => {
    expect(bufferRateCompensation(0, 48000)).toBe(1);
    expect(bufferRateCompensation(48000, Number.NaN)).toBe(1);
  });
});
