import type { AudioBuffer, GainNode } from '../../audio/audioApi';

import {
  getSharedAudioContext,
  loadSample,
  playSample,
  prepareSamplePlayback,
  releaseVoiceByTag,
  stopAllVoices,
  type PlayedSampleHandle,
} from '../../audio/sampleBank';
import {
  getPianoFxInput,
  schedulePianoEchoRepeats,
  schedulePianoReverbTaps,
} from '../piano/pianoFx';
import type { ChordId } from './guitarChords';
import { getChordById, isChordId } from './guitarChords';
import {
  buildChordPatternSteps,
  isGuitarChordPlayMode,
  type GuitarChordGesture,
  type GuitarChordPlayMode,
} from './guitarChordPatterns';
import {
  GUITAR_ACOUSTIC_SAMPLE_FILES,
  GUITAR_ELECTRIC_SAMPLE_FILES,
  getGuitarNoteSampleConfig,
  sampleBankForVoice,
} from './guitarSamples';
import { guitarStringGainBalance } from './guitarBalance';
import { fretToMidi, midiToFret, type GuitarStringId } from './guitarSounds';
import {
  clampGuitarVelocity,
  guitarAttackSecondsForVelocity,
  guitarGainScaleForVelocity,
  GUITAR_VELOCITY_DEFAULT,
} from './guitarVelocity';
import { getGuitarVoice, type GuitarVoiceId } from './guitarVoices';

const STRING_GAIN = 0.42;
/** Soft mute when finger lifts (guitar damp). */
const NOTE_OFF_FADE_SECONDS = 0.18;

type BiquadFilterNode = ReturnType<
  ReturnType<typeof getSharedAudioContext>['createBiquadFilter']
>;

/** Buffer key: `${bank}:${anchorId}` so acoustic/electric share note names. */
const buffers = new Map<string, AudioBuffer>();
const strumTimers: ReturnType<typeof setTimeout>[] = [];
const fingerHeld = new Set<string>();
/** Live pitch handles for held notes — bend/vibrato targets, keyed by cell. */
const heldBendHandles = new Map<
  string,
  { handle: PlayedSampleHandle; baseRate: number }
>();
let initialized = false;
let currentVoiceId: GuitarVoiceId = 'nylon';
let pluckSerial = 0;
/** Settings "strum feel" / "sustain" scales — apply to live play and replay. */
let strumStaggerScale = 1;
let sustainScale = 1;

export type GuitarPluckListener = (
  stringId: GuitarStringId,
  velocity: number,
  /** Fretted position — visuals vibrate only the sounding segment (0 = open). */
  fret: number,
) => void;

/** UI hook for string-vibration visuals — fires per pluck incl. chord steps. */
let pluckListener: GuitarPluckListener | null = null;

export function setGuitarPluckListener(listener: GuitarPluckListener | null): void {
  pluckListener = listener;
}

export function setGuitarStrumStaggerScale(scale: number): void {
  strumStaggerScale = scale > 0 ? scale : 1;
}

export function setGuitarSustainScale(scale: number): void {
  sustainScale = scale > 0 ? scale : 1;
}

let voiceGain: GainNode | null = null;
let voiceFilter: BiquadFilterNode | null = null;

function cellKey(stringId: GuitarStringId, fret: number): string {
  return `${stringId}:f${fret}`;
}

function dryHeldTag(stringId: GuitarStringId, fret: number): string {
  return `guitar:held:${cellKey(stringId, fret)}`;
}

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

export async function initGuitarEngine(): Promise<void> {
  if (initialized) {
    return;
  }

  await prepareSamplePlayback();
  getPianoFxInput();
  ensureVoiceBus();

  const acousticIds = Object.keys(GUITAR_ACOUSTIC_SAMPLE_FILES) as Array<
    keyof typeof GUITAR_ACOUSTIC_SAMPLE_FILES
  >;
  const electricIds = Object.keys(GUITAR_ELECTRIC_SAMPLE_FILES) as Array<
    keyof typeof GUITAR_ELECTRIC_SAMPLE_FILES
  >;

  await Promise.all([
    ...acousticIds.map(async (id) => {
      const buffer = await loadSample(GUITAR_ACOUSTIC_SAMPLE_FILES[id]);
      buffers.set(`acoustic:${id}`, buffer);
    }),
    ...electricIds.map(async (id) => {
      const buffer = await loadSample(GUITAR_ELECTRIC_SAMPLE_FILES[id]);
      buffers.set(`electric:${id}`, buffer);
    }),
  ]);

  initialized = true;
}

export function setGuitarVoice(id: GuitarVoiceId): void {
  currentVoiceId = id;
  applyVoiceToBus();
}

export function getCurrentGuitarVoiceId(): GuitarVoiceId {
  return currentVoiceId;
}

function triggerPluck(
  midi: number,
  gain: number,
  tag: string,
  options?: { shortTail?: boolean; held?: boolean; velocity?: number },
): { handle: PlayedSampleHandle; rate: number } | null {
  const bank = sampleBankForVoice(currentVoiceId);
  const config = getGuitarNoteSampleConfig(midi, bank);
  const buffer = buffers.get(`${config.bank}:${config.anchorId}`);
  if (!buffer) {
    return null;
  }

  const voice = getGuitarVoice(currentVoiceId).audio;
  const rate = config.playbackRate * voice.playbackRate;
  const output = ensureVoiceBus();
  const shortTail = options?.shortTail ?? false;
  const held = options?.held ?? false;
  const velocity = clampGuitarVelocity(options?.velocity ?? GUITAR_VELOCITY_DEFAULT);

  const handle = playSample(buffer, rate, gain, output, tag, {
    shortTail,
    held,
    attackSeconds: guitarAttackSecondsForVelocity(velocity, shortTail),
    // One-shots use voice envelope; held notes use sampleBank HELD ceiling.
    holdSeconds: held
      ? undefined
      : shortTail
        ? 0.55
        : (voice.holdSeconds ?? 3.2) * sustainScale,
    releaseSeconds: held
      ? undefined
      : shortTail
        ? 0.4
        : (voice.releaseSeconds ?? 2.2) * sustainScale,
  });

  return { handle, rate };
}

function pluckGain(stringId: GuitarStringId, velocity: number): number {
  return (
    STRING_GAIN *
    guitarGainScaleForVelocity(velocity) *
    guitarStringGainBalance(stringId)
  );
}

function resolveMidi(
  stringId: GuitarStringId,
  fretOrMidi: number | undefined,
  asMidi?: boolean,
): number {
  if (fretOrMidi === undefined) {
    return fretToMidi(stringId, 0);
  }
  if (asMidi) {
    return fretOrMidi;
  }
  return fretToMidi(stringId, fretOrMidi);
}

/**
 * One-shot pluck (chords, tutorial demo, recording replay).
 * Rings out on its own — not tied to finger lift.
 */
export function pluckString(
  stringId: GuitarStringId,
  fretOrMidi?: number,
  options?: { asMidi?: boolean; velocity?: number },
): void {
  const context = getSharedAudioContext();
  if (context.state === 'suspended') {
    void context.resume();
  }

  const velocity = clampGuitarVelocity(options?.velocity ?? GUITAR_VELOCITY_DEFAULT);
  const gain = pluckGain(stringId, velocity);
  const midi = resolveMidi(stringId, fretOrMidi, options?.asMidi);
  pluckSerial += 1;
  const dryTag = `guitar:shot:${stringId}:${midi}:${pluckSerial}`;

  pluckListener?.(stringId, velocity, midiToFret(stringId, midi));
  triggerPluck(midi, gain, dryTag, { velocity });

  schedulePianoReverbTaps((gainScale, tapIndex) => {
    triggerPluck(midi, gain * gainScale, `${dryTag}:reverb:${tapIndex}`, {
      shortTail: true,
      velocity,
    });
  });

  // Each repeat needs its own tag — same-tag voices steal each other in sampleBank.
  let echoIndex = 0;
  schedulePianoEchoRepeats((gainScale) => {
    triggerPluck(midi, gain * gainScale, `${dryTag}:echo:${echoIndex++}`, { velocity });
  });
}

/**
 * Interactive fret press — held until noteOff (finger lift / slide away).
 * `velocity` 0..1 from touch Y in the string row (soft finger → hard pick).
 */
export function noteOn(
  stringId: GuitarStringId,
  fret: number,
  velocity: number = GUITAR_VELOCITY_DEFAULT,
): void {
  const context = getSharedAudioContext();
  if (context.state === 'suspended') {
    void context.resume();
  }

  const key = cellKey(stringId, fret);
  const midi = fretToMidi(stringId, fret);
  const tag = dryHeldTag(stringId, fret);
  const v = clampGuitarVelocity(velocity);
  const gain = pluckGain(stringId, v);

  // Retrigger: damp previous hold on this cell, then pluck again.
  releaseVoiceByTag(tag, 0.04);
  fingerHeld.add(key);

  pluckListener?.(stringId, v, midiToFret(stringId, midi));
  const played = triggerPluck(midi, gain, tag, { held: true, velocity: v });
  if (played) {
    heldBendHandles.set(key, { handle: played.handle, baseRate: played.rate });
  }

  // FX taps must not share tags across retriggers of the same cell — the dry
  // held tag stays stable for noteOff, but taps get a per-hit serial.
  pluckSerial += 1;
  const fxTag = `${tag}#${pluckSerial}`;

  schedulePianoReverbTaps((gainScale, tapIndex) => {
    triggerPluck(midi, gain * gainScale, `${fxTag}:reverb:${tapIndex}`, {
      shortTail: true,
      velocity: v,
    });
  });

  let echoIndex = 0;
  schedulePianoEchoRepeats((gainScale) => {
    triggerPluck(midi, gain * gainScale, `${fxTag}:echo:${echoIndex++}`, { velocity: v });
  });
}

/** Interactive fret release — soft damp like lifting a finger. */
export function noteOff(stringId: GuitarStringId, fret: number): void {
  const key = cellKey(stringId, fret);
  fingerHeld.delete(key);
  heldBendHandles.delete(key);
  releaseVoiceByTag(dryHeldTag(stringId, fret), NOTE_OFF_FADE_SECONDS);
}

/**
 * Live bend for a held note — `semitones` ≥ 0 above the fretted pitch
 * (guitar bends only go up). No-op once the finger lifts.
 */
export function bendHeldNote(
  stringId: GuitarStringId,
  fret: number,
  semitones: number,
): void {
  const entry = heldBendHandles.get(cellKey(stringId, fret));
  if (!entry) {
    return;
  }
  const clamped = Math.max(0, Math.min(4, semitones));
  entry.handle.setPlaybackRate(entry.baseRate * 2 ** (clamped / 12));
}

export type GuitarStrumDirection = 'down' | 'up';

export type { GuitarChordGesture, GuitarChordPlayMode };

function clearStrumTimers(): void {
  for (const timer of strumTimers) {
    clearTimeout(timer);
  }
  strumTimers.length = 0;
}

/**
 * Play an armed chord: strum, arpeggio, or rasgueado.
 * Tap arpeggio uses a down-up-down fingerstyle pattern.
 */
export function playChord(
  chordId: ChordId,
  options?: {
    mode?: GuitarChordPlayMode;
    direction?: GuitarStrumDirection;
    gesture?: GuitarChordGesture;
  },
): void {
  const chord = getChordById(chordId);
  if (!chord) {
    return;
  }

  clearStrumTimers();

  const mode = options?.mode ?? 'strum';
  const direction = options?.direction ?? 'down';
  const gesture = options?.gesture ?? 'swipe';
  const steps = buildChordPatternSteps(
    chord,
    mode,
    direction,
    gesture,
    strumStaggerScale,
  );

  for (const step of steps) {
    const timer = setTimeout(() => {
      pluckString(step.stringId, step.midi, {
        asMidi: true,
        velocity: step.velocity,
      });
    }, step.atMs);
    strumTimers.push(timer);
  }
}

/** Convenience wrapper — full strum cascade. */
export function strumChord(
  chordId: ChordId,
  direction: GuitarStrumDirection = 'down',
): void {
  playChord(chordId, { mode: 'strum', direction, gesture: 'swipe' });
}

/**
 * Play a recording / tutorial sound id: `s3:f5`, `chord:Em`, legacy `s3`, or
 * the performance form `chord:Em:arpeggio:up:swipe` (mode/direction/gesture).
 */
export function playGuitarSoundId(soundId: string, velocity?: number): void {
  if (soundId.startsWith('chord:')) {
    const [chordId, mode, direction, gesture] = soundId
      .slice('chord:'.length)
      .split(':');
    if (isChordId(chordId)) {
      playChord(chordId, {
        mode: mode !== undefined && isGuitarChordPlayMode(mode) ? mode : 'strum',
        direction: direction === 'up' ? 'up' : 'down',
        gesture: gesture === 'tap' ? 'tap' : 'swipe',
      });
    }
    return;
  }

  const midiMatch = soundId.match(/^midi:(\d{1,3})$/);
  if (midiMatch) {
    pluckString('s6', Number(midiMatch[1]), { asMidi: true, velocity });
    return;
  }

  const fretted = soundId.match(/^(s[1-6]):f(\d{1,2})$/);
  if (fretted) {
    pluckString(fretted[1] as GuitarStringId, Number(fretted[2]), { velocity });
    return;
  }

  if (/^s[1-6]$/.test(soundId)) {
    pluckString(soundId as GuitarStringId, 0, { velocity });
  }
}

export function releaseGuitarEngine(): void {
  clearStrumTimers();
  fingerHeld.clear();
  heldBendHandles.clear();
  stopAllVoices();
  // Detach the bus — otherwise every focus cycle leaves a dead gain+filter
  // pair connected to the FX input.
  try {
    voiceGain?.disconnect();
  } catch {
    // Already disconnected.
  }
  try {
    voiceFilter?.disconnect();
  } catch {
    // Already disconnected.
  }
  voiceGain = null;
  voiceFilter = null;
  initialized = false;
}

export { midiToFret } from './guitarSounds';
