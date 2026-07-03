import type { GuitarStringId } from './guitarSounds';

export type ChordId = 'Em' | 'G' | 'C' | 'D' | 'Am' | 'E';

export type ChordDefinition = {
  id: ChordId;
  labelKey: string;
  /** MIDI per string s6→s1; null = muted */
  notes: (number | null)[];
};

const STRING_ORDER: GuitarStringId[] = ['s6', 's5', 's4', 's3', 's2', 's1'];

export const GUITAR_CHORDS: ChordDefinition[] = [
  { id: 'Em', labelKey: 'guitar.chords.Em', notes: [40, null, 52, 55, 59, 64] },
  { id: 'G', labelKey: 'guitar.chords.G', notes: [43, 47, 50, 55, 59, 67] },
  { id: 'C', labelKey: 'guitar.chords.C', notes: [null, 48, 52, 55, 60, 64] },
  { id: 'D', labelKey: 'guitar.chords.D', notes: [null, null, 50, 57, 62, 66] },
  { id: 'Am', labelKey: 'guitar.chords.Am', notes: [null, 45, 52, 57, 60, 64] },
  { id: 'E', labelKey: 'guitar.chords.E', notes: [40, 47, 52, 56, 59, 64] },
];

export function getChordStringNotes(
  chord: ChordDefinition,
): { stringId: GuitarStringId; midi: number }[] {
  const result: { stringId: GuitarStringId; midi: number }[] = [];

  for (let i = 0; i < STRING_ORDER.length; i++) {
    const midi = chord.notes[i];
    if (midi !== null) {
      result.push({ stringId: STRING_ORDER[i], midi });
    }
  }

  return result;
}
