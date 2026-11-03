import type { AudioBuffer, GainNode } from '../../audio/audioApi';

import {
  getSharedAudioContext,
  loadSample,
  playSample,
  prepareSamplePlayback,
  releaseVoiceByTag,
  resumeAudioContextIfSuspended,
  stopVoicesByTagPrefix,
  type PlayedSampleHandle,
} from '../../audio/sampleBank';
import {
  clearPianoFxTimersFor,
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
import {
  velocityGain,
  type NotePerformance,
} from '../shared/songPerformance';

const STRING_GAIN = 0.42;
/** Soft mute when finger lifts (guitar damp). */
const NOTE_OFF_FADE_SECONDS = 0.18;
/** Damp at the end of a written note — a string is muted, not cut dead. */
const GUITAR_DAMPER_SECONDS = 0.4;
/** Names this engine's pending echo/reverb re-triggers in the shared FX bus. */
const GUITAR_OWNER = 'guitar';

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
let initPromise: Promise<void> | null = null;
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

/**
 * One bus per voice (gain → tone filter → FX input), built the first time
 * that voice plays. A single shared bus could only wear one voice's tone at a
 * time, so a Studio mix had to put every guitar track on the first track's
 * voice — and an overdub's beds re-voiced the guitar under the user's hands.
 */
type VoiceBus = { gain: GainNode; filter: BiquadFilterNode };
const voiceBuses = new Map<GuitarVoiceId, VoiceBus>();

function cellKey(stringId: GuitarStringId, fret: number): string {
  return `${stringId}:f${fret}`;
}

function dryHeldTag(stringId: GuitarStringId, fret: number): string {
  return `guitar:held:${cellKey(stringId, fret)}`;
}

function applyVoiceToBus(bus: VoiceBus, voiceId: GuitarVoiceId): void {
  const audio = getGuitarVoice(voiceId).audio;
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

function ensureVoiceBus(voiceId: GuitarVoiceId = currentVoiceId): GainNode {
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

export async function initGuitarEngine(): Promise<void> {
  if (initialized) {
    return;
  }
  // `initialized` only flips after the decode, so callers arriving during it
  // would each run the whole load — share the one in flight instead.
  if (!initPromise) {
    initPromise = loadGuitarEngine().finally(() => {
      initPromise = null;
    });
  }
  await initPromise;
}

async function loadGuitarEngine(): Promise<void> {
  await prepareSamplePlayback();
  getPianoFxInput();
  ensureVoiceBus();

  const acousticIds = Object.keys(GUITAR_ACOUSTIC_SAMPLE_FILES) as (keyof typeof GUITAR_ACOUSTIC_SAMPLE_FILES)[];
  const electricIds = Object.keys(GUITAR_ELECTRIC_SAMPLE_FILES) as (keyof typeof GUITAR_ELECTRIC_SAMPLE_FILES)[];

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

/** The voice hand-played notes use. Every voice keeps its own bus, so nothing to re-tune. */
export function setGuitarVoice(id: GuitarVoiceId): void {
  currentVoiceId = id;
}

export function getCurrentGuitarVoiceId(): GuitarVoiceId {
  return currentVoiceId;
}

function triggerPluck(
  midi: number,
  gain: number,
  tag: string,
  options?: {
    shortTail?: boolean;
    held?: boolean;
    velocity?: number;
    /** Absolute context time to sound at (song playback). */
    startAtSeconds?: number;
    /** Written note length — the string is damped once it is over. */
    sustainSeconds?: number;
    /** Voice to sound with; defaults to the one selected for hand-played notes. */
    voiceId?: GuitarVoiceId;
  },
): { handle: PlayedSampleHandle; rate: number } | null {
  const voiceId = options?.voiceId ?? currentVoiceId;
  const bank = sampleBankForVoice(voiceId);
  const config = getGuitarNoteSampleConfig(midi, bank);
  const buffer = buffers.get(`${config.bank}:${config.anchorId}`);
  if (!buffer) {
    return null;
  }

  const voice = getGuitarVoice(voiceId).audio;
  const rate = config.playbackRate * voice.playbackRate;
  const output = ensureVoiceBus(voiceId);
  const shortTail = options?.shortTail ?? false;
  const held = options?.held ?? false;
  const velocity = clampGuitarVelocity(options?.velocity ?? GUITAR_VELOCITY_DEFAULT);

  // A written note length damps the string the way the fretting hand does, so
  // a run of short notes stops ringing into one chord. It only ever shortens
  // the voice envelope — a plucked string decays on its own, never longer.
  const naturalHold = (voice.holdSeconds ?? 3.2) * sustainScale;
  const sustain = options?.sustainSeconds;
  const holdSeconds = held
    ? undefined
    : shortTail
      ? 0.55
      : sustain !== undefined
        ? Math.max(0.08, Math.min(sustain, naturalHold))
        : naturalHold;
  const releaseSeconds = held
    ? undefined
    : shortTail
      ? 0.4
      : sustain !== undefined
        ? GUITAR_DAMPER_SECONDS
        : (voice.releaseSeconds ?? 2.2) * sustainScale;

  const handle = playSample(buffer, rate, gain, output, tag, {
    shortTail,
    held,
    attackSeconds: guitarAttackSecondsForVelocity(velocity, shortTail),
    // One-shots use voice envelope; held notes use sampleBank HELD ceiling.
    holdSeconds,
    releaseSeconds,
    startAtSeconds: options?.startAtSeconds,
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
 *
 * `velocity` stays the picking hand: it shapes the attack and the string's own
 * gain curve. `performance` is what the song asks for — the moment the pluck
 * must sound, how long it rings and how hard it is struck. Interactive plucks
 * omit it and keep the immediate, fixed-envelope behaviour. `voiceId` replays
 * a take or Studio track on its own voice (default: the selected one).
 */
export function pluckString(
  stringId: GuitarStringId,
  fretOrMidi?: number,
  options?: {
    asMidi?: boolean;
    velocity?: number;
    gainScale?: number;
    performance?: NotePerformance;
    voiceId?: GuitarVoiceId;
  },
): void {
  resumeAudioContextIfSuspended();

  // Fixed now, so echo/reverb taps fired later keep the voice of their note.
  const voiceId = options?.voiceId ?? currentVoiceId;
  const performance = options?.performance;
  const velocity = clampGuitarVelocity(options?.velocity ?? GUITAR_VELOCITY_DEFAULT);
  const gainScale = (options?.gainScale ?? 1) * velocityGain(performance?.velocity);
  const gain = pluckGain(stringId, velocity) * gainScale;
  const midi = resolveMidi(stringId, fretOrMidi, options?.asMidi);
  pluckSerial += 1;
  const dryTag = `guitar:shot:${stringId}:${midi}:${pluckSerial}`;

  const atTime = performance?.atTime;
  const aheadOfClock = atTime !== undefined;
  const sustainSeconds = performance?.sustainSeconds;
  const tapStart = (delayMs: number): number | undefined =>
    atTime === undefined ? undefined : atTime + delayMs / 1000;

  pluckListener?.(stringId, velocity, midiToFret(stringId, midi));
  triggerPluck(midi, gain, dryTag, {
    velocity,
    startAtSeconds: atTime,
    sustainSeconds,
    voiceId,
  });

  schedulePianoReverbTaps((tapScale, tapIndex, delayMs) => {
    triggerPluck(midi, gain * tapScale, `${dryTag}:reverb:${tapIndex}`, {
      shortTail: true,
      velocity,
      startAtSeconds: tapStart(delayMs),
      voiceId,
    });
  }, aheadOfClock, GUITAR_OWNER);

  // Each repeat needs its own tag — same-tag voices steal each other in sampleBank.
  let echoIndex = 0;
  schedulePianoEchoRepeats((tapScale, delayMs) => {
    triggerPluck(midi, gain * tapScale, `${dryTag}:echo:${echoIndex++}`, {
      velocity,
      startAtSeconds: tapStart(delayMs),
      sustainSeconds,
      voiceId,
    });
  }, aheadOfClock, GUITAR_OWNER);
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
  resumeAudioContextIfSuspended();

  const key = cellKey(stringId, fret);
  const midi = fretToMidi(stringId, fret);
  const tag = dryHeldTag(stringId, fret);
  const v = clampGuitarVelocity(velocity);
  const gain = pluckGain(stringId, v);

  // Retrigger: damp previous hold on this cell, then pluck again.
  releaseVoiceByTag(tag, 0.04);
  fingerHeld.add(key);

  pluckListener?.(stringId, v, midiToFret(stringId, midi));
  // Fixed now, so echo/reverb taps fired later keep the voice of their note.
  const voiceId = currentVoiceId;
  const played = triggerPluck(midi, gain, tag, { held: true, velocity: v, voiceId });
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
      voiceId,
    });
  }, false, GUITAR_OWNER);

  let echoIndex = 0;
  schedulePianoEchoRepeats((gainScale) => {
    triggerPluck(midi, gain * gainScale, `${fxTag}:echo:${echoIndex++}`, {
      velocity: v,
      voiceId,
    });
  }, false, GUITAR_OWNER);
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
    gainScale?: number;
    performance?: NotePerformance;
    /** Voice to strum with; defaults to the one selected for hand playing. */
    voiceId?: GuitarVoiceId;
  },
): void {
  const chord = getChordById(chordId);
  if (!chord) {
    return;
  }

  const performance = options?.performance;
  const atTime = performance?.atTime;
  const voiceId = options?.voiceId ?? currentVoiceId;

  // A new hand-played strum replaces one still cascading. A chord placed on
  // the audio clock (a take, a Studio track) uses no timers, and must not cut
  // short the strum the user is playing over it.
  if (atTime === undefined) {
    clearStrumTimers();
  }

  const mode = options?.mode ?? 'strum';
  const direction = options?.direction ?? 'down';
  const gesture = options?.gesture ?? 'swipe';
  const gainScale = options?.gainScale ?? 1;
  const steps = buildChordPatternSteps(
    chord,
    mode,
    direction,
    gesture,
    strumStaggerScale,
  );

  // The stagger between strings is the strum. Placed on the audio clock it
  // keeps its shape exactly; a JS timer per string would smear it against the
  // chord's own onset. Each step keeps its pattern velocity (the accent within
  // the strum) — the song's own strength rides on top via `performance`.
  for (const step of steps) {
    if (atTime !== undefined) {
      pluckString(step.stringId, step.midi, {
        asMidi: true,
        velocity: step.velocity,
        gainScale,
        performance: { ...performance, atTime: atTime + step.atMs / 1000 },
        voiceId,
      });
      continue;
    }
    const timer = setTimeout(() => {
      pluckString(step.stringId, step.midi, {
        asMidi: true,
        velocity: step.velocity,
        gainScale,
        performance,
        voiceId,
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
 * `voiceId` replays a take or Studio track on its own voice.
 */
export function playGuitarSoundId(
  soundId: string,
  velocity?: number,
  gainScale = 1,
  performance?: NotePerformance,
  voiceId?: GuitarVoiceId,
): void {
  if (soundId.startsWith('chord:')) {
    const [chordId, mode, direction, gesture] = soundId
      .slice('chord:'.length)
      .split(':');
    if (isChordId(chordId)) {
      playChord(chordId, {
        mode: mode !== undefined && isGuitarChordPlayMode(mode) ? mode : 'strum',
        direction: direction === 'up' ? 'up' : 'down',
        gesture: gesture === 'tap' ? 'tap' : 'swipe',
        gainScale,
        performance,
        voiceId,
      });
    }
    return;
  }

  const midiMatch = soundId.match(/^midi:(\d{1,3})$/);
  if (midiMatch) {
    pluckString('s6', Number(midiMatch[1]), {
      asMidi: true,
      velocity,
      gainScale,
      performance,
      voiceId,
    });
    return;
  }

  const fretted = soundId.match(/^(s[1-6]):f(\d{1,2})$/);
  if (fretted) {
    pluckString(fretted[1] as GuitarStringId, Number(fretted[2]), {
      velocity,
      gainScale,
      performance,
      voiceId,
    });
    return;
  }

  if (/^s[1-6]$/.test(soundId)) {
    pluckString(soundId as GuitarStringId, 0, { velocity, gainScale, performance, voiceId });
  }
}

export function releaseGuitarEngine(): void {
  clearStrumTimers();
  fingerHeld.clear();
  heldBendHandles.clear();
  // Only the guitar's own sound — other instruments may still be playing.
  clearPianoFxTimersFor(GUITAR_OWNER);
  stopVoicesByTagPrefix(['guitar:']);
  // Detach the buses — otherwise every focus cycle leaves dead gain+filter
  // pairs connected to the FX input.
  for (const bus of voiceBuses.values()) {
    try {
      bus.gain.disconnect();
    } catch {
      // Already disconnected.
    }
    try {
      bus.filter.disconnect();
    } catch {
      // Already disconnected.
    }
  }
  voiceBuses.clear();
  initialized = false;
}

export { midiToFret } from './guitarSounds';
