import {
  createSamplePool,
  playFromPool,
  prepareSamplePlayback,
  releaseSamplePools,
  type SamplePool,
} from '../../audio/samplePool';
import { PAD_SOUND_FILES, type PadSoundId } from './padsSounds';

const VOICES_PER_PAD = 6;

const pools = new Map<PadSoundId, SamplePool>();
let initialized = false;

const SOUND_IDS = Object.keys(PAD_SOUND_FILES) as PadSoundId[];

export async function initPadsEngine(): Promise<void> {
  if (initialized && pools.size === SOUND_IDS.length) {
    return;
  }

  releasePadsEngine();
  await prepareSamplePlayback();

  for (const id of SOUND_IDS) {
    pools.set(id, createSamplePool(PAD_SOUND_FILES[id], VOICES_PER_PAD));
  }

  initialized = true;
}

export function triggerPad(id: PadSoundId): void {
  const pool = pools.get(id);
  if (!pool) {
    return;
  }

  playFromPool(pool);
}

export function releasePadsEngine(): void {
  releaseSamplePools(pools.values());
  pools.clear();
  initialized = false;
}
