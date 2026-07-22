import type { AudioBuffer, GainNode } from '../../audio/audioApi';

import {
  getSharedAudioContext,
  loadSample,
  playSample,
  prepareSamplePlayback,
  releaseVoicesByTagPrefix,
  stopAllVoices,
} from '../../audio/sampleBank';
import {
  getPianoFxInput,
  schedulePianoEchoRepeats,
  schedulePianoReverbTaps,
} from '../piano/pianoFx';
import { getDrumKit, type DrumKitId } from './drumsKits';
import {
  DRUM_HIT_GAINS,
  DRUM_SOUND_FILES,
  KIT_SOUND_OVERRIDES,
  type DrumSoundId,
} from './drumsSounds';

type BiquadFilterNode = ReturnType<
  ReturnType<typeof getSharedAudioContext>['createBiquadFilter']
>;

const buffers = new Map<DrumSoundId, AudioBuffer>();
/** Per-kit replacement buffers (e.g. the electronic kit's 808 one-shots). */
const kitBuffers = new Map<DrumKitId, Map<DrumSoundId, AudioBuffer>>();
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
  // Crash sample is ~2.4s — short musical ring, fade before it overstays.
  crash: { attackSeconds: 0.004, holdSeconds: 0.55, releaseSeconds: 0.75, rateScale: 1 },
  ride: { attackSeconds: 0.004, holdSeconds: 1.1, releaseSeconds: 0.9, rateScale: 1 },
  hihatClosed: { attackSeconds: 0.001, holdSeconds: 0.12, releaseSeconds: 0.1, rateScale: 1 },
  hihatOpen: { attackSeconds: 0.002, holdSeconds: 0.55, releaseSeconds: 0.45, rateScale: 1 },
  kick: { attackSeconds: 0.001, holdSeconds: 0.75, releaseSeconds: 0.5, rateScale: 1 },
  snare: { attackSeconds: 0.001, holdSeconds: 0.35, releaseSeconds: 0.25, rateScale: 1 },
  snareRim: { attackSeconds: 0.001, holdSeconds: 0.12, releaseSeconds: 0.1, rateScale: 1 },
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
  // Gentle top-end rounding; keep the crash sizzle (~6-13 kHz) intact.
  cymbalTone = context.createBiquadFilter();
  cymbalTone.type = 'lowpass';
  cymbalTone.frequency.value = 10500;
  cymbalTone.Q.value = 0.55;
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

  await Promise.all(
    (Object.keys(KIT_SOUND_OVERRIDES) as DrumKitId[]).map(async (kitId) => {
      const overrides = KIT_SOUND_OVERRIDES[kitId];
      if (!overrides) {
        return;
      }
      const kitMap = kitBuffers.get(kitId) ?? new Map<DrumSoundId, AudioBuffer>();
      kitBuffers.set(kitId, kitMap);
      await Promise.all(
        (Object.entries(overrides) as [DrumSoundId, number][]).map(
          async ([id, source]) => {
            kitMap.set(id, await loadSample(source));
          },
        ),
      );
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

/**
 * Every trigger gets a unique tag so hits never steal each other (two crash
 * hits ring together, rolls keep their body). FX taps append ":reverb:N" /
 * ":echo:N" — a distinct tag from the dry hit, so a tap never chokes the dry
 * sound, and the ":reverb" marker opts taps into preferred voice-stealing.
 * The stable "drums:<pad>" prefix is what the hi-hat choke matches on.
 */
let hitSerial = 0;

function padTagPrefix(id: DrumSoundId): string {
  return `drums:${id}`;
}

function triggerHit(
  id: DrumSoundId,
  buffer: AudioBuffer,
  gain: number,
  tag: string,
  shortTail = false,
): void {
  const env = HIT_ENVELOPES[id];
  const kitRate = getDrumKit(currentKitId).audio.playbackRate;
  const rate = kitRate * env.rateScale;
  const isBrightCymbal = id === 'crash' || id === 'ride';
  const output = isBrightCymbal ? ensureCymbalTone() : ensureKitBus();

  playSample(buffer, rate, gain, output, tag, {
    shortTail,
    attackSeconds: shortTail ? 0.004 : env.attackSeconds,
    holdSeconds: shortTail ? Math.min(0.55, env.holdSeconds) : env.holdSeconds,
    releaseSeconds: shortTail ? 0.4 : env.releaseSeconds,
  });
}

/**
 * @param velocity 0..1 hit strength (touch position on the pad). Scales the
 * gain from a soft ghost note (~1/3 level) up to the full pad gain.
 * @param gainScale Extra output multiplier independent of velocity — used by
 * Studio mix playback to apply a track's volume fader.
 */
export function playHit(id: DrumSoundId, velocity = 1, gainScale = 1): void {
  const buffer = kitBuffers.get(currentKitId)?.get(id) ?? buffers.get(id);
  if (!buffer) {
    return;
  }

  const context = getSharedAudioContext();
  if (context.state === 'suspended') {
    void context.resume();
  }

  // Closed hat chokes a ringing open hat (real kit behaviour) — including
  // the open hat's pending reverb/echo tails.
  if (id === 'hihatClosed') {
    releaseVoicesByTagPrefix(padTagPrefix('hihatOpen'), 0.04);
  }

  const clampedVelocity = Math.max(0.1, Math.min(1, velocity));
  const hitGain = DRUM_HIT_GAINS[id] * (0.35 + 0.65 * clampedVelocity) * gainScale;
  const baseTag = `${padTagPrefix(id)}#${hitSerial++}`;

  triggerHit(id, buffer, hitGain, baseTag);

  schedulePianoReverbTaps((tapScale, tapIndex) => {
    triggerHit(id, buffer, hitGain * tapScale, `${baseTag}:reverb:${tapIndex}`, true);
  });

  let echoIndex = 0;
  schedulePianoEchoRepeats((tapScale) => {
    triggerHit(id, buffer, hitGain * tapScale, `${baseTag}:echo:${echoIndex++}`);
  });
}

/**
 * Grab-choke: fade every ringing voice of a pad (crash/ride/open-hat grab).
 */
export function chokePad(id: DrumSoundId, fadeSeconds = 0.08): void {
  releaseVoicesByTagPrefix(padTagPrefix(id), fadeSeconds);
}

function disconnectSafe(node: { disconnect: () => void } | null): void {
  if (!node) {
    return;
  }
  try {
    node.disconnect();
  } catch {
    // Already disconnected.
  }
}

export function releaseDrumsEngine(): void {
  stopAllVoices();
  // Detach the bus chain before dropping the refs — otherwise every
  // focus/blur cycle leaves an orphaned gain→filter chain on the FX input.
  disconnectSafe(cymbalTone);
  disconnectSafe(kitGain);
  disconnectSafe(kitFilter);
  kitGain = null;
  kitFilter = null;
  cymbalTone = null;
  initialized = false;
}
