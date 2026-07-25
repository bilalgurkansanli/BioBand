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
  resetPianoFx,
  schedulePianoEchoRepeats,
  schedulePianoReverbTaps,
} from '../piano/pianoFx';
import { stopMetronome } from '../piano/pianoMetronome';
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
import {
  velocityGain,
  type NotePerformance,
} from '../shared/songPerformance';

/** Musical spacing for phrase presets (arco notes need room). */
const PHRASE_STAGGER_MS = 220;
/** User feedback: 0.48 was too loud next to the other instruments. */
const NOTE_GAIN = 0.36;
/** Bow lift at the end of a written note — long enough to stay legato. */
const VIOLIN_RELEASE_SECONDS = 0.28;

type BiquadFilterNode = ReturnType<
  ReturnType<typeof getSharedAudioContext>['createBiquadFilter']
>;

const buffers = new Map<ViolinSampleId, AudioBuffer>();
const phraseTimers = new Set<ReturnType<typeof setTimeout>>();
let initialized = false;
let currentVoiceId: ViolinVoiceId = 'classic';
/** Per-hit tag serial — same-tag voices steal each other in sampleBank. */
let hitSerial = 0;

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
  tag: string,
  options?: {
    shortTail?: boolean;
    gainScale?: number;
    startAtSeconds?: number;
    /** Written note length — the bow stroke is carved to match. */
    sustainSeconds?: number;
  },
): void {
  const voice = getViolinVoice(currentVoiceId);
  const midi = getMidi(stringId, position);
  const config = getViolinNoteSampleConfig(midi);
  const buffer = buffers.get(config.anchorId);
  if (!buffer) {
    return;
  }

  const rate = config.playbackRate * voice.audio.playbackRate;
  const gain = NOTE_GAIN * config.gainTrim * (options?.gainScale ?? 1);
  const shortTail = options?.shortTail ?? false;
  const output = ensureVoiceBus();

  // Every note used to be the same fixed stroke, so a whole note and a
  // sixteenth came out identical — on a sustaining instrument that flattens a
  // melody into a row of identical bow strokes. A written length carves the
  // stroke to size instead.
  //
  // The note is held for its FULL written length and the release runs on past
  // it into the next note. A bow does not stop between slurred notes, and
  // shortening each one to make room for its own release turned fast passages
  // into a row of disconnected blips. Notes that genuinely need separating —
  // a repeat of the same pitch — are already shortened in the chart itself.
  const sustain = options?.sustainSeconds;
  const holdSeconds = shortTail
    ? 0.1
    : sustain !== undefined
      ? Math.max(0.06, sustain)
      : (voice.audio.holdSeconds ?? 0.45);
  const releaseSeconds = shortTail
    ? 0.14
    : sustain !== undefined
      ? VIOLIN_RELEASE_SECONDS
      : (voice.audio.releaseSeconds ?? 0.4);

  playSample(buffer, rate, gain, output, tag, {
    shortTail,
    // Arco files are 14s+ — the envelope carves a bow stroke out of them,
    // entering at the anchor's developed-tone offset (the first seconds of
    // some recordings are a thin crescendo). The attack ramp hides the cut.
    offsetSeconds: config.offsetSeconds,
    attackSeconds: shortTail ? undefined : 0.02,
    holdSeconds,
    releaseSeconds,
    startAtSeconds: options?.startAtSeconds,
  });
}

/**
 * @param gainScale Extra output multiplier — used by Studio mix playback.
 * @param performance Song playback supplies the moment, length and strength.
 */
export function playNote(
  stringId: ViolinStringId,
  position: number,
  gainScale = 1,
  performance?: NotePerformance,
): void {
  const context = getSharedAudioContext();
  if (context.state === 'suspended') {
    void context.resume();
  }

  hitSerial += 1;
  const dryTag = `violin:${stringId}:${position}#${hitSerial}`;

  const atTime = performance?.atTime;
  const aheadOfClock = atTime !== undefined;
  const sustainSeconds = performance?.sustainSeconds;
  const dynamics = gainScale * velocityGain(performance?.velocity);
  const tapStart = (delayMs: number): number | undefined =>
    atTime === undefined ? undefined : atTime + delayMs / 1000;

  triggerNote(stringId, position, dryTag, {
    gainScale: dynamics,
    startAtSeconds: atTime,
    sustainSeconds,
  });

  schedulePianoReverbTaps((tapScale, tapIndex, delayMs) => {
    triggerNote(stringId, position, `${dryTag}:reverb:${tapIndex}`, {
      shortTail: true,
      gainScale: dynamics * tapScale,
      startAtSeconds: tapStart(delayMs),
    });
  }, aheadOfClock);

  // Each repeat needs its own tag — same-tag voices steal each other.
  let echoIndex = 0;
  schedulePianoEchoRepeats((tapScale, delayMs) => {
    triggerNote(stringId, position, `${dryTag}:echo:${echoIndex++}`, {
      gainScale: dynamics * tapScale,
      startAtSeconds: tapStart(delayMs),
      sustainSeconds,
    });
  }, aheadOfClock);
}

export function playPhrase(phraseId: PhraseId, gainScale = 1): void {
  const phrase = getPhraseById(phraseId);
  if (!phrase) {
    return;
  }

  for (let i = 0; i < phrase.notes.length; i++) {
    const { stringId, position } = phrase.notes[i];
    const timer = setTimeout(() => {
      phraseTimers.delete(timer);
      playNote(stringId, position, gainScale);
    }, i * PHRASE_STAGGER_MS);
    phraseTimers.add(timer);
  }
}

/** Cancel scheduled phrase notes — a playback stop must silence the rest. */
export function stopViolinPhrases(): void {
  for (const timer of phraseTimers) {
    clearTimeout(timer);
  }
  phraseTimers.clear();
}

export function playViolinSoundId(
  soundId: string,
  gainScale = 1,
  performance?: NotePerformance,
): void {
  const parsed = parseViolinSoundId(soundId);
  if (!parsed) {
    if (soundId.startsWith('phrase:')) {
      const phraseId = soundId.slice('phrase:'.length);
      if (isPhraseId(phraseId)) {
        playPhrase(phraseId, gainScale);
      }
    }
    return;
  }

  if (parsed.kind === 'phrase') {
    playPhrase(parsed.phraseId, gainScale);
    return;
  }

  playNote(parsed.stringId, parsed.position, gainScale, performance);
}

export function releaseViolinEngine(): void {
  stopMetronome();
  stopViolinPhrases();
  stopAllVoices();
  // Cancels pending echo/reverb re-triggers — without this, taps keep
  // sounding after leaving the screen (buffers stay decoded).
  resetPianoFx();
  initialized = false;
}
