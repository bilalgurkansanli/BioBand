import { getSharedAudioContext, loadSample } from '../sampleBank';
import type { DryFilter, DrySampleEvent } from '../offlineBounce';
import { getPadBank, getPadSlot, isPadBankId } from '../../instruments/pads/padsBanks';
import { PAD_SYNTH_FILES } from '../../instruments/pads/padsSynth';
import { TURKISH_PERC_FILES } from '../../instruments/pads/padsTurkish';
import { getNoteSampleConfig, BASE_SAMPLE_FILES } from '../../instruments/piano/pianoSamples';
import type { PadSoundId } from '../../instruments/pads/padsSounds';
import type { InstrumentEvent } from '../../types/recording';

function velocityGainScale(velocity?: number): number {
  const clamped = Math.max(0.1, Math.min(1, velocity ?? 1));
  return 0.35 + 0.65 * clamped;
}

const userBufferCache = new Map<string, Promise<import('../audioApi').AudioBuffer>>();

function loadUserBuffer(uri: string) {
  const cached = userBufferCache.get(uri);
  if (cached) {
    return cached;
  }
  const loading = getSharedAudioContext().decodeAudioData(uri);
  userBufferCache.set(uri, loading);
  return loading;
}

/** Dry (no reverb/echo) resolution of recorded pad-hit events into schedulable samples. */
export async function resolvePadsDryEvents(
  events: InstrumentEvent[],
  padBankId?: string,
): Promise<{ sampleEvents: DrySampleEvent[]; oscillatorEvents: [] }> {
  const bankId = isPadBankId(padBankId) ? padBankId : 'drums';
  const bank = getPadBank(bankId);
  const bankFilter: DryFilter = {
    type: bank.audio.filterType,
    frequency: bank.audio.filterFrequency,
    q: bank.audio.filterQ,
    gainDb:
      bank.audio.filterType === 'lowshelf' ? 5 : bank.audio.filterType === 'peaking' ? 0 : undefined,
  };
  const sampleEvents: DrySampleEvent[] = [];

  for (const event of events) {
    const slot = getPadSlot(bankId, event.soundId as PadSoundId);
    let buffer: import('../audioApi').AudioBuffer | null = null;
    let baseRate = 1;

    switch (slot.source.kind) {
      case 'file':
        buffer = await loadSample(slot.source.module);
        break;
      case 'synth':
        buffer = await loadSample(PAD_SYNTH_FILES[slot.source.voice]);
        break;
      case 'turkish':
        buffer = await loadSample(TURKISH_PERC_FILES[slot.source.voice]);
        break;
      case 'user':
        buffer = await loadUserBuffer(slot.source.uri);
        break;
      case 'piano': {
        const config = getNoteSampleConfig(slot.source.midi);
        buffer = await loadSample(BASE_SAMPLE_FILES[config.anchorId]);
        baseRate = config.playbackRate;
        break;
      }
    }

    if (!buffer) {
      continue;
    }

    const rate = bank.audio.playbackRate * slot.envelope.rateScale * baseRate;
    const gain = slot.gain * velocityGainScale(event.velocity);
    sampleEvents.push({
      atMs: event.atMs,
      buffer,
      playbackRate: rate,
      gain,
      attackSeconds: slot.envelope.attackSeconds,
      holdSeconds: slot.envelope.holdSeconds,
      releaseSeconds: slot.envelope.releaseSeconds,
      filters: [bankFilter],
    });
  }

  return { sampleEvents, oscillatorEvents: [] };
}
