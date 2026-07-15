import type { ChordId } from './guitarChords';

// Nylon-style pluck samples — one per open string, repitched for fretted notes.

export type GuitarStringId = 's1' | 's2' | 's3' | 's4' | 's5' | 's6';

/** Open (0) through fret 12 inclusive. */
export const GUITAR_MAX_FRET = 12;

export const GUITAR_STRINGS: { id: GuitarStringId; openMidi: number; label: string }[] = [
  { id: 's6', openMidi: 40, label: 'E' },
  { id: 's5', openMidi: 45, label: 'A' },
  { id: 's4', openMidi: 50, label: 'D' },
  { id: 's3', openMidi: 55, label: 'G' },
  { id: 's2', openMidi: 59, label: 'B' },
  { id: 's1', openMidi: 64, label: 'e' },
];

export const STRING_SAMPLE_FILES: Record<GuitarStringId, number> = {
  s6: require('../../../assets/samples/guitar/s6_E2.mp3'),
  s5: require('../../../assets/samples/guitar/s5_A2.mp3'),
  s4: require('../../../assets/samples/guitar/s4_D3.mp3'),
  s3: require('../../../assets/samples/guitar/s3_G3.mp3'),
  s2: require('../../../assets/samples/guitar/s2_B3.mp3'),
  s1: require('../../../assets/samples/guitar/s1_E4.mp3'),
};

export function getOpenMidi(stringId: GuitarStringId): number {
  return GUITAR_STRINGS.find((s) => s.id === stringId)?.openMidi ?? 64;
}

export function getStringPlaybackRate(stringId: GuitarStringId, midi: number): number {
  const openMidi = getOpenMidi(stringId);
  return 2 ** ((midi - openMidi) / 12);
}

export function midiToFret(stringId: GuitarStringId, midi: number): number {
  return Math.max(0, Math.min(GUITAR_MAX_FRET, midi - getOpenMidi(stringId)));
}

export function fretToMidi(stringId: GuitarStringId, fret: number): number {
  return getOpenMidi(stringId) + Math.max(0, Math.min(GUITAR_MAX_FRET, fret));
}

/** Recording / play-along id: `s3:f5` */
export function formatPluckSoundId(stringId: GuitarStringId, fret: number): string {
  const clamped = Math.max(0, Math.min(GUITAR_MAX_FRET, Math.round(fret)));
  return `${stringId}:f${clamped}`;
}

export function formatChordSoundId(chordId: ChordId): string {
  return `chord:${chordId}`;
}

export type ParsedGuitarSound =
  | { kind: 'pluck'; stringId: GuitarStringId; fret: number }
  | { kind: 'chord'; chordId: ChordId };

const STRING_IDS = new Set<string>(GUITAR_STRINGS.map((s) => s.id));

export function parseGuitarSoundId(soundId: string): ParsedGuitarSound | null {
  if (soundId.startsWith('chord:')) {
    const chordId = soundId.slice('chord:'.length) as ChordId;
    return { kind: 'chord', chordId };
  }

  // Fretted: s3:f5
  const frettedMatch = soundId.match(/^(s[1-6]):f(\d{1,2})$/);
  if (frettedMatch) {
    const stringId = frettedMatch[1] as GuitarStringId;
    const fret = Number(frettedMatch[2]);
    if (!STRING_IDS.has(stringId) || !Number.isFinite(fret)) {
      return null;
    }
    return {
      kind: 'pluck',
      stringId,
      fret: Math.max(0, Math.min(GUITAR_MAX_FRET, fret)),
    };
  }

  // Legacy open-string id: s3
  if (STRING_IDS.has(soundId)) {
    return { kind: 'pluck', stringId: soundId as GuitarStringId, fret: 0 };
  }

  return null;
}
