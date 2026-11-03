// Offline renders have to run at the rate the samples were decoded at.
//
// `decodeAudioData` resamples every file to the live context's rate, and the
// library's buffer source then steps through a buffer one frame per output
// frame — it never looks at `buffer.sampleRate`. Rendering a 48 kHz buffer in
// a 44.1 kHz offline context therefore plays it 8.8 % slow and ~1.47
// semitones flat. So the export rate is taken from the live context, and any
// buffer that still disagrees with it gets its playback rate corrected.
//
// Pure on purpose: no native module, so the decision is unit-testable.

/** Used only when the live context reports something unusable. */
export const FALLBACK_RENDER_SAMPLE_RATE = 44100;

/** The range AudioContext itself accepts (react-native-audio-api validates it). */
const MIN_SAMPLE_RATE = 8000;
const MAX_SAMPLE_RATE = 96000;

/**
 * The sample rate an offline render (and the MP3 encode after it) must use:
 * the live context's own rate, which is the rate every decoded buffer is at.
 */
export function resolveRenderSampleRate(liveContextRate: number | undefined): number {
  if (
    typeof liveContextRate !== 'number' ||
    !Number.isFinite(liveContextRate) ||
    liveContextRate < MIN_SAMPLE_RATE ||
    liveContextRate > MAX_SAMPLE_RATE
  ) {
    return FALLBACK_RENDER_SAMPLE_RATE;
  }
  return Math.round(liveContextRate);
}

/**
 * Playback-rate multiplier that keeps a buffer at its own pitch when it is
 * played in a context running at `renderRate`. 1 whenever the two agree,
 * which is the normal case — this only guards against a buffer decoded
 * somewhere else.
 */
export function bufferRateCompensation(bufferRate: number, renderRate: number): number {
  if (
    !Number.isFinite(bufferRate) ||
    !Number.isFinite(renderRate) ||
    bufferRate <= 0 ||
    renderRate <= 0
  ) {
    return 1;
  }
  return bufferRate / renderRate;
}
