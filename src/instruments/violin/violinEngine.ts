import type { AudioBuffer, GainNode } from '../../audio/audioApi';

import {
  getSharedAudioContext,
  loadSample,
  playSample,
  prepareSamplePlayback,
  stopAllVoices,
} from '../../audio/sampleBank';
import {
  getPianoFxInput,
  schedulePianoEchoRepeats,
  schedulePianoReverbTaps,
} from '../piano/pianoFx';
import { getMidi } from './violinNotes';
import { getPhraseById, isPhraseId, type PhraseId } from './violinPhrases';
import {
  getViolinNoteSampleConfig,
  VIOLIN_SAMPLE_FILES,
  type ViolinSampleId,
} from './violinSamples';
import {
  parseViolinSoundId,
  type ViolinStringId,
} from './violinSounds';
import { getViolinVoice, type ViolinVoiceId } from './violinVoices';

/** Musical spacing for phrase presets (arco notes need room). */
const PHRASE_STAGGER_MS = 220;
const NOTE_GAIN = 0.48;

type BiquadFilterNode = ReturnType<
  ReturnType<typeof getSharedAudioContext>['createBiquadFilter']
>;

const buffers = new Map<ViolinSampleId, AudioBuffer>();
const phraseTimers: ReturnType<typeof setTimeout>[] = [];
let initialized = false;
let currentVoiceId: ViolinVoiceId = 'classic';

let voiceGain: GainNode | null = null;
let voiceFilter: BiquadFilterNode | null = null;

function applyVoiceToBus(): void {
  if (!voiceGain || !voiceFilter) {
    return;
  }
  const audio = getViolinVoice(currentVoiceId).audio;
  voiceGain.gain.value = audio.gainScale;
  voiceFilter.type = audio.filterType;
  voiceFilter.frequency.value = audio.filterFrequency;
  voiceFilter.Q.value = audio.filterQ;
  if (audio.filterType === 'lowshelf') {
    voiceFilter.gain.value = audio.filterGainDb ?? 3;
  } else if (audio.filterType === 'peaking') {
    voiceFilter.gain.value = audio.filterGainDb ?? 0;
  } else {
    voiceFilter.gain.value = 0;
  }
}

function ensureVoiceBus(): GainNode {
  if (voiceGain && voiceFilter) {
    return voiceGain;
  }
  const context = getSharedAudioContext();
  voiceGain = context.createGain();
  voiceFilter = context.createBiquadFilter();
  voiceGain.connect(voiceFilter);
  voiceFilter.connect(getPianoFxInput());
  applyVoiceToBus();
  return voiceGain;
}

export async function initViolinEngine(): Promise<void> {
  if (initialized) {
    return;
  }

  await prepareSamplePlayback();
  ensureVoiceBus();

  const ids = Object.keys(VIOLIN_SAMPLE_FILES) as ViolinSampleId[];
  await Promise.all(
    ids.map(async (id) => {
      const buffer = await loadSample(VIOLIN_SAMPLE_FILES[id]);
      buffers.set(id, buffer);
    }),
  );

  initialized = true;
}

export function setViolinVoice(id: ViolinVoiceId): void {
  currentVoiceId = id;
  applyVoiceToBus();
}

export function getCurrentViolinVoiceId(): ViolinVoiceId {
  return currentVoiceId;
}

function triggerNote(
  stringId: ViolinStringId,
  position: number,
  options?: { shortTail?: boolean; gainScale?: number; tagSuffix?: string },
): void {
  const voice = getViolinVoice(currentVoiceId);
  const midi = getMidi(stringId, position);
  const config = getViolinNoteSampleConfig(midi);
  const buffer = buffers.get(config.anchorId);
  if (!buffer) {
    return;
  }

  const rate = config.playbackRate * voice.audio.playbackRate;
  const gain = NOTE_GAIN * (options?.gainScale ?? 1);
  const shortTail = options?.shortTail ?? false;
  const tag = `violin:${stringId}:${position}${options?.tagSuffix ?? ''}`;
  const output = ensureVoiceBus();

  playSample(buffer, rate, gain, output, tag, {
    shortTail,
    // Arco files are 14s+; keep a snappy détaché so taps clear quickly.
    holdSeconds: shortTail ? 0.1 : (voice.audio.holdSeconds ?? 0.22),
    releaseSeconds: shortTail ? 0.14 : (voice.audio.releaseSeconds ?? 0.32),
  });
}

export function playNote(stringId: ViolinStringId, position: number): void {
  const context = getSharedAudioContext();
  if (context.state === 'suspended') {
    void context.resume();
  }

  triggerNote(stringId, position);

  schedulePianoReverbTaps((gainScale, tapIndex) => {
    triggerNote(stringId, position, {
      shortTail: true,
      gainScale,
      tagSuffix: `:reverb:${tapIndex}`,
    });
  });

  schedulePianoEchoRepeats((gainScale) => {
    triggerNote(stringId, position, {
      gainScale,
      tagSuffix: ':echo',
    });
  });
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

export function playViolinSoundId(soundId: string): void {
  const parsed = parseViolinSoundId(soundId);
  if (!parsed) {
    if (soundId.startsWith('phrase:')) {
      const phraseId = soundId.slice('phrase:'.length);
      if (isPhraseId(phraseId)) {
        playPhrase(phraseId);
      }
    }
    return;
  }

  if (parsed.kind === 'phrase') {
    playPhrase(parsed.phraseId);
    return;
  }

  playNote(parsed.stringId, parsed.position);
}

export function releaseViolinEngine(): void {
  for (const timer of phraseTimers) {
    clearTimeout(timer);
  }
  phraseTimers.length = 0;
  stopAllVoices();
  initialized = false;
}
