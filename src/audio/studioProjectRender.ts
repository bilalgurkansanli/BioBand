import { checkpoint, processInSlices, type CooperativeOptions } from './cooperative';
import { renderRecordingPcm, UnrenderableRecordingError, type RenderedPcm } from './recordingRender';
import { resolveRenderSampleRate } from './renderSampleRate';
import { getSharedAudioContext } from './sampleBank';
import { renderTimeStretchedFile } from './timeStretch';
import type { SavedRecording } from '../types/recording';
import {
  getProjectDurationMs,
  getProjectRate,
  getTrackStartMs,
  isTrackAudible,
  type StudioProject,
  type StudioTrack,
} from '../types/studio';

const TAIL_SECONDS = 1;

// Every loop over a whole track or the whole mix below is sliced and yields
// to the event loop (see cooperative.ts): they run on the UI thread, and a few
// minutes of stereo audio is millions of samples. Done in one go the app froze
// with no way out; sliced, the progress UI keeps drawing and Cancel works.

export class EmptyProjectError extends Error {
  constructor(message = 'This project has no audible tracks to render.') {
    super(message);
    this.name = 'EmptyProjectError';
  }
}

/** Linear-resample one channel to a new length implied by `ratio` (out/in rate). */
async function resampleLinear(
  input: Float32Array,
  ratio: number,
  options: CooperativeOptions,
): Promise<Float32Array> {
  if (ratio === 1) {
    return input;
  }
  const outLength = Math.max(1, Math.round(input.length * ratio));
  const out = new Float32Array(outLength);
  await processInSlices(
    outLength,
    (start, end) => {
      for (let i = start; i < end; i += 1) {
        const pos = i / ratio;
        const i0 = Math.floor(pos);
        const frac = pos - i0;
        const a = input[i0] ?? 0;
        const b = input[i0 + 1] ?? a;
        out[i] = a + (b - a) * frac;
      }
    },
    options,
  );
  return out;
}

/** Normalize a track's rendered PCM to a stereo pair at the mix rate. */
async function toStereoAtRate(
  pcm: RenderedPcm,
  targetRate: number,
  options: CooperativeOptions,
): Promise<[Float32Array, Float32Array]> {
  const srcLeft = pcm.channels[0] ?? new Float32Array(0);
  const srcRight = pcm.channels[1] ?? srcLeft;
  const ratio = targetRate / pcm.sampleRate;
  const left = await resampleLinear(srcLeft, ratio, options);
  const right = srcRight === srcLeft ? left : await resampleLinear(srcRight, ratio, options);
  return [left, right];
}

/** Peak-normalize the mix so summed tracks never clip (only attenuates). */
async function limitInPlace(
  left: Float32Array,
  right: Float32Array,
  options: CooperativeOptions,
): Promise<void> {
  let peak = 0;
  await processInSlices(
    left.length,
    (start, end) => {
      for (let i = start; i < end; i += 1) {
        peak = Math.max(peak, Math.abs(left[i]), Math.abs(right[i]));
      }
    },
    options,
  );
  if (peak <= 1) {
    return;
  }
  const scale = 1 / peak;
  await processInSlices(
    left.length,
    (start, end) => {
      for (let i = start; i < end; i += 1) {
        left[i] *= scale;
        right[i] *= scale;
      }
    },
    options,
  );
}

/**
 * A mic track's audio, following the project tempo the way live playback
 * does: faster or slower at the same pitch. Falls back to the take's own
 * speed when the stretch cannot run — it then stays in tune and starts on
 * its beat, but no longer follows the tempo. (The old export resampled it
 * instead, which followed the tempo by shifting the pitch.)
 */
async function renderMicTrack(track: StudioTrack, rate: number): Promise<RenderedPcm> {
  if (rate !== 1 && track.audioUri) {
    const stretched = await renderTimeStretchedFile(track.audioUri, rate);
    if (stretched) {
      return stretched;
    }
  }
  return renderRecordingPcm(track as unknown as SavedRecording);
}

/**
 * Bounces a whole Studio project into one stereo PCM mix: each audible track is
 * rendered on its own (dry-bounce for instrument tracks, decode for mic tracks),
 * resampled to a common rate if needed, placed at its timeline offset
 * (startMs) and summed at its track volume. A final peak limiter keeps the sum
 * from clipping.
 *
 * `shouldCancel` is polled between slices; returning true aborts with
 * EncodeCanceledError, the same signal the encoder uses.
 */
export async function renderProjectPcm(
  project: StudioProject,
  options: CooperativeOptions = {},
): Promise<RenderedPcm> {
  const tracks = project.tracks.filter((track) => isTrackAudible(track, project.tracks));
  if (tracks.length === 0) {
    throw new EmptyProjectError();
  }

  // Tempo (BPM) scales the whole mix, matching live playback: instrument
  // tracks get their event times scaled and mic tracks are time-stretched —
  // faster or slower, same pitch either way.
  const rate = getProjectRate(project);
  // The live context's rate: instrument tracks render at it and mic tracks
  // decode at it, so nothing needs resampling and nothing changes pitch.
  const targetRate = resolveRenderSampleRate(getSharedAudioContext().sampleRate);
  const totalMs = getProjectDurationMs(project) / rate;
  const totalSamples = Math.ceil((totalMs / 1000 + TAIL_SECONDS) * targetRate);
  const left = new Float32Array(totalSamples);
  const right = new Float32Array(totalSamples);

  let mixedAny = false;
  for (const track of tracks) {
    await checkpoint(options);

    let pcm: RenderedPcm;
    try {
      if (track.mode === 'microphone') {
        pcm = await renderMicTrack(track, rate);
      } else {
        const scaled =
          rate === 1
            ? track
            : {
                ...track,
                durationMs: track.durationMs / rate,
                events: track.events?.map((event) => ({ ...event, atMs: event.atMs / rate })),
              };
        pcm = await renderRecordingPcm(scaled as unknown as SavedRecording, {
          // Live playback applies an instrument track's fader to every note,
          // ahead of the master clipper — the render does the same.
          gainScale: track.volume,
          tempoRate: rate,
          shouldCancel: options.shouldCancel,
        });
      }
    } catch (error) {
      if (error instanceof UnrenderableRecordingError) {
        continue;
      }
      throw error;
    }

    const [trackLeft, trackRight] = await toStereoAtRate(pcm, targetRate, options);
    const offset = Math.round((getTrackStartMs(track) / rate / 1000) * targetRate);
    // Instrument tracks already carry their fader (see above); a mic track is
    // a file player, which live playback simply sets to the track's volume.
    const volume = track.mode === 'instrument' ? 1 : track.volume;
    const length = Math.max(0, Math.min(trackLeft.length, totalSamples - offset));

    await processInSlices(
      length,
      (start, end) => {
        for (let i = start; i < end; i += 1) {
          left[offset + i] += trackLeft[i] * volume;
          right[offset + i] += trackRight[i] * volume;
        }
      },
      options,
    );
    mixedAny = true;
  }

  if (!mixedAny) {
    throw new EmptyProjectError();
  }

  await limitInPlace(left, right, options);
  return { channels: [left, right], sampleRate: targetRate };
}
