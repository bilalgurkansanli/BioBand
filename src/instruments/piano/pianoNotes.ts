export type NoteId =
  | 'C4'
  | 'Db4'
  | 'D4'
  | 'Eb4'
  | 'E4'
  | 'F4'
  | 'Gb4'
  | 'G4'
  | 'Ab4'
  | 'A4'
  | 'Bb4'
  | 'B4'
  | 'C5'
  | 'Db5'
  | 'D5'
  | 'Eb5'
  | 'E5'
  | 'F5'
  | 'Gb5'
  | 'G5'
  | 'Ab5'
  | 'A5'
  | 'Bb5'
  | 'B5';

const SOLFEGE_BY_PITCH: Record<string, string> = {
  C: 'Do',
  Db: 'Di',
  D: 'Re',
  Eb: 'Ri',
  E: 'Mi',
  F: 'Fa',
  Gb: 'Fi',
  G: 'Sol',
  Ab: 'Le',
  A: 'La',
  Bb: 'Li',
  B: 'Si',
};

function getSolfegeLabel(noteId: NoteId): string {
  const pitch = noteId.replace(/\d+$/, '');
  return SOLFEGE_BY_PITCH[pitch] ?? pitch;
}

export type PianoNote = {
  id: NoteId;
  label: string;
  solfegeLabel: string;
  midi: number;
  isBlackKey: boolean;
  /** Index among white keys; only set for black keys (position between whites). */
  blackKeyAfterWhite?: number;
};

function createNote(
  id: NoteId,
  label: string,
  midi: number,
  isBlackKey: boolean,
  blackKeyAfterWhite?: number,
): PianoNote {
  return {
    id,
    label,
    solfegeLabel: getSolfegeLabel(id),
    midi,
    isBlackKey,
    blackKeyAfterWhite,
  };
}

export const PIANO_NOTES: PianoNote[] = [
  createNote('C4', 'C', 60, false),
  createNote('Db4', 'D♭', 61, true, 0),
  createNote('D4', 'D', 62, false),
  createNote('Eb4', 'E♭', 63, true, 1),
  createNote('E4', 'E', 64, false),
  createNote('F4', 'F', 65, false),
  createNote('Gb4', 'G♭', 66, true, 3),
  createNote('G4', 'G', 67, false),
  createNote('Ab4', 'A♭', 68, true, 4),
  createNote('A4', 'A', 69, false),
  createNote('Bb4', 'B♭', 70, true, 5),
  createNote('B4', 'B', 71, false),
  createNote('C5', 'C', 72, false),
  createNote('Db5', 'D♭', 73, true, 7),
  createNote('D5', 'D', 74, false),
  createNote('Eb5', 'E♭', 75, true, 8),
  createNote('E5', 'E', 76, false),
  createNote('F5', 'F', 77, false),
  createNote('Gb5', 'G♭', 78, true, 10),
  createNote('G5', 'G', 79, false),
  createNote('Ab5', 'A♭', 80, true, 11),
  createNote('A5', 'A', 81, false),
  createNote('Bb5', 'B♭', 82, true, 12),
  createNote('B5', 'B', 83, false),
];

export const WHITE_PIANO_NOTES = PIANO_NOTES.filter((note) => !note.isBlackKey);

export const BLACK_PIANO_NOTES = PIANO_NOTES.filter((note) => note.isBlackKey);
