import {
  createSamplePool,
  playFromPool,
  prepareSamplePlayback,
  releaseSamplePools,
  type SamplePool,
} from '../../audio/samplePool';
import { DRUM_SOUND_FILES, type DrumSoundId } from './drumsSounds';

const VOICES_PER_PAD = 6;

const pools = new Map<DrumSoundId, SamplePool>();
let initialized = false;

const SOUND_IDS = Object.keys(DRUM_SOUND_FILES) as DrumSoundId[];

export async function initDrumsEngine(): Promise<void> {
  if (initialized && pools.size === SOUND_IDS.length) {
    return;
  }

  releaseDrumsEngine();
  await prepareSamplePlayback();

  for (const id of SOUND_IDS) {
    pools.set(id, createSamplePool(DRUM_SOUND_FILES[id], VOICES_PER_PAD));
  }

  initialized = true;
}

export function playHit(id: DrumSoundId): void {
  const pool = pools.get(id);
  if (!pool) {
    return;
  }

  playFromPool(pool);
}

export function releaseDrumsEngine(): void {
  releaseSamplePools(pools.values());
  pools.clear();
  initialized = false;
}
