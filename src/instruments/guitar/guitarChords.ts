import { midiToFret, type GuitarStringId } from './guitarSounds';

export type ChordId =
  | 'Em'
  | 'G'
  | 'C'
  | 'D'
  | 'Am'
  | 'E'
  | 'A'
  | 'Dm'
  | 'B7'
  | 'E5'
  | 'A5'
  | 'G5'
  | 'D5'
  | 'C5'
  | 'F'
  | 'Bm'
  | 'Gm'
  | 'Bb'
  | 'Cmaj7'
  | 'Dfs'
  | 'Dm7';

/** UI grouping for the chord bar (open campfire vs rock shapes). */
export type ChordFamily = 'open' | 'power' | 'barre';

export type ChordDefinition = {
  id: ChordId;
  labelKey: string;
  family: ChordFamily;
  /** MIDI per string s6→s1; null = muted */
  notes: (number | null)[];
  /**
   * Index-finger barre fret for shape display.
   * Strings sounding at this fret show a barre mark; higher frets keep finger dots.
   */
  barreFret?: number;
};

const STRING_ORDER: GuitarStringId[] = ['s6', 's5', 's4', 's3', 's2', 's1'];

/**
 * Open shapes + rock power/barre presets (standard tuning).
 * Power chords mute unused strings — strum only plays sounding notes.
 */
export const GUITAR_CHORDS: ChordDefinition[] = [
  // —— Open / campfire ——
  // Em: 0-2-2-0-0-0
  { id: 'Em', labelKey: 'guitar.chords.Em', family: 'open', notes: [40, 47, 52, 55, 59, 64] },
  // G: 3-2-0-0-0-3
  { id: 'G', labelKey: 'guitar.chords.G', family: 'open', notes: [43, 47, 50, 55, 59, 67] },
  // C: x-3-2-0-1-0
  { id: 'C', labelKey: 'guitar.chords.C', family: 'open', notes: [null, 48, 52, 55, 60, 64] },
  // D: x-x-0-2-3-2
  { id: 'D', labelKey: 'guitar.chords.D', family: 'open', notes: [null, null, 50, 57, 62, 66] },
  // Am: x-0-2-2-1-0
  { id: 'Am', labelKey: 'guitar.chords.Am', family: 'open', notes: [null, 45, 52, 57, 60, 64] },
  // E: 0-2-2-1-0-0
  { id: 'E', labelKey: 'guitar.chords.E', family: 'open', notes: [40, 47, 52, 56, 59, 64] },
  // A: x-0-2-2-2-0
  { id: 'A', labelKey: 'guitar.chords.A', family: 'open', notes: [null, 45, 52, 57, 61, 64] },
  // Dm: x-x-0-2-3-1
  { id: 'Dm', labelKey: 'guitar.chords.Dm', family: 'open', notes: [null, null, 50, 57, 62, 65] },
  // Dm7: x-x-0-2-1-1
  { id: 'Dm7', labelKey: 'guitar.chords.Dm7', family: 'open', notes: [null, null, 50, 57, 60, 65] },
  // B7: x-2-1-2-0-2
  { id: 'B7', labelKey: 'guitar.chords.B7', family: 'open', notes: [null, 47, 51, 57, 59, 66] },
  // Cmaj7 (Zombie intro voicing): 3-3-2-0-0-0
  { id: 'Cmaj7', labelKey: 'guitar.chords.Cmaj7', family: 'open', notes: [43, 48, 52, 55, 59, 64] },
  // D/F#: 2-0-0-2-3-2
  { id: 'Dfs', labelKey: 'guitar.chords.Dfs', family: 'open', notes: [42, 45, 50, 57, 62, 66] },

  // —— Power (root–5th–octave) ——
  // E5: 0-2-2-x-x-x
  { id: 'E5', labelKey: 'guitar.chords.E5', family: 'power', notes: [40, 47, 52, null, null, null] },
  // A5: x-0-2-2-x-x
  { id: 'A5', labelKey: 'guitar.chords.A5', family: 'power', notes: [null, 45, 52, 57, null, null] },
  // G5: 3-5-5-x-x-x
  { id: 'G5', labelKey: 'guitar.chords.G5', family: 'power', notes: [43, 50, 55, null, null, null] },
  // D5: x-5-7-7-x-x
  { id: 'D5', labelKey: 'guitar.chords.D5', family: 'power', notes: [null, 50, 57, 62, null, null] },
  // C5: x-3-5-5-x-x
  { id: 'C5', labelKey: 'guitar.chords.C5', family: 'power', notes: [null, 48, 55, 60, null, null] },

  // —— Barre ——
  // F major barre (E-shape @ 1): 1-3-3-2-1-1
  {
    id: 'F',
    labelKey: 'guitar.chords.F',
    family: 'barre',
    notes: [41, 48, 53, 57, 60, 65],
    barreFret: 1,
  },
  // Bm barre (Am-shape @ 2): x-2-4-4-3-2
  {
    id: 'Bm',
    labelKey: 'guitar.chords.Bm',
    family: 'barre',
    notes: [null, 47, 54, 59, 62, 66],
    barreFret: 2,
  },
  // Gm barre (Em-shape @ 3): 3-5-5-3-3-3
  {
    id: 'Gm',
    labelKey: 'guitar.chords.Gm',
    family: 'barre',
    notes: [43, 50, 55, 58, 62, 67],
    barreFret: 3,
  },
  // Bb barre (A-shape @ 1): x-1-3-3-3-1
  {
    id: 'Bb',
    labelKey: 'guitar.chords.Bb',
    family: 'barre',
    notes: [null, 46, 53, 58, 62, 65],
    barreFret: 1,
  },
];

const CHORD_BY_ID = new Map<string, ChordDefinition>(
  GUITAR_CHORDS.map((chord) => [chord.id, chord]),
);

/** Catalog order — default for settings “visible chords”. */
export const ALL_GUITAR_CHORD_IDS: ChordId[] = GUITAR_CHORDS.map((chord) => chord.id);

export function isChordId(value: string): value is ChordId {
  return CHORD_BY_ID.has(value);
}

/** Keep only valid ids, restore catalog order, never empty. */
export function normalizeVisibleChordIds(ids: readonly string[]): ChordId[] {
  const allowed = new Set(ids.filter(isChordId));
  const ordered = ALL_GUITAR_CHORD_IDS.filter((id) => allowed.has(id));
  return ordered.length > 0 ? ordered : [...ALL_GUITAR_CHORD_IDS];
}

export function getChordById(id: string): ChordDefinition | undefined {
  return CHORD_BY_ID.get(id);
}

/** Chords for one family, in catalog order. */
export function getChordsByFamily(family: ChordFamily): ChordDefinition[] {
  return GUITAR_CHORDS.filter((chord) => chord.family === family);
}

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

/** Fret per string for UI; `null` = muted / not played. */
export type ChordFretting = Record<GuitarStringId, number | null>;

export function getChordFretting(chord: ChordDefinition): ChordFretting {
  const fretting = {} as ChordFretting;

  for (let i = 0; i < STRING_ORDER.length; i++) {
    const stringId = STRING_ORDER[i];
    const midi = chord.notes[i];
    if (midi === null) {
      fretting[stringId] = null;
    } else {
      fretting[stringId] = midiToFret(stringId, midi);
    }
  }

  return fretting;
}

