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
import type { ChordId } from './guitarChords';
import { GUITAR_CHORDS, getChordStringNotes } from './guitarChords';
import {
  GUITAR_STRINGS,
  STRING_SAMPLE_FILES,
  fretToMidi,
  getStringPlaybackRate,
  midiToFret,
  type GuitarStringId,
} from './guitarSounds';
import { getGuitarVoice, type GuitarVoiceId } from './guitarVoices';

const STRUM_STAGGER_MS = 18;
const STRING_GAIN = 0.55;

type BiquadFilterNode = ReturnType<
  ReturnType<typeof getSharedAudioContext>['createBiquadFilter']
>;

const buffers = new Map<GuitarStringId, AudioBuffer>();
const strumTimers: ReturnType<typeof setTimeout>[] = [];
let initialized = false;
let currentVoiceId: GuitarVoiceId = 'nylon';

let voiceGain: GainNode | null = null;
let voiceFilter: BiquadFilterNode | null = null;

function applyVoiceToBus(): void {
  if (!voiceGain || !voiceFilter) {
    return;
  }
  const audio = getGuitarVoice(currentVoiceId).audio;
  voiceGain.gain.value = audio.gainScale;
  voiceFilter.type = audio.filterType;
  voiceFilter.frequency.value = audio.filterFrequency;
  voiceFilter.Q.value = audio.filterQ;
  if (audio.filterType === 'lowshelf') {
    voiceFilter.gain.value = 5;
  } else if (audio.filterType === 'peaking' && currentVoiceId === 'electric') {
    voiceFilter.gain.value = 4;
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

export async function initGuitarEngine(): Promise<void> {
  if (initialized) {
    return;
  }

  await prepareSamplePlayback();
  getPianoFxInput();
  ensureVoiceBus();

  await Promise.all(
    GUITAR_STRINGS.map(async (string) => {
      const buffer = await loadSample(STRING_SAMPLE_FILES[string.id]);
      buffers.set(string.id, buffer);
    }),
  );

  initialized = true;
}

export function setGuitarVoice(id: GuitarVoiceId): void {
  currentVoiceId = id;
  applyVoiceToBus();
}

export function getCurrentGuitarVoiceId(): GuitarVoiceId {
  return currentVoiceId;
}

function voiceTag(stringId: GuitarStringId): string {
  return `guitar:${stringId}`;
}

function triggerPluck(
  stringId: GuitarStringId,
  buffer: AudioBuffer,
  midi: number,
  gain: number,
  shortTail = false,
): void {
  const voiceRate = getGuitarVoice(currentVoiceId).audio.playbackRate;
  const rate = getStringPlaybackRate(stringId, midi) * voiceRate;
  const output = ensureVoiceBus();

  playSample(buffer, rate, gain, output, voiceTag(stringId), {
    shortTail,
    attackSeconds: shortTail ? 0.004 : 0.002,
    holdSeconds: shortTail ? 0.45 : 1.2,
    releaseSeconds: shortTail ? 0.35 : 0.8,
  });
}

/**
 * Pluck a string at a fret (0 = open). Optional midi override for chord voicings
 * that may exceed the visible fretboard range after clamp.
 */
export function pluckString(
  stringId: GuitarStringId,
  fretOrMidi?: number,
  options?: { asMidi?: boolean },
): void {
  const buffer = buffers.get(stringId);
  if (!buffer) {
    return;
  }

  const context = getSharedAudioContext();
  if (context.state === 'suspended') {
    void context.resume();
  }

  let midi: number;
  if (fretOrMidi === undefined) {
    midi = fretToMidi(stringId, 0);
  } else if (options?.asMidi) {
    midi = fretOrMidi;
  } else {
    midi = fretToMidi(stringId, fretOrMidi);
  }

  triggerPluck(stringId, buffer, midi, STRING_GAIN);

  schedulePianoReverbTaps((gainScale) => {
    triggerPluck(stringId, buffer, midi, STRING_GAIN * gainScale, true);
  });

  schedulePianoEchoRepeats((gainScale) => {
    triggerPluck(stringId, buffer, midi, STRING_GAIN * gainScale);
  });
}

export function strumChord(chordId: ChordId, direction: 'down' | 'up' = 'down'): void {
  const chord = GUITAR_CHORDS.find((c) => c.id === chordId);
  if (!chord) {
    return;
  }

  let notes = getChordStringNotes(chord);
  if (direction === 'up') {
    notes = [...notes].reverse();
  }

  for (let i = 0; i < notes.length; i++) {
    const { stringId, midi } = notes[i];
    const timer = setTimeout(() => {
      pluckString(stringId, midi, { asMidi: true });
    }, i * STRUM_STAGGER_MS);
    strumTimers.push(timer);
  }
}

/** Play a recording / tutorial sound id (`s3:f5`, `chord:Em`, or legacy `s3`). */
export function playGuitarSoundId(soundId: string): void {
  if (soundId.startsWith('chord:')) {
    strumChord(soundId.slice('chord:'.length) as ChordId);
    return;
  }

  const fretted = soundId.match(/^(s[1-6]):f(\d{1,2})$/);
  if (fretted) {
    pluckString(fretted[1] as GuitarStringId, Number(fretted[2]));
    return;
  }

  if (/^s[1-6]$/.test(soundId)) {
    pluckString(soundId as GuitarStringId, 0);
  }
}

export function releaseGuitarEngine(): void {
  for (const timer of strumTimers) {
    clearTimeout(timer);
  }
  strumTimers.length = 0;
  stopAllVoices();
  voiceGain = null;
  voiceFilter = null;
  initialized = false;
}

export { midiToFret };
