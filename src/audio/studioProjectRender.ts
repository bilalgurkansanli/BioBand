import { renderRecordingPcm, UnrenderableRecordingError, type RenderedPcm } from './recordingRender';
import type { SavedRecording } from '../types/recording';
import {
  getProjectDurationMs,
  getProjectRate,
  getTrackStartMs,
  isTrackAudible,
  type StudioProject,
} from '../types/studio';

const TARGET_RATE = 44100;
const TAIL_SECONDS = 1;

export class EmptyProjectError extends Error {
  constructor(message = 'This project has no audible tracks to render.') {
    super(message);
    this.name = 'EmptyProjectError';
  }
}

/** Linear-resample one channel to a new length implied by `ratio` (out/in rate). */
function resampleLinear(input: Float32Array, ratio: number): Float32Array {
  if (ratio === 1) {
    return input;
  }
  const outLength = Math.max(1, Math.round(input.length * ratio));
  const out = new Float32Array(outLength);
  for (let i = 0; i < outLength; i += 1) {
    const pos = i / ratio;
    const i0 = Math.floor(pos);
    const frac = pos - i0;
    const a = input[i0] ?? 0;
    const b = input[i0 + 1] ?? a;
    out[i] = a + (b - a) * frac;
  }
  return out;
}

/** Normalize a track's rendered PCM to a stereo pair at TARGET_RATE. */
function toStereoAtTargetRate(pcm: RenderedPcm): [Float32Array, Float32Array] {
  const srcLeft = pcm.channels[0] ?? new Float32Array(0);
  const srcRight = pcm.channels[1] ?? srcLeft;
  const ratio = TARGET_RATE / pcm.sampleRate;
  return [resampleLinear(srcLeft, ratio), resampleLinear(srcRight, ratio)];
}

/** Peak-normalize the mix so summed tracks never clip (only attenuates). */
function limitInPlace(left: Float32Array, right: Float32Array): void {
  let peak = 0;
  for (let i = 0; i < left.length; i += 1) {
    peak = Math.max(peak, Math.abs(left[i]), Math.abs(right[i]));
  }
  if (peak <= 1) {
    return;
  }
  const scale = 1 / peak;
  for (let i = 0; i < left.length; i += 1) {
    left[i] *= scale;
    right[i] *= scale;
  }
}

/**
 * Bounces a whole Studio project into one stereo PCM mix: each audible track is
 * rendered on its own (dry-bounce for instrument tracks, decode for mic tracks),
 * resampled to a common rate, placed at its timeline offset (startMs) and summed
 * at its track volume. A final peak limiter keeps the sum from clipping.
 */
export async function renderProjectPcm(project: StudioProject): Promise<RenderedPcm> {
  const tracks = project.tracks.filter((track) => isTrackAudible(track, project.tracks));
  if (tracks.length === 0) {
    throw new EmptyProjectError();
  }

  // Tempo (BPM) scales the whole mix, matching live playback: instrument
  // tracks get their event times scaled (same pitch, faster performance),
  // mic tracks are resampled (tape-style).
  const rate = getProjectRate(project);
  const totalMs = getProjectDurationMs(project) / rate;
  const totalSamples = Math.ceil((totalMs / 1000 + TAIL_SECONDS) * TARGET_RATE);
  const left = new Float32Array(totalSamples);
  const right = new Float32Array(totalSamples);

  let mixedAny = false;
  for (const track of tracks) {
    const scaled =
      rate === 1 || track.mode !== 'instrument'
        ? track
        : {
            ...track,
            durationMs: track.durationMs / rate,
            events: track.events?.map((event) => ({ ...event, atMs: event.atMs / rate })),
          };

    let pcm: RenderedPcm;
    try {
      pcm = await renderRecordingPcm(scaled as unknown as SavedRecording);
    } catch (error) {
      if (error instanceof UnrenderableRecordingError) {
        continue;
      }
      throw error;
    }

    let [trackLeft, trackRight] = toStereoAtTargetRate(pcm);
    if (rate !== 1 && track.mode === 'microphone') {
      // Speed up/slow down the captured audio to follow the tempo.
      trackLeft = resampleLinear(trackLeft, 1 / rate);
      trackRight = resampleLinear(trackRight, 1 / rate);
    }
    const offset = Math.round((getTrackStartMs(track) / rate / 1000) * TARGET_RATE);
    const volume = track.volume;

    for (let i = 0; i < trackLeft.length; i += 1) {
      const j = offset + i;
      if (j >= totalSamples) {
        break;
      }
      left[j] += trackLeft[i] * volume;
      right[j] += trackRight[i] * volume;
    }
    mixedAny = true;
  }

  if (!mixedAny) {
    throw new EmptyProjectError();
  }

  limitInPlace(left, right);
  return { channels: [left, right], sampleRate: TARGET_RATE };
}
