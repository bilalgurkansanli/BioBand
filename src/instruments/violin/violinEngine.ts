import {
  createSamplePool,
  playFromPool,
  prepareSamplePlayback,
  releaseSamplePools,
  type SamplePool,
} from '../../audio/samplePool';
import { getMidi } from './violinNotes';
import { getPhraseById, type PhraseId } from './violinPhrases';
import {
  getStringPlaybackRate,
  STRING_SAMPLE_FILES,
  VIOLIN_STRINGS,
  type ViolinStringId,
} from './violinSounds';

const PHRASE_STAGGER_MS = 30;
const VOICES_PER_STRING = 6;

const pools = new Map<ViolinStringId, SamplePool>();
const phraseTimers: ReturnType<typeof setTimeout>[] = [];
let initialized = false;

export async function initViolinEngine(): Promise<void> {
  if (initialized && pools.size === VIOLIN_STRINGS.length) {
    return;
  }

  releaseViolinEngine();
  await prepareSamplePlayback();

  for (const string of VIOLIN_STRINGS) {
    pools.set(string.id, createSamplePool(STRING_SAMPLE_FILES[string.id], VOICES_PER_STRING));
  }

  initialized = true;
}

export function playNote(stringId: ViolinStringId, position: number): void {
  const pool = pools.get(stringId);
  if (!pool) {
    return;
  }

  const midi = getMidi(stringId, position);
  playFromPool(pool, { playbackRate: getStringPlaybackRate(stringId, midi) });
}

export function playPhrase(phraseId: PhraseId): void {
  const phrase = getPhraseById(phraseId);
  if (!phrase) {
    return;
  }

  for (let i = 0; i < phrase.notes.length; i++) {
    const { stringId, position } = phrase.notes[i];
    const timer = setTimeout(() => {
      playNote(stringId, position);
    }, i * PHRASE_STAGGER_MS);
    phraseTimers.push(timer);
  }
}

export function releaseViolinEngine(): void {
  for (const timer of phraseTimers) {
    clearTimeout(timer);
  }
  phraseTimers.length = 0;

  releaseSamplePools(pools.values());
  pools.clear();
  initialized = false;
}
