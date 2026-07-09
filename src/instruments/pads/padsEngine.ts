import type { AudioBuffer } from '../../audio/audioApi';

import {
  loadSample,
  playSample,
  prepareSamplePlayback,
  stopAllVoices,
} from '../../audio/sampleBank';
import { PAD_SOUND_FILES, type PadSoundId } from './padsSounds';

const PAD_GAIN = 0.65;

const buffers = new Map<PadSoundId, AudioBuffer>();
let initialized = false;

const SOUND_IDS = Object.keys(PAD_SOUND_FILES) as PadSoundId[];

export async function initPadsEngine(): Promise<void> {
  if (initialized) {
    return;
  }

  await prepareSamplePlayback();

  await Promise.all(
    SOUND_IDS.map(async (id) => {
      const buffer = await loadSample(PAD_SOUND_FILES[id]);
      buffers.set(id, buffer);
    }),
  );

  initialized = true;
}

export function triggerPad(id: PadSoundId): void {
  const buffer = buffers.get(id);
  if (!buffer) {
    return;
  }

  playSample(buffer, 1, PAD_GAIN);
}

export function releasePadsEngine(): void {
  stopAllVoices();
  initialized = false;
}
