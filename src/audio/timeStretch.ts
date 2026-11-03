import { OfflineAudioContext } from './audioApi';
import type { RenderedPcm } from './recordingRender';
import { getSharedAudioContext } from './sampleBank';

// Studio tempo changes speed without changing pitch. Live, a mic track gets
// that from expo-audio's pitch-corrected playback rate; the export used to
// resample the file instead — tape-style — so at any tempo but 120 BPM the
// exported vocal came out higher or lower than the one heard in the Studio.
//
// react-native-audio-api's buffer source has a WSOLA time-stretcher
// (`pitchCorrection: true`) that also runs in an OfflineAudioContext, so the
// export can stretch the same way. It is a different algorithm from the live
// player's, so the grain of the two can differ slightly; timing and pitch
// match.

/** Below this peak the input counts as silence and needs no checking. */
const AUDIBLE_PEAK = 0.001;
/**
 * A stretched result this much quieter than its input means the stretcher
 * did not run (it renders silence when it cannot initialise), not that the
 * audio got quiet — time-stretching preserves level.
 */
const MIN_OUTPUT_TO_INPUT_PEAK = 0.05;
/** Only every Nth sample is inspected for that check — it is a sanity test. */
const PEAK_STRIDE = 64;
/**
 * Headroom for the stretcher's latency (the library estimates ~20 ms in plus
 * ~10 ms out, scaled by the rate) — anything above this is not trusted.
 */
const MAX_LATENCY_SECONDS = 0.25;

function roughPeak(channels: readonly Float32Array[]): number {
  let peak = 0;
  for (const channel of channels) {
    for (let i = 0; i < channel.length; i += PEAK_STRIDE) {
      const value = Math.abs(channel[i]);
      if (value > peak) {
        peak = value;
      }
    }
  }
  return peak;
}

/**
 * Decodes the file at `audioUri` and renders it `rate` times faster (2 =
 * twice as fast) at its original pitch. Resolves to `null` when the stretch
 * cannot be done, so the caller can fall back rather than export silence.
 */
export async function renderTimeStretchedFile(
  audioUri: string,
  rate: number,
): Promise<RenderedPcm | null> {
  try {
    const buffer = await getSharedAudioContext().decodeAudioData(audioUri);
    const sampleRate = buffer.sampleRate;
    const numberOfChannels = Math.max(1, Math.min(2, buffer.numberOfChannels));

    const stretchedFrames = Math.ceil(buffer.length / rate);
    const context = new OfflineAudioContext(
      numberOfChannels,
      stretchedFrames + Math.ceil(MAX_LATENCY_SECONDS * sampleRate),
      sampleRate,
    );
    const source = context.createBufferSource({ pitchCorrection: true });
    source.buffer = buffer;
    source.playbackRate.value = rate;
    source.connect(context.destination);
    source.start(0);

    // The stretcher's own estimate of how far its output runs behind its
    // input (known once the buffer is set). The render has room for it, and
    // it is trimmed off the front, so the vocal stays on the beat.
    const latencySeconds = Math.min(
      MAX_LATENCY_SECONDS,
      Math.max(0, source.getLatency()),
    );
    const latencyFrames = Math.round(latencySeconds * sampleRate);

    const rendered = await context.startRendering();
    const channels: Float32Array[] = [];
    for (let ch = 0; ch < rendered.numberOfChannels; ch++) {
      const data = rendered.getChannelData(ch);
      channels.push(data.subarray(latencyFrames, latencyFrames + stretchedFrames));
    }

    const original: Float32Array[] = [];
    for (let ch = 0; ch < numberOfChannels; ch++) {
      original.push(buffer.getChannelData(ch));
    }
    const inputPeak = roughPeak(original);
    if (inputPeak > AUDIBLE_PEAK && roughPeak(channels) < inputPeak * MIN_OUTPUT_TO_INPUT_PEAK) {
      console.warn('Export: time-stretch produced silence, keeping the original speed');
      return null;
    }
    return { channels, sampleRate };
  } catch (error) {
    console.warn('Export: time-stretch unavailable, keeping the original speed', error);
    return null;
  }
}
