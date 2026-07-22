import { loadSample } from '../sampleBank';
import type { DrySampleEvent } from '../offlineBounce';
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

/** Dry (no reverb/echo) resolution of recorded drum-hit events into schedulable samples. */
export async function resolveDrumsDryEvents(
  events: InstrumentEvent[],
  drumKitId?: string,
): Promise<{ sampleEvents: DrySampleEvent[]; oscillatorEvents: [] }> {
  const kitId = isDrumKitId(drumKitId) ? drumKitId : 'acoustic';
  const kit = getDrumKit(kitId);
  const sampleEvents: DrySampleEvent[] = [];

  for (const event of events) {
    const soundId = event.soundId as DrumSoundId;
    const source = KIT_SOUND_OVERRIDES[kitId]?.[soundId] ?? DRUM_SOUND_FILES[soundId];
    if (source === undefined) {
      continue;
    }
    const buffer = await loadSample(source);
    const gain =
      (DRUM_HIT_GAINS[soundId] ?? 1) * (0.35 + 0.65 * clampVelocity(event.velocity)) * kit.audio.gainScale;
    sampleEvents.push({
      atMs: event.atMs,
      buffer,
      playbackRate: kit.audio.playbackRate,
      gain,
    });
  }

  return { sampleEvents, oscillatorEvents: [] };
}
