import type { AudioBuffer, GainNode } from '../../audio/audioApi';

import {
  getSharedAudioContext,
  loadSample,
  playSample,
  prepareSamplePlayback,
  resumeAudioContextIfSuspended,
  stopVoicesByTagPrefix,
} from '../../audio/sampleBank';
import {
  clearPianoFxTimersFor,
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
/** Names this engine's pending echo/reverb re-triggers in the shared FX bus. */
const VIOLIN_OWNER = 'violin';

type BiquadFilterNode = ReturnType<
  ReturnType<typeof getSharedAudioContext>['createBiquadFilter']
>;

const buffers = new Map<ViolinSampleId, AudioBuffer>();
const phraseTimers = new Set<ReturnType<typeof setTimeout>>();
let initialized = false;
let initPromise: Promise<void> | null = null;
let currentVoiceId: ViolinVoiceId = 'classic';
/** Per-hit tag serial — same-tag voices steal each other in sampleBank. */
let hitSerial = 0;

/**
 * One bus per voice (gain → tone filter → FX input), built the first time
 * that voice plays. A single shared bus could only wear one voice's tone at a
 * time, so a Studio mix had to put every violin track on the first track's
 * voice — and an overdub's beds re-voiced the violin under the user's bow.
 */
type VoiceBus = { gain: GainNode; filter: BiquadFilterNode };
const voiceBuses = new Map<ViolinVoiceId, VoiceBus>();

function applyVoiceToBus(bus: VoiceBus, voiceId: ViolinVoiceId): void {
  const audio = getViolinVoice(voiceId).audio;
  bus.gain.gain.value = audio.gainScale;
  bus.filter.type = audio.filterType;
  bus.filter.frequency.value = audio.filterFrequency;
  bus.filter.Q.value = audio.filterQ;
  if (audio.filterType === 'lowshelf') {
    bus.filter.gain.value = audio.filterGainDb ?? 3;
  } else if (audio.filterType === 'peaking') {
    bus.filter.gain.value = audio.filterGainDb ?? 0;
  } else {
    bus.filter.gain.value = 0;
  }
}

function ensureVoiceBus(voiceId: ViolinVoiceId = currentVoiceId): GainNode {
  const existing = voiceBuses.get(voiceId);
  if (existing) {
    return existing.gain;
  }
  const context = getSharedAudioContext();
  const bus: VoiceBus = { gain: context.createGain(), filter: context.createBiquadFilter() };
  bus.gain.connect(bus.filter);
  bus.filter.connect(getPianoFxInput());
  applyVoiceToBus(bus, voiceId);
  voiceBuses.set(voiceId, bus);
  return bus.gain;
}

export async function initViolinEngine(): Promise<void> {
  if (initialized) {
    return;
  }
  // `initialized` only flips after the decode, so callers arriving during it
  // would each run the whole load — share the one in flight instead.
  if (!initPromise) {
    initPromise = loadViolinEngine().finally(() => {
      initPromise = null;
    });
  }
  await initPromise;
}

async function loadViolinEngine(): Promise<void> {
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

/** The voice hand-played notes use. Every voice keeps its own bus, so nothing to re-tune. */
export function setViolinVoice(id: ViolinVoiceId): void {
  currentVoiceId = id;
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
    /** Voice to sound with; defaults to the one selected for hand playing. */
    voiceId?: ViolinVoiceId;
  },
): void {
  const voiceId = options?.voiceId ?? currentVoiceId;
  const voice = getViolinVoice(voiceId);
  const midi = getMidi(stringId, position);
  const config = getViolinNoteSampleConfig(midi);
  const buffer = buffers.get(config.anchorId);
  if (!buffer) {
    return;
  }

  const rate = config.playbackRate * voice.audio.playbackRate;
  const gain = NOTE_GAIN * config.gainTrim * (options?.gainScale ?? 1);
  const shortTail = options?.shortTail ?? false;
  const output = ensureVoiceBus(voiceId);

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
 * @param voiceId A take or Studio track replays on its own voice; defaults to
 * the one selected for hand playing.
 */
export function playNote(
  stringId: ViolinStringId,
  position: number,
  gainScale = 1,
  performance?: NotePerformance,
  voiceId: ViolinVoiceId = currentVoiceId,
): void {
  resumeAudioContextIfSuspended();

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
    voiceId,
  });

  schedulePianoReverbTaps((tapScale, tapIndex, delayMs) => {
    triggerNote(stringId, position, `${dryTag}:reverb:${tapIndex}`, {
      shortTail: true,
      gainScale: dynamics * tapScale,
      startAtSeconds: tapStart(delayMs),
      voiceId,
    });
  }, aheadOfClock, VIOLIN_OWNER);

  // Each repeat needs its own tag — same-tag voices steal each other.
  let echoIndex = 0;
  schedulePianoEchoRepeats((tapScale, delayMs) => {
    triggerNote(stringId, position, `${dryTag}:echo:${echoIndex++}`, {
      gainScale: dynamics * tapScale,
      startAtSeconds: tapStart(delayMs),
      sustainSeconds,
      voiceId,
    });
  }, aheadOfClock, VIOLIN_OWNER);
}

export function playPhrase(
  phraseId: PhraseId,
  gainScale = 1,
  voiceId: ViolinVoiceId = currentVoiceId,
): void {
  const phrase = getPhraseById(phraseId);
  if (!phrase) {
    return;
  }

  for (let i = 0; i < phrase.notes.length; i++) {
    const { stringId, position } = phrase.notes[i];
    const timer = setTimeout(() => {
      phraseTimers.delete(timer);
      playNote(stringId, position, gainScale, undefined, voiceId);
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

/** `voiceId` replays a take or Studio track on its own voice. */
export function playViolinSoundId(
  soundId: string,
  gainScale = 1,
  performance?: NotePerformance,
  voiceId: ViolinVoiceId = currentVoiceId,
): void {
  const parsed = parseViolinSoundId(soundId);
  if (!parsed) {
    if (soundId.startsWith('phrase:')) {
      const phraseId = soundId.slice('phrase:'.length);
      if (isPhraseId(phraseId)) {
        playPhrase(phraseId, gainScale, voiceId);
      }
    }
    return;
  }

  if (parsed.kind === 'phrase') {
    playPhrase(parsed.phraseId, gainScale, voiceId);
    return;
  }

  playNote(parsed.stringId, parsed.position, gainScale, performance, voiceId);
}

export function releaseViolinEngine(): void {
  stopViolinPhrases();
  // Cancels pending echo/reverb re-triggers — without this, taps keep
  // sounding after leaving the screen (buffers stay decoded). Only the
  // violin's own: the FX bus, its settings and the metronome are shared.
  clearPianoFxTimersFor(VIOLIN_OWNER);
  stopVoicesByTagPrefix(['violin:']);
  initialized = false;
}
