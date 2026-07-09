import type { AudioBuffer } from '../../audio/audioApi';

import {
  loadSample,
  playSample,
  prepareSamplePlayback,
  stopAllVoices,
} from '../../audio/sampleBank';
import { DRUM_SOUND_FILES, type DrumSoundId } from './drumsSounds';

const HIT_GAIN = 0.65;

const buffers = new Map<DrumSoundId, AudioBuffer>();
let initialized = false;

const SOUND_IDS = Object.keys(DRUM_SOUND_FILES) as DrumSoundId[];

export async function initDrumsEngine(): Promise<void> {
  if (initialized) {
    return;
  }

  await prepareSamplePlayback();

  await Promise.all(
    SOUND_IDS.map(async (id) => {
      const buffer = await loadSample(DRUM_SOUND_FILES[id]);
      buffers.set(id, buffer);
    }),
  );

  initialized = true;
}

export function playHit(id: DrumSoundId): void {
  const buffer = buffers.get(id);
  if (!buffer) {
    return;
  }

  playSample(buffer, 1, HIT_GAIN);
}

export function releaseDrumsEngine(): void {
  stopAllVoices();
  initialized = false;
}
