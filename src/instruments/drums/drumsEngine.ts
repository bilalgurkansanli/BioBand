import type { AudioBuffer, GainNode } from '../../audio/audioApi';

import {
  getSharedAudioContext,
  loadSample,
  playSample,
  prepareSamplePlayback,
  releaseVoiceByTag,
  stopAllVoices,
} from '../../audio/sampleBank';
import {
  getPianoFxInput,
  schedulePianoEchoRepeats,
  schedulePianoReverbTaps,
} from '../piano/pianoFx';
import { getDrumKit, type DrumKitId } from './drumsKits';
import { DRUM_HIT_GAINS, DRUM_SOUND_FILES, type DrumSoundId } from './drumsSounds';

type BiquadFilterNode = ReturnType<
  ReturnType<typeof getSharedAudioContext>['createBiquadFilter']
>;

const buffers = new Map<DrumSoundId, AudioBuffer>();
let initialized = false;
let currentKitId: DrumKitId = 'acoustic';

let kitGain: GainNode | null = null;
let kitFilter: BiquadFilterNode | null = null;
/** Softens crash / ride highs before they hit the kit bus. */
let cymbalTone: BiquadFilterNode | null = null;

const SOUND_IDS = Object.keys(DRUM_SOUND_FILES) as DrumSoundId[];

type HitEnvelope = {
  attackSeconds: number;
  holdSeconds: number;
  releaseSeconds: number;
  /** Multiplier on kit playbackRate (crash slightly lower = less tinny). */
  rateScale: number;
};

const HIT_ENVELOPES: Record<DrumSoundId, HitEnvelope> = {
  // Short musical crash — sample is ~1.1s; do not let it wash for 3–4s.
  crash: { attackSeconds: 0.006, holdSeconds: 0.45, releaseSeconds: 0.55, rateScale: 0.94 },
  ride: { attackSeconds: 0.004, holdSeconds: 1.1, releaseSeconds: 0.9, rateScale: 1 },
  hihatClosed: { attackSeconds: 0.001, holdSeconds: 0.12, releaseSeconds: 0.1, rateScale: 1 },
  hihatOpen: { attackSeconds: 0.002, holdSeconds: 0.55, releaseSeconds: 0.45, rateScale: 1 },
  kick: { attackSeconds: 0.001, holdSeconds: 0.55, releaseSeconds: 0.35, rateScale: 1 },
  snare: { attackSeconds: 0.001, holdSeconds: 0.35, releaseSeconds: 0.25, rateScale: 1 },
  tomHi: { attackSeconds: 0.002, holdSeconds: 0.45, releaseSeconds: 0.35, rateScale: 1 },
  tomMid: { attackSeconds: 0.002, holdSeconds: 0.5, releaseSeconds: 0.4, rateScale: 1 },
  tomLow: { attackSeconds: 0.002, holdSeconds: 0.55, releaseSeconds: 0.45, rateScale: 1 },
};

function applyKitToBus(): void {
  if (!kitGain || !kitFilter) {
    return;
  }
  const audio = getDrumKit(currentKitId).audio;
  kitGain.gain.value = audio.gainScale;
  kitFilter.type = audio.filterType;
  kitFilter.frequency.value = audio.filterFrequency;
  kitFilter.Q.value = audio.filterQ;
  // Acoustic uses peaking at unity — leave gain at 0 dB.
  if (audio.filterType === 'peaking' || audio.filterType === 'lowshelf') {
    kitFilter.gain.value = audio.filterType === 'lowshelf' ? 5 : 0;
  } else {
    kitFilter.gain.value = 0;
  }
}

function ensureKitBus(): GainNode {
  if (kitGain && kitFilter) {
    return kitGain;
  }
  const context = getSharedAudioContext();
  kitGain = context.createGain();
  kitFilter = context.createBiquadFilter();
  kitGain.connect(kitFilter);
  kitFilter.connect(getPianoFxInput());
  applyKitToBus();
  return kitGain;
}

function ensureCymbalTone(): GainNode {
  if (cymbalTone) {
    return cymbalTone;
  }
  const context = getSharedAudioContext();
  // Low-pass the harsh upper-mid / air that made the old crash sound tinny.
  cymbalTone = context.createBiquadFilter();
  cymbalTone.type = 'lowpass';
  cymbalTone.frequency.value = 5800;
  cymbalTone.Q.value = 0.65;
  cymbalTone.connect(ensureKitBus());
  return cymbalTone;
}

export async function initDrumsEngine(): Promise<void> {
  if (initialized) {
    return;
  }

  await prepareSamplePlayback();
  getPianoFxInput();
  ensureKitBus();
  ensureCymbalTone();

  await Promise.all(
    SOUND_IDS.map(async (id) => {
      const buffer = await loadSample(DRUM_SOUND_FILES[id]);
      buffers.set(id, buffer);
    }),
  );

  initialized = true;
}

export function setDrumKit(id: DrumKitId): void {
  currentKitId = id;
  applyKitToBus();
}

export function getCurrentDrumKitId(): DrumKitId {
  return currentKitId;
}

function voiceTag(id: DrumSoundId): string {
  return `drums:${id}`;
}

function triggerHit(
  id: DrumSoundId,
  buffer: AudioBuffer,
  gain: number,
  shortTail = false,
): void {
  const env = HIT_ENVELOPES[id];
  const kitRate = getDrumKit(currentKitId).audio.playbackRate;
  const rate = kitRate * env.rateScale;
  const isBrightCymbal = id === 'crash' || id === 'ride';
  const output = isBrightCymbal ? ensureCymbalTone() : ensureKitBus();

  playSample(buffer, rate, gain, output, voiceTag(id), {
    shortTail,
    attackSeconds: shortTail ? 0.004 : env.attackSeconds,
    holdSeconds: shortTail ? Math.min(0.55, env.holdSeconds) : env.holdSeconds,
    releaseSeconds: shortTail ? 0.4 : env.releaseSeconds,
  });
}

export function playHit(id: DrumSoundId): void {
  const buffer = buffers.get(id);
  if (!buffer) {
    return;
  }

  const context = getSharedAudioContext();
  if (context.state === 'suspended') {
    void context.resume();
  }

  // Closed hat chokes a ringing open hat (real kit behaviour).
  if (id === 'hihatClosed') {
    releaseVoiceByTag(voiceTag('hihatOpen'), 0.04);
  }

  const hitGain = DRUM_HIT_GAINS[id];

  triggerHit(id, buffer, hitGain);

  schedulePianoReverbTaps((gainScale) => {
    triggerHit(id, buffer, hitGain * gainScale, true);
  });

  schedulePianoEchoRepeats((gainScale) => {
    triggerHit(id, buffer, hitGain * gainScale);
  });
}

export function releaseDrumsEngine(): void {
  stopAllVoices();
  kitGain = null;
  kitFilter = null;
  cymbalTone = null;
  initialized = false;
}
