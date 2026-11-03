import type { AudioBuffer, GainNode } from '../../audio/audioApi';

import {
  getSharedAudioContext,
  loadSample,
  playSample,
  prepareSamplePlayback,
  releaseVoicesByTagPrefix,
  resumeAudioContextIfSuspended,
  stopVoicesByTagPrefix,
} from '../../audio/sampleBank';
import {
  clearPianoFxTimersFor,
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
import type { NotePerformance } from '../shared/songPerformance';

type BiquadFilterNode = ReturnType<
  ReturnType<typeof getSharedAudioContext>['createBiquadFilter']
>;

const buffers = new Map<DrumSoundId, AudioBuffer>();
/** Per-kit replacement buffers (e.g. the electronic kit's 808 one-shots). */
const kitBuffers = new Map<DrumKitId, Map<DrumSoundId, AudioBuffer>>();
let initialized = false;
let initPromise: Promise<void> | null = null;
let currentKitId: DrumKitId = 'acoustic';

/**
 * One bus per kit (gain → EQ → FX input), built the first time that kit
 * plays. A single shared bus could only wear one kit's EQ at a time, so a
 * Studio mix had to force every drums track onto the first track's kit — and
 * an overdub's beds switched the kit under the user's own fingers.
 */
type KitBus = {
  gain: GainNode;
  filter: BiquadFilterNode;
  /** Softens crash / ride highs before they hit the kit bus. */
  cymbalTone: BiquadFilterNode | null;
};
const kitBuses = new Map<DrumKitId, KitBus>();

const SOUND_IDS = Object.keys(DRUM_SOUND_FILES) as DrumSoundId[];
/** Names this engine's pending echo/reverb re-triggers in the shared FX bus. */
const DRUMS_OWNER = 'drums';

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

function applyKitToBus(bus: KitBus, kitId: DrumKitId): void {
  const audio = getDrumKit(kitId).audio;
  bus.gain.gain.value = audio.gainScale;
  bus.filter.type = audio.filterType;
  bus.filter.frequency.value = audio.filterFrequency;
  bus.filter.Q.value = audio.filterQ;
  // Acoustic uses peaking at unity — leave gain at 0 dB.
  if (audio.filterType === 'peaking' || audio.filterType === 'lowshelf') {
    bus.filter.gain.value = audio.filterType === 'lowshelf' ? 5 : 0;
  } else {
    bus.filter.gain.value = 0;
  }
}

function ensureKitBus(kitId: DrumKitId = currentKitId): KitBus {
  const existing = kitBuses.get(kitId);
  if (existing) {
    return existing;
  }
  const context = getSharedAudioContext();
  const bus: KitBus = {
    gain: context.createGain(),
    filter: context.createBiquadFilter(),
    cymbalTone: null,
  };
  bus.gain.connect(bus.filter);
  bus.filter.connect(getPianoFxInput());
  applyKitToBus(bus, kitId);
  kitBuses.set(kitId, bus);
  return bus;
}

function ensureCymbalTone(kitId: DrumKitId = currentKitId): BiquadFilterNode {
  const bus = ensureKitBus(kitId);
  if (bus.cymbalTone) {
    return bus.cymbalTone;
  }
  const context = getSharedAudioContext();
  // Gentle top-end rounding; keep the crash sizzle (~6-13 kHz) intact.
  const cymbalTone = context.createBiquadFilter();
  cymbalTone.type = 'lowpass';
  cymbalTone.frequency.value = 10500;
  cymbalTone.Q.value = 0.55;
  cymbalTone.connect(bus.gain);
  bus.cymbalTone = cymbalTone;
  return cymbalTone;
}

export async function initDrumsEngine(): Promise<void> {
  if (initialized) {
    return;
  }
  // `initialized` only flips after the decode, so callers arriving during it
  // would each run the whole load — share the one in flight instead.
  if (!initPromise) {
    initPromise = loadDrumsEngine().finally(() => {
      initPromise = null;
    });
  }
  await initPromise;
}

async function loadDrumsEngine(): Promise<void> {
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

/** The kit hand-played hits use. Every kit keeps its own bus, so nothing to re-tune. */
export function setDrumKit(id: DrumKitId): void {
  currentKitId = id;
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
  kitId: DrumKitId,
  shortTail = false,
  /** Absolute context time to sound at (song playback). */
  startAtSeconds?: number,
): void {
  const env = HIT_ENVELOPES[id];
  const kitRate = getDrumKit(kitId).audio.playbackRate;
  const rate = kitRate * env.rateScale;
  const isBrightCymbal = id === 'crash' || id === 'ride';
  const output = isBrightCymbal ? ensureCymbalTone(kitId) : ensureKitBus(kitId).gain;

  playSample(buffer, rate, gain, output, tag, {
    shortTail,
    attackSeconds: shortTail ? 0.004 : env.attackSeconds,
    holdSeconds: shortTail ? Math.min(0.55, env.holdSeconds) : env.holdSeconds,
    releaseSeconds: shortTail ? 0.4 : env.releaseSeconds,
    startAtSeconds,
  });
}

/**
 * @param velocity 0..1 hit strength (touch position on the pad). Scales the
 * gain from a soft ghost note (~1/3 level) up to the full pad gain.
 * @param gainScale Extra output multiplier independent of velocity — used by
 * Studio mix playback to apply a track's volume fader.
 * @param performance Song playback supplies the moment the hit must sound and
 * how hard it is struck; its strength drives the same velocity curve as a
 * finger, never a second gain on top. A struck drum has no written length —
 * the sample rings for as long as the kit says. Interactive taps omit it and
 * keep the immediate behaviour.
 * @param kitId Kit to sound with — a saved take or Studio track replays on
 * its own kit. Defaults to the kit selected for hand-played hits.
 */
export function playHit(
  id: DrumSoundId,
  velocity = 1,
  gainScale = 1,
  performance?: NotePerformance,
  kitId: DrumKitId = currentKitId,
): void {
  const buffer = kitBuffers.get(kitId)?.get(id) ?? buffers.get(id);
  if (!buffer) {
    return;
  }

  resumeAudioContextIfSuspended();

  // Closed hat chokes a ringing open hat (real kit behaviour) — including
  // the open hat's pending reverb/echo tails. The choke lands now even for a
  // hit placed ahead of the clock: releasing by tag has no scheduled form, and
  // the lookahead is far shorter than the open hat's tail.
  if (id === 'hihatClosed') {
    releaseVoicesByTagPrefix(padTagPrefix('hihatOpen'), 0.04);
  }

  const clampedVelocity = Math.max(
    0.1,
    Math.min(1, performance?.velocity ?? velocity),
  );
  const hitGain = DRUM_HIT_GAINS[id] * (0.35 + 0.65 * clampedVelocity) * gainScale;
  const baseTag = `${padTagPrefix(id)}#${hitSerial++}`;

  const atTime = performance?.atTime;
  const aheadOfClock = atTime !== undefined;
  const tapStart = (delayMs: number): number | undefined =>
    atTime === undefined ? undefined : atTime + delayMs / 1000;

  triggerHit(id, buffer, hitGain, baseTag, kitId, false, atTime);

  schedulePianoReverbTaps((tapScale, tapIndex, delayMs) => {
    triggerHit(
      id,
      buffer,
      hitGain * tapScale,
      `${baseTag}:reverb:${tapIndex}`,
      kitId,
      true,
      tapStart(delayMs),
    );
  }, aheadOfClock, DRUMS_OWNER);

  let echoIndex = 0;
  schedulePianoEchoRepeats((tapScale, delayMs) => {
    triggerHit(
      id,
      buffer,
      hitGain * tapScale,
      `${baseTag}:echo:${echoIndex++}`,
      kitId,
      false,
      tapStart(delayMs),
    );
  }, aheadOfClock, DRUMS_OWNER);
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
  // Only the kit's own sound — other instruments may still be playing.
  clearPianoFxTimersFor(DRUMS_OWNER);
  stopVoicesByTagPrefix(['drums:']);
  // Detach the bus chain before dropping the refs — otherwise every
  // focus/blur cycle leaves an orphaned gain→filter chain on the FX input.
  for (const bus of kitBuses.values()) {
    disconnectSafe(bus.cymbalTone);
    disconnectSafe(bus.gain);
    disconnectSafe(bus.filter);
  }
  kitBuses.clear();
  initialized = false;
}
