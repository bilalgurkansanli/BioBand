import type { AudioBuffer } from '../../audio/audioApi';

import {
  loadSample,
  playSample,
  prepareSamplePlayback,
  stopAllVoices,
} from '../../audio/sampleBank';
import { getMidi } from './violinNotes';
import { getPhraseById, type PhraseId } from './violinPhrases';
import {
  getStringPlaybackRate,
  STRING_SAMPLE_FILES,
  VIOLIN_STRINGS,
  type ViolinStringId,
} from './violinSounds';

const PHRASE_STAGGER_MS = 30;
const NOTE_GAIN = 0.55;

const buffers = new Map<ViolinStringId, AudioBuffer>();
const phraseTimers: ReturnType<typeof setTimeout>[] = [];
let initialized = false;

export async function initViolinEngine(): Promise<void> {
  if (initialized) {
    return;
  }

  await prepareSamplePlayback();

  await Promise.all(
    VIOLIN_STRINGS.map(async (string) => {
      const buffer = await loadSample(STRING_SAMPLE_FILES[string.id]);
      buffers.set(string.id, buffer);
    }),
  );

  initialized = true;
}

export function playNote(stringId: ViolinStringId, position: number): void {
  const buffer = buffers.get(stringId);
  if (!buffer) {
    return;
  }

  const midi = getMidi(stringId, position);
  playSample(
    buffer,
    getStringPlaybackRate(stringId, midi),
    NOTE_GAIN,
    undefined,
    `violin:${stringId}:${position}`,
  );
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
  stopAllVoices();
  initialized = false;
}
