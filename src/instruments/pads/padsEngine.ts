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
import { getNoteSampleConfig } from '../piano/pianoSamples';
import { loadCustomPadSlots } from '../../storage/padsCustomBankStorage';
import {
  collectBankFileModules,
  collectBankUserUris,
  getPadBank,
  getPadSlot,
  PAD_BANKS,
  setCustomPadSlots,
  type PadBankId,
  type PadChokeGroup,
  type PadSlotDef,
} from './padsBanks';
import type { PadSoundId } from './padsSounds';
import { PAD_SYNTH_FILES } from './padsSynth';
import { TURKISH_PERC_FILES } from './padsTurkish';
import type { NotePerformance } from '../shared/songPerformance';

type BiquadFilterNode = ReturnType<
  ReturnType<typeof getSharedAudioContext>['createBiquadFilter']
>;

const fileBuffers = new Map<number, AudioBuffer>();
const pianoBuffers = new Map<number, AudioBuffer>();
const userBuffers = new Map<string, AudioBuffer>();
let initialized = false;
let initPromise: Promise<void> | null = null;
let currentBankId: PadBankId = 'drums';

let bankGain: GainNode | null = null;
let bankFilter: BiquadFilterNode | null = null;
let perfFilter: BiquadFilterNode | null = null;
let brightTone: BiquadFilterNode | null = null;

/**
 * XY surface neutral position = wide-open lowpass, gentle Q. Neutral must sit
 * AT the touchable max, not past it — otherwise releasing from the brightest
 * corner audibly overshoots brighter than anything reachable while dragging.
 */
const PERF_FILTER_MIN_HZ = 150;
const PERF_FILTER_MAX_HZ = 16000;
const PERF_FILTER_NEUTRAL_HZ = PERF_FILTER_MAX_HZ;
const PERF_FILTER_MAX_Q = 7;
const PERF_FILTER_NEUTRAL_Q = 0.7;

function applyBankToBus(): void {
  if (!bankGain || !bankFilter) {
    return;
  }
  const audio = getPadBank(currentBankId).audio;
  bankGain.gain.value = audio.gainScale;
  bankFilter.type = audio.filterType;
  bankFilter.frequency.value = audio.filterFrequency;
  bankFilter.Q.value = audio.filterQ;
  if (audio.filterType === 'peaking' || audio.filterType === 'lowshelf') {
    bankFilter.gain.value = audio.filterType === 'lowshelf' ? 5 : 0;
  } else {
    bankFilter.gain.value = 0;
  }
}

function ensureBankBus(): GainNode {
  if (bankGain && bankFilter && perfFilter) {
    return bankGain;
  }
  const context = getSharedAudioContext();
  bankGain = context.createGain();
  bankFilter = context.createBiquadFilter();
  perfFilter = context.createBiquadFilter();
  perfFilter.type = 'lowpass';
  perfFilter.frequency.value = PERF_FILTER_NEUTRAL_HZ;
  perfFilter.Q.value = PERF_FILTER_NEUTRAL_Q;
  bankGain.connect(bankFilter);
  bankFilter.connect(perfFilter);
  perfFilter.connect(getPianoFxInput());
  applyBankToBus();
  return bankGain;
}

function ensureBrightTone(): GainNode {
  if (brightTone) {
    return brightTone;
  }
  const context = getSharedAudioContext();
  brightTone = context.createBiquadFilter();
  brightTone.type = 'lowpass';
  brightTone.frequency.value = 5800;
  brightTone.Q.value = 0.65;
  brightTone.connect(ensureBankBus());
  return brightTone;
}

/**
 * XY performance surface: x (0..1) sweeps the lowpass cutoff on a log curve,
 * y (0..1) raises the resonance. Pending automation must be cancelled first:
 * the release ramp's events otherwise override plain .value writes forever
 * (the backend keeps the last automation event authoritative).
 */
export function setPadsPerformanceFilter(x: number, y: number): void {
  if (!perfFilter) {
    return;
  }
  const clampedX = Math.max(0, Math.min(1, x));
  const clampedY = Math.max(0, Math.min(1, y));
  const cutoff =
    PERF_FILTER_MIN_HZ * (PERF_FILTER_MAX_HZ / PERF_FILTER_MIN_HZ) ** clampedX;
  const q = PERF_FILTER_NEUTRAL_Q + (PERF_FILTER_MAX_Q - PERF_FILTER_NEUTRAL_Q) * clampedY;
  try {
    const now = getSharedAudioContext().currentTime;
    perfFilter.frequency.cancelScheduledValues(now);
    perfFilter.Q.cancelScheduledValues(now);
    perfFilter.frequency.setValueAtTime(cutoff, now);
    perfFilter.Q.setValueAtTime(q, now);
  } catch {
    perfFilter.frequency.value = cutoff;
    perfFilter.Q.value = q;
  }
}

/** Finger lifted — glide the filter back to neutral so the mix opens up. */
export function releasePadsPerformanceFilter(): void {
  if (!perfFilter) {
    return;
  }
  try {
    const context = getSharedAudioContext();
    const now = context.currentTime;
    perfFilter.frequency.cancelScheduledValues(now);
    perfFilter.Q.cancelScheduledValues(now);
    perfFilter.frequency.setValueAtTime(perfFilter.frequency.value, now);
    perfFilter.Q.setValueAtTime(perfFilter.Q.value, now);
    perfFilter.frequency.linearRampToValueAtTime(PERF_FILTER_NEUTRAL_HZ, now + 0.25);
    perfFilter.Q.linearRampToValueAtTime(PERF_FILTER_NEUTRAL_Q, now + 0.25);
  } catch {
    perfFilter.frequency.value = PERF_FILTER_NEUTRAL_HZ;
    perfFilter.Q.value = PERF_FILTER_NEUTRAL_Q;
  }
}

async function loadFileBuffer(module: number): Promise<AudioBuffer> {
  const cached = fileBuffers.get(module);
  if (cached) {
    return cached;
  }
  const buffer = await loadSample(module);
  fileBuffers.set(module, buffer);
  return buffer;
}

async function loadPianoAnchor(source: number): Promise<AudioBuffer> {
  const cached = pianoBuffers.get(source);
  if (cached) {
    return cached;
  }
  const buffer = await loadSample(source);
  pianoBuffers.set(source, buffer);
  return buffer;
}

/**
 * Decode a user-recorded sample (file URI) into the cache.
 * Throws if the platform decoder cannot read the file.
 */
export async function loadUserPadSample(uri: string): Promise<AudioBuffer> {
  const cached = userBuffers.get(uri);
  if (cached) {
    return cached;
  }
  const buffer = await getSharedAudioContext().decodeAudioData(uri);
  userBuffers.set(uri, buffer);
  return buffer;
}

function resolveSlotSync(
  slot: PadSlotDef,
): { buffer: AudioBuffer; rate: number } | null {
  if (slot.source.kind === 'file') {
    const buffer = fileBuffers.get(slot.source.module);
    return buffer ? { buffer, rate: 1 } : null;
  }
  if (slot.source.kind === 'synth') {
    const buffer = fileBuffers.get(PAD_SYNTH_FILES[slot.source.voice]);
    return buffer ? { buffer, rate: 1 } : null;
  }
  if (slot.source.kind === 'turkish') {
    const buffer = fileBuffers.get(TURKISH_PERC_FILES[slot.source.voice]);
    return buffer ? { buffer, rate: 1 } : null;
  }
  if (slot.source.kind === 'user') {
    const buffer = userBuffers.get(slot.source.uri);
    return buffer ? { buffer, rate: 1 } : null;
  }
  const config = getNoteSampleConfig(slot.source.midi);
  const buffer = pianoBuffers.get(config.source);
  return buffer ? { buffer, rate: config.playbackRate } : null;
}

async function warmBank(bankId: PadBankId): Promise<void> {
  const bank = getPadBank(bankId);
  await Promise.all(collectBankFileModules(bank).map((module) => loadFileBuffer(module)));

  await Promise.all(
    collectBankUserUris(bank).map(async (uri) => {
      try {
        await loadUserPadSample(uri);
      } catch {
        // Missing/corrupt user recording — its pad stays silent, the rest of
        // the bank still works.
      }
    }),
  );

  await Promise.all(
    bank.slots
      .filter((slot) => slot.source.kind === 'piano')
      .map(async (slot) => {
        if (slot.source.kind !== 'piano') {
          return;
        }
        const config = getNoteSampleConfig(slot.source.midi);
        await loadPianoAnchor(config.source);
      }),
  );
}

/**
 * The custom bank's slots live in AsyncStorage; hydrate them into the
 * padsBanks module cache before warming, so playback surfaces that never
 * mount PadsScreen (Recordings, Studio) still play the user's bank —
 * including decoding its mic samples.
 */
let customSlotsHydrated = false;

async function ensureCustomSlotsHydrated(): Promise<void> {
  if (customSlotsHydrated) {
    return;
  }
  const slots = await loadCustomPadSlots();
  setCustomPadSlots(slots);
  customSlotsHydrated = true;
}

export async function initPadsEngine(): Promise<void> {
  if (initialized) {
    return;
  }
  // `initialized` only flips after the decode, so callers arriving during it
  // would each run the whole load — share the one in flight instead.
  if (!initPromise) {
    initPromise = loadPadsEngine().finally(() => {
      initPromise = null;
    });
  }
  await initPromise;
}

async function loadPadsEngine(): Promise<void> {
  await prepareSamplePlayback();
  await ensureCustomSlotsHydrated();
  getPianoFxInput();
  ensureBankBus();
  ensureBrightTone();

  await Promise.all([
    ...PAD_BANKS.map((bank) => warmBank(bank.id)),
    warmBank('custom'),
    ...Object.values(PAD_SYNTH_FILES).map((module) => loadFileBuffer(module)),
  ]);

  initialized = true;
}

/** Re-warm the custom bank after its slots changed (new user samples). */
export async function refreshCustomPadBank(): Promise<void> {
  if (!initialized) {
    return;
  }
  await warmBank('custom');
}

export function setPadBank(id: PadBankId): void {
  currentBankId = id;
  applyBankToBus();
}

export function getCurrentPadBankId(): PadBankId {
  return currentBankId;
}

/**
 * Every trigger gets a unique tag so hits never steal each other (rapid
 * retriggers of one pad layer instead of choking, long FX tails ring out).
 * FX taps append ":reverb:N" / ":echo:N" — distinct from the dry hit, so a
 * tap never silences the dry sound, and the ":reverb" marker opts taps into
 * preferred voice-stealing. The stable "pads:<bank>:<id>" prefix is what the
 * open-hat choke matches on — bank-scoped, so a drums-layer closed hat can
 * never choke another bank's pad04 (melodic note, darbuka slap) when looper
 * layers or studio tracks from several banks play at once.
 */
let hitSerial = 0;

function padTagPrefix(bankId: PadBankId, id: PadSoundId): string {
  return `pads:${bankId}:${id}`;
}

/** Base tags of the most recent hit per custom choke group. */
const chokeGroupTags = new Map<PadChokeGroup, string[]>();

function chokeGroup(group: PadChokeGroup, fadeSeconds = 0.05): void {
  const tags = chokeGroupTags.get(group);
  if (!tags) {
    return;
  }
  for (const tag of tags) {
    releaseVoicesByTagPrefix(tag, fadeSeconds);
  }
  chokeGroupTags.set(group, []);
}

function rememberChokeTag(group: PadChokeGroup, baseTag: string): void {
  const tags = chokeGroupTags.get(group) ?? [];
  tags.push(baseTag);
  // Only the last few hits can still be ringing.
  if (tags.length > 6) {
    tags.splice(0, tags.length - 6);
  }
  chokeGroupTags.set(group, tags);
}

/** Drum-style velocity → gain curve (matches drumsEngine feel). */
function velocityGainScale(velocity: number): number {
  const clamped = Math.max(0.1, Math.min(1, velocity));
  return 0.35 + 0.65 * clamped;
}

/**
 * Song playback places pad hits on the audio clock instead of a JS timer.
 * There is no length here on purpose: a pad's decay belongs to the pad, not to
 * the chart that triggers it.
 */
type HitScheduling = {
  startAtSeconds?: number;
};

function triggerHit(
  bankId: PadBankId,
  slot: PadSlotDef,
  buffer: AudioBuffer,
  baseRate: number,
  gain: number,
  tag: string,
  shortTail = false,
  scheduling?: HitScheduling,
): void {
  const env = slot.envelope;
  const bankRate = getPadBank(bankId).audio.playbackRate;
  const rate = bankRate * env.rateScale * baseRate;
  const output = slot.bright ? ensureBrightTone() : ensureBankBus();

  // A slot's envelope is its voice: a clap is short, a bendir breathes for two
  // seconds. A chart's note spacing is NOT a damper — a struck pad rings for
  // its own decay whether or not the next hit is close behind, exactly as the
  // drum kit does. Clipping to the gap cut the tail off four hits in five and
  // turned the Turkish banks into a row of clicks.
  const heldSeconds = env.holdSeconds;

  playSample(buffer, rate, gain, output, tag, {
    shortTail,
    attackSeconds: shortTail ? 0.004 : env.attackSeconds,
    holdSeconds: shortTail ? Math.min(0.55, env.holdSeconds) : heldSeconds,
    releaseSeconds: shortTail ? 0.4 : env.releaseSeconds,
    startAtSeconds: scheduling?.startAtSeconds,
  });
}

/**
 * Trigger a pad from an explicit bank — looper layers and multi-bank studio
 * tracks play with their own bank's sounds regardless of the UI selection.
 * (The bus EQ profile stays on the current bank — one global bus.)
 *
 * @param performance Song playback supplies the moment the hit must sound, how
 * long it is held and how hard it is struck; its strength drives the same
 * velocity curve as a finger, never a second gain on top. Interactive taps omit
 * it and keep the immediate, fixed-envelope behaviour.
 */
export function triggerPadForBank(
  bankId: PadBankId,
  id: PadSoundId,
  velocity = 1,
  gainScale = 1,
  performance?: NotePerformance,
): void {
  if (!initialized) {
    return;
  }

  const slot = getPadSlot(bankId, id);
  const resolved = resolveSlotSync(slot);
  if (!resolved) {
    return;
  }

  const context = getSharedAudioContext();
  if (context.state === 'suspended') {
    void context.resume();
  }

  // Closed hat chokes a ringing open hat — including its reverb/echo tails.
  // The choke lands now even for a hit placed ahead of the clock: releasing by
  // tag has no scheduled form, and the lookahead is far shorter than the tail.
  if (slot.chokeOpenHat) {
    releaseVoicesByTagPrefix(padTagPrefix(bankId, 'pad04'), 0.04);
  }
  if (slot.chokeGroup) {
    chokeGroup(slot.chokeGroup);
  }

  const { buffer, rate } = resolved;
  const hitGain =
    slot.gain * velocityGainScale(performance?.velocity ?? velocity) * gainScale;
  const baseTag = `${padTagPrefix(bankId, id)}#${hitSerial++}`;

  if (slot.chokeGroup) {
    rememberChokeTag(slot.chokeGroup, baseTag);
  }

  const atTime = performance?.atTime;
  const aheadOfClock = atTime !== undefined;
  const tapStart = (delayMs: number): number | undefined =>
    atTime === undefined ? undefined : atTime + delayMs / 1000;

  triggerHit(bankId, slot, buffer, rate, hitGain, baseTag, false, {
    startAtSeconds: atTime,
  });

  schedulePianoReverbTaps((tapScale, tapIndex, delayMs) => {
    triggerHit(
      bankId,
      slot,
      buffer,
      rate,
      hitGain * tapScale,
      `${baseTag}:reverb:${tapIndex}`,
      true,
      { startAtSeconds: tapStart(delayMs) },
    );
  }, aheadOfClock);

  let echoIndex = 0;
  schedulePianoEchoRepeats((tapScale, delayMs) => {
    triggerHit(
      bankId,
      slot,
      buffer,
      rate,
      hitGain * tapScale,
      `${baseTag}:echo:${echoIndex++}`,
      false,
      { startAtSeconds: tapStart(delayMs) },
    );
  }, aheadOfClock);
}

export function triggerPad(
  id: PadSoundId,
  velocity = 1,
  performance?: NotePerformance,
): void {
  triggerPadForBank(currentBankId, id, velocity, 1, performance);
}

/**
 * Editor preview: decode (if needed) and play a candidate slot without
 * touching the persisted custom bank.
 */
export async function previewPadSlot(slot: PadSlotDef): Promise<boolean> {
  await prepareSamplePlayback();
  if (slot.source.kind === 'user') {
    try {
      await loadUserPadSample(slot.source.uri);
    } catch {
      return false;
    }
  } else if (slot.source.kind === 'piano') {
    const config = getNoteSampleConfig(slot.source.midi);
    await loadPianoAnchor(config.source);
  } else if (slot.source.kind === 'synth') {
    await loadFileBuffer(PAD_SYNTH_FILES[slot.source.voice]);
  } else if (slot.source.kind === 'turkish') {
    await loadFileBuffer(TURKISH_PERC_FILES[slot.source.voice]);
  } else {
    await loadFileBuffer(slot.source.module);
  }

  const resolved = resolveSlotSync(slot);
  if (!resolved) {
    return false;
  }
  ensureBankBus();
  const tag = `pads:preview#${hitSerial++}`;
  triggerHit(currentBankId, slot, resolved.buffer, resolved.rate, slot.gain, tag);
  return true;
}

/** Drop a cached user sample (slot reassigned or recording replaced). */
export function evictUserPadSample(uri: string): void {
  userBuffers.delete(uri);
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

export function releasePadsEngine(): void {
  stopAllVoices();
  // Detach the bus chain before dropping the refs — otherwise every
  // focus/blur cycle leaves an orphaned gain→filter chain on the FX input.
  disconnectSafe(brightTone);
  disconnectSafe(bankGain);
  disconnectSafe(bankFilter);
  disconnectSafe(perfFilter);
  bankGain = null;
  bankFilter = null;
  perfFilter = null;
  brightTone = null;
  chokeGroupTags.clear();
  initialized = false;
}
