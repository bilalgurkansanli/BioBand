import { captureOffsetMs, MAX_CAPTURE_OFFSET_MS } from '../overdubTiming';

describe('captureOffsetMs', () => {
  it('measures how long after the beds the capture started', () => {
    // Beds at 10.000 s; right after record() the clock reads 10.080 s and the
    // recorder has already captured 20 ms — so capture began at 10.060 s.
    expect(captureOffsetMs(10, 10.08, 0.02)).toBe(60);
  });

  it('falls back to "when record() returned" if the recorder reports nothing yet', () => {
    expect(captureOffsetMs(10, 10.05, 0)).toBe(50);
    expect(captureOffsetMs(10, 10.05, Number.NaN)).toBe(50);
  });

  it('never places a take before the beds', () => {
    expect(captureOffsetMs(10, 10.01, 0.5)).toBe(0);
  });

  it('distrusts implausible gaps', () => {
    expect(captureOffsetMs(10, 30, 0)).toBe(MAX_CAPTURE_OFFSET_MS);
    expect(captureOffsetMs(Number.NaN, 10, 0)).toBe(0);
  });
});
