import { PIANO_NOTES, type NoteId } from './pianoNotes';

export type PianoScaleId =
  | 'cMajor'
  | 'gMajor'
  | 'dMajor'
  | 'aMinor'
  | 'eMinor'
  | 'cPentatonic';

export type PianoScaleOption = {
  id: PianoScaleId;
  /** i18n key under piano.scale.names.* */
  labelKey: string;
  /** Pitch classes 0=C … 11=B */
  pitchClasses: readonly number[];
};

/** Pitch class from NoteId (C=0). */
function pitchClassFromNoteId(noteId: NoteId): number {
  const pitch = noteId.replace(/\d+$/, '');
  const map: Record<string, number> = {
    C: 0,
    Db: 1,
    D: 2,
    Eb: 3,
    E: 4,
    F: 5,
    Gb: 6,
    G: 7,
    Ab: 8,
    A: 9,
    Bb: 10,
    B: 11,
  };
  return map[pitch] ?? 0;
}

export const PIANO_SCALE_OPTIONS: readonly PianoScaleOption[] = [
  { id: 'cMajor', labelKey: 'piano.scale.names.cMajor', pitchClasses: [0, 2, 4, 5, 7, 9, 11] },
  { id: 'gMajor', labelKey: 'piano.scale.names.gMajor', pitchClasses: [7, 9, 11, 0, 2, 4, 6] },
  { id: 'dMajor', labelKey: 'piano.scale.names.dMajor', pitchClasses: [2, 4, 6, 7, 9, 11, 1] },
  { id: 'aMinor', labelKey: 'piano.scale.names.aMinor', pitchClasses: [9, 11, 0, 2, 4, 5, 7] },
  { id: 'eMinor', labelKey: 'piano.scale.names.eMinor', pitchClasses: [4, 6, 7, 9, 11, 0, 2] },
  {
    id: 'cPentatonic',
    labelKey: 'piano.scale.names.cPentatonic',
    pitchClasses: [0, 2, 4, 7, 9],
  },
];

const noteIdCache = new Map<PianoScaleId, ReadonlySet<NoteId>>();

/** Snap a note to the nearest note that belongs to the scale (ties round up). */
export function snapToScale(noteId: NoteId, scaleId: PianoScaleId): NoteId {
  const allowed = getScaleNoteIds(scaleId);
  if (allowed.has(noteId)) {
    return noteId;
  }
  const target = PIANO_NOTES.find((n) => n.id === noteId);
  if (!target) {
    return noteId;
  }
  let best: NoteId = noteId;
  let bestDist = Infinity;
  for (const note of PIANO_NOTES) {
    if (!allowed.has(note.id)) {
      continue;
    }
    const dist = Math.abs(note.midi - target.midi);
    if (dist < bestDist) {
      bestDist = dist;
      best = note.id;
    }
  }
  return best;
}

export function getScaleNoteIds(scaleId: PianoScaleId): ReadonlySet<NoteId> {
  const cached = noteIdCache.get(scaleId);
  if (cached) {
    return cached;
  }

  const option = PIANO_SCALE_OPTIONS.find((s) => s.id === scaleId);
  if (!option) {
    return new Set();
  }

  const allowed = new Set(option.pitchClasses);
  const ids = new Set<NoteId>();
  for (const note of PIANO_NOTES) {
    if (allowed.has(pitchClassFromNoteId(note.id))) {
      ids.add(note.id);
    }
  }
  noteIdCache.set(scaleId, ids);
  return ids;
}
