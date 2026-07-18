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
import { getNoteSampleConfig } from '../piano/pianoSamples';
import {
  collectBankFileModules,
  getPadBank,
  getPadSlot,
  PAD_BANKS,
  type PadBankId,
  type PadSlotDef,
} from './padsBanks';
import type { PadSoundId } from './padsSounds';
import { PAD_SYNTH_FILES } from './padsSynth';

type BiquadFilterNode = ReturnType<
  ReturnType<typeof getSharedAudioContext>['createBiquadFilter']
>;

const fileBuffers = new Map<number, AudioBuffer>();
const pianoBuffers = new Map<number, AudioBuffer>();
let initialized = false;
let currentBankId: PadBankId = 'drums';

let bankGain: GainNode | null = null;
let bankFilter: BiquadFilterNode | null = null;
let brightTone: BiquadFilterNode | null = null;

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
  if (bankGain && bankFilter) {
    return bankGain;
  }
  const context = getSharedAudioContext();
  bankGain = context.createGain();
  bankFilter = context.createBiquadFilter();
  bankGain.connect(bankFilter);
  bankFilter.connect(getPianoFxInput());
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
  const config = getNoteSampleConfig(slot.source.midi);
  const buffer = pianoBuffers.get(config.source);
  return buffer ? { buffer, rate: config.playbackRate } : null;
}

async function warmBank(bankId: PadBankId): Promise<void> {
  const bank = getPadBank(bankId);
  await Promise.all(collectBankFileModules(bank).map((module) => loadFileBuffer(module)));

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

export async function initPadsEngine(): Promise<void> {
  if (initialized) {
    return;
  }

  await prepareSamplePlayback();
  getPianoFxInput();
  ensureBankBus();
  ensureBrightTone();

  await Promise.all([
    ...PAD_BANKS.map((bank) => warmBank(bank.id)),
    ...Object.values(PAD_SYNTH_FILES).map((module) => loadFileBuffer(module)),
  ]);

  initialized = true;
}

export function setPadBank(id: PadBankId): void {
  currentBankId = id;
  applyBankToBus();
}

export function getCurrentPadBankId(): PadBankId {
  return currentBankId;
}

function voiceTag(id: PadSoundId): string {
  return `pads:${id}`;
}

function triggerHit(
  id: PadSoundId,
  slot: PadSlotDef,
  buffer: AudioBuffer,
  baseRate: number,
  gain: number,
  shortTail = false,
): void {
  const env = slot.envelope;
  const bankRate = getPadBank(currentBankId).audio.playbackRate;
  const rate = bankRate * env.rateScale * baseRate;
  const output = slot.bright ? ensureBrightTone() : ensureBankBus();

  playSample(buffer, rate, gain, output, voiceTag(id), {
    shortTail,
    attackSeconds: shortTail ? 0.004 : env.attackSeconds,
    holdSeconds: shortTail ? Math.min(0.55, env.holdSeconds) : env.holdSeconds,
    releaseSeconds: shortTail ? 0.4 : env.releaseSeconds,
  });
}

export function triggerPad(id: PadSoundId): void {
  if (!initialized) {
    return;
  }

  const slot = getPadSlot(currentBankId, id);
  const resolved = resolveSlotSync(slot);
  if (!resolved) {
    return;
  }

  const context = getSharedAudioContext();
  if (context.state === 'suspended') {
    void context.resume();
  }

  if (slot.chokeOpenHat) {
    releaseVoiceByTag(voiceTag('pad04'), 0.04);
  }

  const { buffer, rate } = resolved;
  const hitGain = slot.gain;

  triggerHit(id, slot, buffer, rate, hitGain);

  schedulePianoReverbTaps((gainScale) => {
    triggerHit(id, slot, buffer, rate, hitGain * gainScale, true);
  });

  schedulePianoEchoRepeats((gainScale) => {
    triggerHit(id, slot, buffer, rate, hitGain * gainScale);
  });
}

export function releasePadsEngine(): void {
  stopAllVoices();
  bankGain = null;
  bankFilter = null;
  brightTone = null;
  initialized = false;
}
