import type { AudioBuffer } from '../../audio/audioApi';

import {
  getSharedAudioContext,
  loadSample,
  playSample,
  prepareSamplePlayback,
  registerActiveVoice,
  releaseVoiceByTag,
  stopAllVoices,
} from '../../audio/sampleBank';
import {
  getPianoFxInput,
  resetPianoFx,
  schedulePianoEchoRepeats,
  schedulePianoReverbTaps,
} from './pianoFx';
import { stopMetronome } from './pianoMetronome';
import {
  BASE_SAMPLE_FILES,
  getNoteSampleConfig,
  SAMPLE_ANCHORS,
  type BaseSampleId,
} from './pianoSamples';
import { PIANO_NOTES, type NoteId } from './pianoNotes';
import type { PianoVoiceId } from './pianoVoices';

const MAX_PLAYBACK_RATE = 2.5;

const anchorBuffers = new Map<BaseSampleId, AudioBuffer>();
const noteMidis = new Map<NoteId, number>();
let toneOffsetSemitones = 0;
let currentVoice: PianoVoiceId = 'acoustic';
let initialized = false;
let sustainPedalOn = false;
// Both maps remember the voice each note was struck with, so a note is always
// released with the tag it was created with — even if the user switches voice
// while the key is still held (otherwise the release tag would not match and
// the note could ring on for its full lifetime).
/** Keys currently under the finger → voice they were struck with. */
const fingerHeldNotes = new Map<NoteId, PianoVoiceId>();
/** Notes kept ringing by the sustain pedal after finger lift → struck voice. */
const pedalHeldNotes = new Map<NoteId, PianoVoiceId>();

const HELD_SYNTH_SECONDS = 24;

// ---------------------------------------------------------------------------
// Synth polyphony bus — automatic gain compensation.
//
// Oscillator-based voices (organ, rhodes, synthLead) produce mathematically
// pure waveforms that sum in-phase.  Even a few simultaneous notes can push
// the total past the master limiter's safe range, causing hard digital
// clipping heard as crackling.  A dedicated synthBus sits between every synth
// voice and the FX input; its gain is dynamically adjusted to 1/sqrt(n) where
// n is the number of currently ringing synth voices.  One note plays at full
// volume, but eight notes are automatically ducked to ~35 % each — keeping
// the summed level roughly constant no matter how fast the user plays.
// ---------------------------------------------------------------------------

type GainNodeT = ReturnType<ReturnType<typeof getSharedAudioContext>['createGain']>;

let synthBusNode: GainNodeT | null = null;
let activeSynthCount = 0;
const synthEndTimers = new Set<ReturnType<typeof setTimeout>>();

function getSynthBus(): GainNodeT {
  if (!synthBusNode) {
    const ctx = getSharedAudioContext();
    synthBusNode = ctx.createGain();
    synthBusNode.gain.value = 1;
    synthBusNode.connect(getPianoFxInput());
  }
  return synthBusNode;
}

function updateSynthBusGain(): void {
  const bus = synthBusNode;
  if (!bus) return;
  const ctx = getSharedAudioContext();
  const now = ctx.currentTime;
  // 1/sqrt(n): 1→1.00  2→0.71  4→0.50  8→0.35  16→0.25
  const target = Math.max(0.22, 1 / Math.sqrt(Math.max(1, activeSynthCount)));
  try {
    bus.gain.cancelScheduledValues(now);
    bus.gain.setValueAtTime(bus.gain.value, now);
    bus.gain.linearRampToValueAtTime(target, now + 0.012);
  } catch {
    bus.gain.value = target;
  }
}

/**
 * Register a synth voice in the polyphony-compensation budget.  The counter
 * is decremented automatically when the voice's lifetime expires.  Early
 * voice stealing may cause the counter to stay briefly high, which is safe
 * (results in slightly more ducking — never in clipping).
 */
function registerSynthLifetime(durationSeconds: number): void {
  activeSynthCount++;
  updateSynthBusGain();

  const ms = Math.max(50, durationSeconds * 1000);
  const timer = setTimeout(() => {
    synthEndTimers.delete(timer);
    activeSynthCount = Math.max(0, activeSynthCount - 1);
    updateSynthBusGain();
  }, ms);
  synthEndTimers.add(timer);
}

function resetSynthBus(): void {
  for (const timer of synthEndTimers) clearTimeout(timer);
  synthEndTimers.clear();
  activeSynthCount = 0;
  if (synthBusNode) {
    try { synthBusNode.disconnect(); } catch { /* already disconnected */ }
    synthBusNode = null;
  }
}

export function setPianoToneOffset(semitones: number): void {
  toneOffsetSemitones = semitones;
}

export function getPianoToneOffset(): number {
  return toneOffsetSemitones;
}

export function setPianoVoice(voice: PianoVoiceId): void {
  currentVoice = voice;
}

export function getPianoVoice(): PianoVoiceId {
  return currentVoice;
}

export async function initPianoEngine(): Promise<void> {
  if (initialized) {
    return;
  }

  await prepareSamplePlayback();

  await Promise.all(
    SAMPLE_ANCHORS.map(async (anchor) => {
      const buffer = await loadSample(BASE_SAMPLE_FILES[anchor.id]);
      anchorBuffers.set(anchor.id, buffer);
    }),
  );

  for (const note of PIANO_NOTES) {
    noteMidis.set(note.id, note.midi);
  }

  initialized = true;
}

function midiToFrequency(midi: number): number {
  return 440 * 2 ** ((midi - 69) / 12);
}

// Shared high-shelf EQ for the "bright" voice — one linear filter can serve
// every note, so it is created once and kept connected to the FX input.
let brightFilter: ReturnType<
  ReturnType<typeof getSharedAudioContext>['createBiquadFilter']
> | null = null;

function getBrightFilter() {
  if (!brightFilter) {
    const context = getSharedAudioContext();
    brightFilter = context.createBiquadFilter();
    brightFilter.type = 'highshelf';
    brightFilter.frequency.value = 1800;
    brightFilter.gain.value = 4;
    // Connect once to the stable voiceBus — identity never changes.
    brightFilter.connect(getPianoFxInput());
  }
  return brightFilter;
}

// Soft lowpass for music-box notes played above ~1.5× rate — cuts aliasing
// crackle from extreme resampling while keeping the plinky character.
let musicBoxFilter: ReturnType<
  ReturnType<typeof getSharedAudioContext>['createBiquadFilter']
> | null = null;

function getMusicBoxFilter() {
  if (!musicBoxFilter) {
    const context = getSharedAudioContext();
    musicBoxFilter = context.createBiquadFilter();
    musicBoxFilter.type = 'lowpass';
    musicBoxFilter.frequency.value = 4500;
    musicBoxFilter.Q.value = 0.7;
    musicBoxFilter.connect(getPianoFxInput());
  }
  return musicBoxFilter;
}

// Soft lowpass for organ — stacked sines in the bass band overload phone
// speakers as mud/crackle; rolling off the top keeps chords cleaner.
let organFilter: ReturnType<
  ReturnType<typeof getSharedAudioContext>['createBiquadFilter']
> | null = null;

function getOrganFilter() {
  if (!organFilter) {
    const context = getSharedAudioContext();
    organFilter = context.createBiquadFilter();
    organFilter.type = 'lowpass';
    organFilter.frequency.value = 2800;
    organFilter.Q.value = 0.6;
    // Route through synthBus for polyphony gain compensation.
    organFilter.connect(getSynthBus());
  }
  return organFilter;
}

function disconnectFilter(
  filter: ReturnType<
    ReturnType<typeof getSharedAudioContext>['createBiquadFilter']
  > | null,
): void {
  if (!filter) {
    return;
  }
  try {
    filter.disconnect();
  } catch {
    // Already disconnected.
  }
}

/** Drop voice-color filters so the next play reconnects to the live voiceBus. */
function resetPianoVoiceFilters(): void {
  disconnectFilter(brightFilter);
  disconnectFilter(musicBoxFilter);
  disconnectFilter(organFilter);
  brightFilter = null;
  musicBoxFilter = null;
  organFilter = null;
  resetSynthBus();
}

function playSampleVoice(
  noteId: NoteId,
  effectiveMidi: number,
  gain: number,
  options?: {
    output?: Parameters<typeof playSample>[3];
    /** Soft lowpass when rate is high (music-box aliasing). */
    antiAlias?: boolean;
    /** 1 = dry note; <1 = quieter echo/reverb tap. */
    gainScale?: number;
    /** Unique tag so FX taps do not steal the dry note. */
    tag?: string;
    /** Short envelope for reverb/echo taps — protects polyphony. */
    shortTail?: boolean;
    /** Finger/sustain held note — release via releaseVoiceByTag. */
    held?: boolean;
  },
): void {
  // Pick the anchor sample nearest to the target pitch so the playback rate
  // stays close to 1.0 — extreme rates cause crackly resampling artifacts.
  const { anchorId, playbackRate } = getNoteSampleConfig(effectiveMidi);
  const buffer = anchorBuffers.get(anchorId);
  if (!buffer) {
    return;
  }

  const rate = Math.min(playbackRate, MAX_PLAYBACK_RATE);
  const destination =
    options?.output ??
    (options?.antiAlias && rate > 1.5
      ? getMusicBoxFilter()
      : getPianoFxInput());
  const gainScale = options?.gainScale ?? 1;
  const tag = options?.tag ?? `piano:${noteId}`;

  playSample(buffer, rate, gain * gainScale, destination, tag, {
    shortTail: options?.shortTail,
    held: options?.held,
  });
}

// Synth voices sustain their level instead of decaying like a struck string,
// so overlapping notes sum far higher than piano samples do. Their peak
// levels are kept low and their envelopes decay fast (exponential ramps),
// otherwise fast playing pushes the mix past the clip ceiling — heard as
// crackling that "starts after a while".

// Church/drawbar organ: stacked sine partials with a short sustained tone.
// Routed through synthBus for automatic polyphony gain compensation.
function playOrgan(
  frequency: number,
  tag: string,
  gainScale = 1,
  held = false,
  shortTail = false,
): void {
  const context = getSharedAudioContext();
  const now = context.currentTime;

  // Thick/low notes carry more energy on small speakers — scale them down.
  const bassScale =
    frequency < 180 ? 0.45 : frequency < 280 ? 0.6 : frequency < 400 ? 0.8 : 1;

  const noteGain = context.createGain();
  // Start silent — the envelope ramp brings the level up.
  noteGain.gain.setValueAtTime(0.0001, now);
  const stealGain = context.createGain();
  noteGain.connect(stealGain);
  stealGain.connect(getOrganFilter());

  // Levels kept modest: chords stack 3 partials × N keys into the master.
  const partials: [ratio: number, level: number][] = [
    [1, 0.055 * bassScale * gainScale],
    [2, 0.028 * bassScale * gainScale],
    [3, 0.014 * bassScale * gainScale],
  ];

  const oscillators = partials.map(([ratio, level]) => {
    const osc = context.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = frequency * ratio;
    // A few random cents of detune keep repeated presses of the same key
    // from phase-stacking into a doubled (clipping) amplitude.
    osc.detune.value = (Math.random() - 0.5) * 12;
    const partialGain = context.createGain();
    partialGain.gain.value = level;
    osc.connect(partialGain);
    partialGain.connect(noteGain);
    osc.start(now);
    return osc;
  });

  const peak = 0.8;
  const releaseStart = now + (held ? HELD_SYNTH_SECONDS : shortTail ? 0.12 : 0.35);
  const endsAt = releaseStart + (held ? 0.25 : shortTail ? 0.1 : 0.18);
  noteGain.gain.linearRampToValueAtTime(peak, now + 0.015);
  noteGain.gain.setValueAtTime(peak, releaseStart);
  noteGain.gain.exponentialRampToValueAtTime(0.001, endsAt);

  const voiceDuration = endsAt - now + 0.05;
  registerSynthLifetime(voiceDuration);

  for (const osc of oscillators) {
    osc.stop(endsAt + 0.05);
  }

  registerActiveVoice(
    {
      stop: (when?: number) => {
        for (const osc of oscillators) {
          osc.stop(when);
        }
      },
    },
    stealGain,
    endsAt + 0.05,
    tag,
  );
}

// Electric piano: soft sine fundamental with a fast-decaying bell overtone.
// Routed through synthBus for automatic polyphony gain compensation.
function playRhodes(
  frequency: number,
  tag: string,
  gainScale = 1,
  held = false,
  shortTail = false,
): void {
  const context = getSharedAudioContext();
  const now = context.currentTime;

  // Bass notes carry more energy on small speakers — scale them down.
  const bassScale =
    frequency < 180 ? 0.5 : frequency < 280 ? 0.65 : frequency < 400 ? 0.82 : 1;

  const noteGain = context.createGain();
  // Start silent — the per-partial envelopes bring the level up.
  noteGain.gain.setValueAtTime(0.0001, now);
  noteGain.gain.linearRampToValueAtTime(1, now + 0.003);
  const stealGain = context.createGain();
  noteGain.connect(stealGain);
  // Route through synthBus, not directly to FX input.
  stealGain.connect(getSynthBus());

  const endsAt = now + (held ? HELD_SYNTH_SECONDS : shortTail ? 0.3 : 1.0);

  const body = context.createOscillator();
  body.type = 'sine';
  body.frequency.value = frequency;
  // Random detune avoids phase-stacking on repeated presses of the same key.
  body.detune.value = (Math.random() - 0.5) * 10;
  const bodyGain = context.createGain();
  bodyGain.gain.setValueAtTime(0.0001, now);
  // Gentler attack (15 ms) prevents the click heard when two overlapping
  // voices both hit their peak at the same instant.
  bodyGain.gain.linearRampToValueAtTime(0.13 * bassScale * gainScale, now + 0.015);
  bodyGain.gain.exponentialRampToValueAtTime(0.001, endsAt);
  body.connect(bodyGain);
  bodyGain.connect(noteGain);
  body.start(now);
  body.stop(endsAt + 0.05);

  const bell = context.createOscillator();
  bell.type = 'sine';
  bell.frequency.value = frequency * 4;
  bell.detune.value = (Math.random() - 0.5) * 10;
  const bellGain = context.createGain();
  bellGain.gain.setValueAtTime(0.0001, now);
  bellGain.gain.linearRampToValueAtTime(0.032 * bassScale * gainScale, now + 0.015);
  bellGain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
  bell.connect(bellGain);
  bellGain.connect(noteGain);
  bell.start(now);
  bell.stop(endsAt + 0.05);

  const voiceDuration = endsAt - now + 0.05;
  registerSynthLifetime(voiceDuration);

  registerActiveVoice(
    {
      stop: (when?: number) => {
        body.stop(when);
        bell.stop(when);
      },
    },
    stealGain,
    endsAt + 0.05,
    tag,
  );
}

// Synth lead: sawtooth through a lowpass, plucky decay.
// Routed through synthBus for automatic polyphony gain compensation.
function playSynthLead(
  frequency: number,
  tag: string,
  gainScale = 1,
  held = false,
  shortTail = false,
): void {
  const context = getSharedAudioContext();
  const now = context.currentTime;

  const bassScale =
    frequency < 180 ? 0.55 : frequency < 280 ? 0.7 : frequency < 400 ? 0.85 : 1;

  const osc = context.createOscillator();
  osc.type = 'sawtooth';
  osc.frequency.value = frequency;

  const filter = context.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = Math.min(frequency * 4, 6000);
  filter.Q.value = 1.1;

  const endsAt = now + (held ? HELD_SYNTH_SECONDS : shortTail ? 0.25 : 0.8);
  const noteGain = context.createGain();
  noteGain.gain.setValueAtTime(0.0001, now);
  noteGain.gain.linearRampToValueAtTime(0.18 * bassScale * gainScale, now + 0.012);
  noteGain.gain.exponentialRampToValueAtTime(0.001, endsAt);

  const stealGain = context.createGain();

  osc.connect(filter);
  filter.connect(noteGain);
  noteGain.connect(stealGain);
  // Route through synthBus, not directly to FX input.
  stealGain.connect(getSynthBus());

  osc.start(now);
  osc.stop(endsAt + 0.05);

  const voiceDuration = endsAt - now + 0.05;
  registerSynthLifetime(voiceDuration);

  registerActiveVoice(osc, stealGain, endsAt + 0.05, tag);
}

function dryVoiceTag(voice: PianoVoiceId, noteId: NoteId): string {
  if (voice === 'acoustic' || voice === 'bright' || voice === 'musicBox') {
    return `piano:${noteId}`;
  }
  return `${voice}:${noteId}`;
}

function triggerVoice(
  noteId: NoteId,
  shiftedMidi: number,
  voice: PianoVoiceId,
  gainScale: number,
  tagSuffix: string,
  shortTail = false,
  held = false,
): void {
  const tag = `${voice}:${noteId}${tagSuffix}`;

  switch (voice) {
    case 'acoustic':
      playSampleVoice(noteId, shiftedMidi, 0.55, {
        gainScale,
        shortTail,
        held,
        tag: `piano:${noteId}${tagSuffix}`,
      });
      break;
    case 'bright':
      playSampleVoice(noteId, shiftedMidi, 0.5, {
        output: getBrightFilter(),
        gainScale,
        shortTail,
        held,
        tag: `piano:${noteId}${tagSuffix}`,
      });
      break;
    case 'musicBox':
      playSampleVoice(noteId, shiftedMidi + 12, 0.45, {
        antiAlias: true,
        gainScale,
        shortTail,
        held,
        tag: `piano:${noteId}${tagSuffix}`,
      });
      break;
    case 'organ':
      playOrgan(midiToFrequency(shiftedMidi), tag, gainScale, held, shortTail);
      break;
    case 'rhodes':
      playRhodes(midiToFrequency(shiftedMidi), tag, gainScale, held, shortTail);
      break;
    case 'synth':
      playSynthLead(midiToFrequency(shiftedMidi), tag, gainScale, held, shortTail);
      break;
  }
}

/**
 * One-shot note (tutorial / play-along / FX taps). Auto-releases on its own.
 * @param gainScale Extra output multiplier — used by Studio mix playback to
 * apply a track's volume fader.
 */
export function playNote(
  noteId: NoteId,
  toneSemitones = toneOffsetSemitones,
  voice: PianoVoiceId = currentVoice,
  gainScale = 1,
): void {
  const midi = noteMidis.get(noteId);
  if (midi === undefined) {
    return;
  }

  // Modal / OS audio focus can suspend the context; resume on first note.
  const context = getSharedAudioContext();
  if (context.state === 'suspended') {
    void context.resume();
  }

  const shiftedMidi = midi + toneSemitones;

  // 1) Dry piano immediately.
  triggerVoice(noteId, shiftedMidi, voice, gainScale, '');

  // 2) Reverb: denser delayed reflections (no ConvolverNode — crackles on RN).
  schedulePianoReverbTaps((tapScale, tapIndex) => {
    triggerVoice(noteId, shiftedMidi, voice, gainScale * tapScale, `:reverb:${tapIndex}`, true);
  });

  // 3) Echo: quieter spaced repeats — leave echo path unchanged (full tail).
  schedulePianoEchoRepeats((tapScale) => {
    triggerVoice(noteId, shiftedMidi, voice, gainScale * tapScale, ':echo');
  });
}

/**
 * Interactive key press — held until noteOff / sustain pedal release.
 */
export function noteOn(
  noteId: NoteId,
  toneSemitones = toneOffsetSemitones,
  voice: PianoVoiceId = currentVoice,
): void {
  const midi = noteMidis.get(noteId);
  if (midi === undefined) {
    return;
  }

  const context = getSharedAudioContext();
  if (context.state === 'suspended') {
    void context.resume();
  }

  fingerHeldNotes.set(noteId, voice);
  pedalHeldNotes.delete(noteId);

  const shiftedMidi = midi + toneSemitones;
  triggerVoice(noteId, shiftedMidi, voice, 1, '', false, true);

  schedulePianoReverbTaps((gainScale, tapIndex) => {
    triggerVoice(noteId, shiftedMidi, voice, gainScale, `:reverb:${tapIndex}`, true);
  });
  schedulePianoEchoRepeats((gainScale) => {
    triggerVoice(noteId, shiftedMidi, voice, gainScale, ':echo');
  });
}

function releaseDryNote(
  noteId: NoteId,
  voice: PianoVoiceId = currentVoice,
): void {
  releaseVoiceByTag(dryVoiceTag(voice, noteId));
}

/**
 * Interactive key release. With sustain on, the note keeps ringing until
 * the pedal is lifted (or the same key is pressed again).
 */
export function noteOff(
  noteId: NoteId,
  voice: PianoVoiceId = currentVoice,
): void {
  // Release with the voice the note was struck with, not whatever voice is
  // selected now — the tag must match the one used at noteOn.
  const heldVoice = fingerHeldNotes.get(noteId) ?? voice;
  fingerHeldNotes.delete(noteId);

  if (sustainPedalOn) {
    pedalHeldNotes.set(noteId, heldVoice);
    return;
  }

  pedalHeldNotes.delete(noteId);
  releaseDryNote(noteId, heldVoice);
}

export function setSustainPedal(on: boolean): void {
  sustainPedalOn = on;
  if (on) {
    return;
  }

  for (const [noteId, heldVoice] of pedalHeldNotes) {
    if (!fingerHeldNotes.has(noteId)) {
      releaseDryNote(noteId, heldVoice);
    }
  }
  pedalHeldNotes.clear();
}

export function getSustainPedal(): boolean {
  return sustainPedalOn;
}

export function releasePianoEngine(): void {
  stopMetronome();
  stopAllVoices();
  resetPianoVoiceFilters();
  resetPianoFx();
  fingerHeldNotes.clear();
  pedalHeldNotes.clear();
  sustainPedalOn = false;
  noteMidis.clear();
  toneOffsetSemitones = 0;
  initialized = false;
}
