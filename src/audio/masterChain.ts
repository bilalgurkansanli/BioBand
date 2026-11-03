import { processInSlices, type CooperativeOptions } from './cooperative';

// The live master chain, shared by the live graph (sampleBank.ts) and the
// offline export so the two cannot drift apart:
//
//   voices ─→ headroom gain (0.55) ─→ tanh soft-clipper ─→ output volume ─→ out
//
// When overlapping notes sum past the ceiling, the shaper rounds the peaks off
// instead of letting the DAC hard-clip them into digital crackle. An export
// that skipped it came out quieter than what the player heard, and anything
// louder clipped instead of saturating.

/** Fixed headroom ahead of the soft-clipper. */
export const MASTER_HEADROOM = 0.55;

const SOFT_CLIP_RESOLUTION = 4096;

/**
 * IMPORTANT: Web Audio WaveShaper maps input [-1, 1] to curve values. Any
 * signal above 1.0 hard-clips to the last curve sample. Using tanh(3x)
 * instead of tanh(x) means the curve is nearly flat (saturated) well before
 * ±1 — so the transition at the boundary is imperceptible even if the
 * signal slightly exceeds the range.
 */
export function buildSoftClipCurve(): Float32Array {
  const curve = new Float32Array(SOFT_CLIP_RESOLUTION);
  for (let i = 0; i < SOFT_CLIP_RESOLUTION; i++) {
    const x = (i / (SOFT_CLIP_RESOLUTION - 1)) * 2 - 1;
    // tanh(3x) saturates at ≈ ±0.995 by x = ±1, leaving almost no
    // amplitude step at the [-1, 1] boundary → no audible hard clip.
    curve[i] = Math.tanh(3 * x);
  }
  return curve;
}

/**
 * One sample through a WaveShaper curve, exactly as the Web Audio spec (and
 * react-native-audio-api's WaveShaper::processNone) computes it: linear
 * interpolation between curve points, clamped to the end values outside
 * [-1, 1].
 */
export function shapeSample(curve: Float32Array, input: number): number {
  const last = curve.length - 1;
  const v = last * 0.5 * (input + 1);
  if (!(v > 0)) {
    // Also catches NaN, which must not leak into the encoder.
    return curve[0];
  }
  if (v >= last) {
    return curve[last];
  }
  const k = Math.floor(v);
  const f = v - k;
  return (1 - f) * curve[k] + f * curve[k + 1];
}

/**
 * Applies the soft-clipper to rendered PCM in place — the offline half of the
 * master chain. The headroom gain is applied inside the render graph (so the
 * renderer's own overload guard never trips first); this is the shaper that
 * follows it. Sliced so a long take does not freeze the UI.
 */
export async function softClipInPlace(
  channels: Float32Array[],
  options?: CooperativeOptions,
): Promise<void> {
  const curve = buildSoftClipCurve();
  for (const channel of channels) {
    await processInSlices(
      channel.length,
      (start, end) => {
        for (let i = start; i < end; i++) {
          channel[i] = shapeSample(curve, channel[i]);
        }
      },
      options,
    );
  }
}
