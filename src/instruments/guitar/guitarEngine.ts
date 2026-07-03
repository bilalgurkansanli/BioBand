import {
  createSamplePool,
  playFromPool,
  prepareSamplePlayback,
  releaseSamplePools,
  type SamplePool,
} from '../../audio/samplePool';
import type { ChordId } from './guitarChords';
import { GUITAR_CHORDS, getChordStringNotes } from './guitarChords';
import {
  GUITAR_STRINGS,
  STRING_SAMPLE_FILES,
  getStringPlaybackRate,
  type GuitarStringId,
} from './guitarSounds';

const STRUM_STAGGER_MS = 18;
const VOICES_PER_STRING = 6;

const pools = new Map<GuitarStringId, SamplePool>();
const strumTimers: ReturnType<typeof setTimeout>[] = [];
let initialized = false;

export async function initGuitarEngine(): Promise<void> {
  if (initialized && pools.size === GUITAR_STRINGS.length) {
    return;
  }

  releaseGuitarEngine();
  await prepareSamplePlayback();

  for (const string of GUITAR_STRINGS) {
    pools.set(string.id, createSamplePool(STRING_SAMPLE_FILES[string.id], VOICES_PER_STRING));
  }

  initialized = true;
}

export function pluckString(stringId: GuitarStringId, midi?: number): void {
  const pool = pools.get(stringId);
  const openMidi = GUITAR_STRINGS.find((s) => s.id === stringId)?.openMidi ?? 64;
  if (!pool) {
    return;
  }

  const targetMidi = midi ?? openMidi;
  playFromPool(pool, { playbackRate: getStringPlaybackRate(stringId, targetMidi) });
}

export function strumChord(chordId: ChordId, direction: 'down' | 'up' = 'down'): void {
  const chord = GUITAR_CHORDS.find((c) => c.id === chordId);
  if (!chord) {
    return;
  }

  let notes = getChordStringNotes(chord);
  if (direction === 'up') {
    notes = [...notes].reverse();
  }

  for (let i = 0; i < notes.length; i++) {
    const { stringId, midi } = notes[i];
    const timer = setTimeout(() => {
      pluckString(stringId, midi);
    }, i * STRUM_STAGGER_MS);
    strumTimers.push(timer);
  }
}

export function releaseGuitarEngine(): void {
  for (const timer of strumTimers) {
    clearTimeout(timer);
  }
  strumTimers.length = 0;

  releaseSamplePools(pools.values());
  pools.clear();
  initialized = false;
}
