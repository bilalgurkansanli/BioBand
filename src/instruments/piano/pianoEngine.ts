import type { AudioBuffer } from '../../audio/audioApi';

import {
  getSharedAudioContext,
  loadSample,
  playSample,
  prepareSamplePlayback,
  registerActiveVoice,
  stopAllVoices,
} from '../../audio/sampleBank';
import {
  getPianoFxInput,
  resetPianoFx,
  schedulePianoEchoRepeats,
} from './pianoFx';
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
    organFilter.connect(getPianoFxInput());
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
}

function playSampleVoice(
  noteId: NoteId,
  effectiveMidi: number,
  gain: number,
  options?: {
    output?: Parameters<typeof playSample>[3];
    /** Soft lowpass when rate is high (music-box aliasing). */
    antiAlias?: boolean;
    /** 1 = dry note; <1 = quieter echo repeat. */
    gainScale?: number;
    /** Unique tag so echo repeats do not steal the dry note. */
    tag?: string;
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

  playSample(buffer, rate, gain * gainScale, destination, tag);
}

// Synth voices sustain their level instead of decaying like a struck string,
// so overlapping notes sum far higher than piano samples do. Their peak
// levels are kept low and their envelopes decay fast (exponential ramps),
// otherwise fast playing pushes the mix past the clip ceiling — heard as
// crackling that "starts after a while".

// Church/drawbar organ: stacked sine partials with a short sustained tone.
function playOrgan(frequency: number, tag: string, gainScale = 1): void {
  const context = getSharedAudioContext();
  const now = context.currentTime;

  // Thick/low notes carry more energy on small speakers — scale them down.
  const bassScale =
    frequency < 180 ? 0.5 : frequency < 280 ? 0.7 : frequency < 400 ? 0.85 : 1;

  const noteGain = context.createGain();
  const stealGain = context.createGain();
  noteGain.connect(stealGain);
  stealGain.connect(getOrganFilter());

  // Levels kept modest: chords stack 3 partials × N keys into the master.
  const partials: [ratio: number, level: number][] = [
    [1, 0.07 * bassScale * gainScale],
    [2, 0.035 * bassScale * gainScale],
    [3, 0.018 * bassScale * gainScale],
  ];

  const oscillators = partials.map(([ratio, level]) => {
    const osc = context.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = frequency * ratio;
    // A few random cents of detune keep repeated presses of the same key
    // from phase-stacking into a doubled (clipping) amplitude.
    osc.detune.value = (Math.random() - 0.5) * 10;
    const partialGain = context.createGain();
    partialGain.gain.value = level;
    osc.connect(partialGain);
    partialGain.connect(noteGain);
    osc.start(now);
    return osc;
  });

  // Shorter sustain than before so overlapping organ notes sum less.
  const peak = 0.85;
  const releaseStart = now + 0.4;
  const endsAt = releaseStart + 0.22;
  noteGain.gain.setValueAtTime(0.0001, now);
  noteGain.gain.linearRampToValueAtTime(peak, now + 0.03);
  noteGain.gain.setValueAtTime(peak, releaseStart);
  noteGain.gain.exponentialRampToValueAtTime(0.001, endsAt);

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
function playRhodes(frequency: number, tag: string, gainScale = 1): void {
  const context = getSharedAudioContext();
  const now = context.currentTime;

  const noteGain = context.createGain();
  noteGain.gain.value = 1;
  const stealGain = context.createGain();
  noteGain.connect(stealGain);
  stealGain.connect(getPianoFxInput());

  const endsAt = now + 1.5;

  const body = context.createOscillator();
  body.type = 'sine';
  body.frequency.value = frequency;
  // See playOrgan: random detune avoids phase-stacking on repeated presses.
  body.detune.value = (Math.random() - 0.5) * 8;
  const bodyGain = context.createGain();
  bodyGain.gain.setValueAtTime(0.0001, now);
  bodyGain.gain.linearRampToValueAtTime(0.22 * gainScale, now + 0.005);
  bodyGain.gain.exponentialRampToValueAtTime(0.001, endsAt);
  body.connect(bodyGain);
  bodyGain.connect(noteGain);
  body.start(now);
  body.stop(endsAt + 0.05);

  const bell = context.createOscillator();
  bell.type = 'sine';
  bell.frequency.value = frequency * 4;
  bell.detune.value = (Math.random() - 0.5) * 8;
  const bellGain = context.createGain();
  bellGain.gain.setValueAtTime(0.0001, now);
  bellGain.gain.linearRampToValueAtTime(0.06 * gainScale, now + 0.005);
  bellGain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
  bell.connect(bellGain);
  bellGain.connect(noteGain);
  bell.start(now);
  bell.stop(endsAt + 0.05);

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
function playSynthLead(frequency: number, tag: string, gainScale = 1): void {
  const context = getSharedAudioContext();
  const now = context.currentTime;

  const osc = context.createOscillator();
  osc.type = 'sawtooth';
  osc.frequency.value = frequency;

  const filter = context.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = Math.min(frequency * 4, 6000);
  filter.Q.value = 1.1;

  const endsAt = now + 0.95;
  const noteGain = context.createGain();
  noteGain.gain.setValueAtTime(0.0001, now);
  noteGain.gain.linearRampToValueAtTime(0.26 * gainScale, now + 0.005);
  noteGain.gain.exponentialRampToValueAtTime(0.001, endsAt);

  const stealGain = context.createGain();

  osc.connect(filter);
  filter.connect(noteGain);
  noteGain.connect(stealGain);
  stealGain.connect(getPianoFxInput());

  osc.start(now);
  osc.stop(endsAt + 0.05);

  registerActiveVoice(osc, stealGain, endsAt + 0.05, tag);
}

function triggerVoice(
  noteId: NoteId,
  shiftedMidi: number,
  voice: PianoVoiceId,
  gainScale: number,
  tagSuffix: string,
): void {
  const tag = `${voice}:${noteId}${tagSuffix}`;

  switch (voice) {
    case 'acoustic':
      playSampleVoice(noteId, shiftedMidi, 0.55, {
        gainScale,
        tag: `piano:${noteId}${tagSuffix}`,
      });
      break;
    case 'bright':
      playSampleVoice(noteId, shiftedMidi, 0.5, {
        output: getBrightFilter(),
        gainScale,
        tag: `piano:${noteId}${tagSuffix}`,
      });
      break;
    case 'musicBox':
      playSampleVoice(noteId, shiftedMidi + 12, 0.45, {
        antiAlias: true,
        gainScale,
        tag: `piano:${noteId}${tagSuffix}`,
      });
      break;
    case 'organ':
      playOrgan(midiToFrequency(shiftedMidi), tag, gainScale);
      break;
    case 'rhodes':
      playRhodes(midiToFrequency(shiftedMidi), tag, gainScale);
      break;
    case 'synth':
      playSynthLead(midiToFrequency(shiftedMidi), tag, gainScale);
      break;
  }
}

export function playNote(
  noteId: NoteId,
  toneSemitones = toneOffsetSemitones,
  voice: PianoVoiceId = currentVoice,
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
  triggerVoice(noteId, shiftedMidi, voice, 1, '');

  // 2) If echo is on: quieter repeats after delayMs (not DelayNode — broken on Android).
  schedulePianoEchoRepeats((gainScale) => {
    triggerVoice(noteId, shiftedMidi, voice, gainScale, ':echo');
  });
}

export function releasePianoEngine(): void {
  stopAllVoices();
  resetPianoVoiceFilters();
  resetPianoFx();
  noteMidis.clear();
  toneOffsetSemitones = 0;
  initialized = false;
}
