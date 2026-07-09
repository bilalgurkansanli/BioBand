import type { AudioBuffer } from '../../audio/audioApi';

import {
  loadSample,
  playSample,
  prepareSamplePlayback,
  stopAllVoices,
} from '../../audio/sampleBank';
import type { ChordId } from './guitarChords';
import { GUITAR_CHORDS, getChordStringNotes } from './guitarChords';
import {
  GUITAR_STRINGS,
  STRING_SAMPLE_FILES,
  getStringPlaybackRate,
  type GuitarStringId,
} from './guitarSounds';

const STRUM_STAGGER_MS = 18;
const STRING_GAIN = 0.55;

const buffers = new Map<GuitarStringId, AudioBuffer>();
const strumTimers: ReturnType<typeof setTimeout>[] = [];
let initialized = false;

export async function initGuitarEngine(): Promise<void> {
  if (initialized) {
    return;
  }

  await prepareSamplePlayback();

  await Promise.all(
    GUITAR_STRINGS.map(async (string) => {
      const buffer = await loadSample(STRING_SAMPLE_FILES[string.id]);
      buffers.set(string.id, buffer);
    }),
  );

  initialized = true;
}

export function pluckString(stringId: GuitarStringId, midi?: number): void {
  const buffer = buffers.get(stringId);
  const openMidi = GUITAR_STRINGS.find((s) => s.id === stringId)?.openMidi ?? 64;
  if (!buffer) {
    return;
  }

  const targetMidi = midi ?? openMidi;
  playSample(
    buffer,
    getStringPlaybackRate(stringId, targetMidi),
    STRING_GAIN,
    undefined,
    `guitar:${stringId}`,
  );
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
  stopAllVoices();
  initialized = false;
}
