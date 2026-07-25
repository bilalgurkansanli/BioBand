import { loadSample } from '../sampleBank';
import type { DryFilter, DrySampleEvent } from '../offlineBounce';
import {
  DRUM_HIT_GAINS,
  DRUM_SOUND_FILES,
  KIT_SOUND_OVERRIDES,
  type DrumSoundId,
} from '../../instruments/drums/drumsSounds';
import { getDrumKit, isDrumKitId } from '../../instruments/drums/drumsKits';
import type { InstrumentEvent } from '../../types/recording';

function clampVelocity(velocity?: number): number {
  return Math.max(0.1, Math.min(1, velocity ?? 1));
}

type HitEnvelope = {
  attackSeconds: number;
  holdSeconds: number;
  releaseSeconds: number;
  rateScale: number;
};

/** Mirrors drumsEngine.ts's private HIT_ENVELOPES table. */
const HIT_ENVELOPES: Record<DrumSoundId, HitEnvelope> = {
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

/** Mirrors drumsEngine.ts's fixed cymbal-tone rounding filter, chained before the kit EQ. */
const CYMBAL_TONE_FILTER: DryFilter = { type: 'lowpass', frequency: 10500, q: 0.55 };

/** Dry (no reverb/echo) resolution of recorded drum-hit events into schedulable samples. */
export async function resolveDrumsDryEvents(
  events: InstrumentEvent[],
  drumKitId?: string,
): Promise<{ sampleEvents: DrySampleEvent[]; oscillatorEvents: [] }> {
  const kitId = isDrumKitId(drumKitId) ? drumKitId : 'acoustic';
  const kit = getDrumKit(kitId);
  const kitFilter: DryFilter = {
    type: kit.audio.filterType,
    frequency: kit.audio.filterFrequency,
    q: kit.audio.filterQ,
    gainDb:
      kit.audio.filterType === 'lowshelf' ? 5 : kit.audio.filterType === 'peaking' ? 0 : undefined,
  };
  const sampleEvents: DrySampleEvent[] = [];

  for (const event of events) {
    const soundId = event.soundId as DrumSoundId;
    const source = KIT_SOUND_OVERRIDES[kitId]?.[soundId] ?? DRUM_SOUND_FILES[soundId];
    if (source === undefined) {
      continue;
    }
    const buffer = await loadSample(source);
    const env = HIT_ENVELOPES[soundId];
    const isBrightCymbal = soundId === 'crash' || soundId === 'ride';
    const gain =
      (DRUM_HIT_GAINS[soundId] ?? 1) * (0.35 + 0.65 * clampVelocity(event.velocity)) * kit.audio.gainScale;
    sampleEvents.push({
      atMs: event.atMs,
      buffer,
      playbackRate: kit.audio.playbackRate * (env?.rateScale ?? 1),
      gain,
      attackSeconds: env?.attackSeconds,
      holdSeconds: env?.holdSeconds,
      releaseSeconds: env?.releaseSeconds,
      filters: isBrightCymbal ? [CYMBAL_TONE_FILTER, kitFilter] : [kitFilter],
    });
  }

  return { sampleEvents, oscillatorEvents: [] };
}
