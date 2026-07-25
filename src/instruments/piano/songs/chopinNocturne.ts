import type { NoteId } from '../pianoNotes';
import type { SongDefinition, SongEvent } from './types';

// Chopin — Nocturne Op. 9 No. 2, bars 1–8: the theme and the varied answer
// Chopin writes for its repeat. Pitches and rhythms follow the Mutopia
// Project's public-domain engraving of the 1881 Schirmer text (typeset by
// Renato Biolcati Rinaldi), including the ornamental sixteenth runs — they are
// the tune, not decoration on top of it.
//
// SOUNDING KEY IS C MAJOR — a minor third below Chopin's E♭. The melody spans
// B♭4 up to D6, seventeen semitones, which fits a twenty-four key board, but
// only if it is moved: at concert pitch the D6 that opens bars 4 and 8 is three
// keys past the top. Down a minor third it lands on B5, the highest key there
// is, and the theme's lowest note lands on G4 — the whole line inside the
// keyboard with nothing folded and every leap the size Chopin wrote it.
//
// WHAT IS SIMPLIFIED. Chopin's left hand spreads each beat over four octaves,
// which this keyboard does not have. The bass–chord–chord tread and the
// harmony of every beat are kept; the chords are stated in one close voicing
// instead of his open one, and the two passing bass inversions that would need
// keys below the bottom C are left on the root.
//
// 12/8, eighth = 456ms (Andante, eighth = 132).
const E = 456;
const BEAT = 3 * E;
const BAR = 12 * E;
// The tune enters on the last eighth before bar 1.
const PICKUP = E;

type Ev = SongEvent;
/** [eighths after the bar line, note, length in eighths]. */
type Step = [number, NoteId, number];

function melody(index: number, steps: Step[]): Ev[] {
  return steps.map(([pos, noteId, length]) => ({
    noteId,
    atMs: index * BAR + pos * E + PICKUP,
    durationMs: length * E,
  }));
}

/** One beat's harmony: the bass note, then the chord struck twice above it. */
type Harmony = { bass: NoteId; chord: NoteId[] };

const TONIC: Harmony = { bass: 'C4', chord: ['C5', 'E5', 'G5'] };
// The chromatic neighbour Chopin colours the opening bar with.
const NEIGHBOUR: Harmony = { bass: 'C4', chord: ['F5', 'Ab5', 'B5'] };
const DOMINANT_OF_II: Harmony = { bass: 'A4', chord: ['Db5', 'E5', 'G5'] };
const SUBDOMINANT: Harmony = { bass: 'D4', chord: ['D5', 'F5', 'A5'] };
const DOMINANT: Harmony = { bass: 'G4', chord: ['F5', 'G5', 'B5'] };
const RISING_DIM: Harmony = { bass: 'Ab4', chord: ['D5', 'F5', 'B5'] };
const RELATIVE_MINOR: Harmony = { bass: 'A4', chord: ['C5', 'E5', 'A5'] };
const FALLING_DIM: Harmony = { bass: 'Gb4', chord: ['C5', 'Eb5', 'A5'] };

/**
 * Left hand — heard, never highlighted, sounded an octave below the keys.
 * Bass on the beat, then the chord on each of the two eighths after it: the
 * swing that makes a nocturne a nocturne.
 */
function under(index: number, beats: Harmony[]): Ev[] {
  const out: Ev[] = [];
  beats.forEach((harmony, beatNo) => {
    const start = index * BAR + beatNo * BEAT + PICKUP;
    const push = (noteId: NoteId, offset: number): void => {
      out.push({
        noteId,
        atMs: start + offset * E,
        durationMs: E,
        role: 'accompaniment',
        transpose: -12,
      });
    };
    push(harmony.bass, 0);
    for (const noteId of harmony.chord) {
      push(noteId, 1);
      push(noteId, 2);
    }
  });
  return out;
}

// Bars 1–4 and 5–8 sit on the same eight-beat progression; only the tune
// changes when it comes round the second time.
const PHRASE: Harmony[][] = [
  [TONIC, NEIGHBOUR, TONIC, TONIC],
  [DOMINANT_OF_II, DOMINANT_OF_II, SUBDOMINANT, SUBDOMINANT],
  [DOMINANT, RISING_DIM, RELATIVE_MINOR, FALLING_DIM],
  [DOMINANT, DOMINANT, TONIC, TONIC],
];

// The tune's first note, an eighth before the bar line.
const ANACRUSIS: Ev = { noteId: 'G4', atMs: 0, durationMs: E };

const EVENTS: Ev[] = [
  ANACRUSIS,

  // Bar 1 — the theme, opening on a held E and sinking a step at a time.
  ...melody(0, [
    [0, 'E5', 4], [4, 'D5', 1], [5, 'E5', 1],
    [6, 'D5', 3], [9, 'C5', 2], [11, 'G4', 1],
  ]),
  // Bar 2 — the leap to the top of the phrase.
  ...melody(1, [
    [0, 'E5', 2], [2, 'A4', 1], [3, 'A5', 2], [5, 'E5', 1],
    [6, 'G5', 3], [9, 'F5', 2], [11, 'E5', 1],
  ]),
  ...melody(2, [
    [0, 'D5', 3], [3, 'E5', 2], [5, 'B4', 1], [6, 'C5', 3], [9, 'A4', 3],
  ]),
  // Bar 4 — the octave-and-a-half drop, then the run back down to C.
  ...melody(3, [
    [0, 'G4', 1], [1, 'B5', 1], [2, 'A5', 1],
    [3, 'G5', 0.5], [3.5, 'F5', 0.5], [4, 'E5', 0.5], [4.5, 'F5', 0.5],
    [5, 'A4', 0.5], [5.5, 'B4', 0.5],
    [6, 'C5', 3], [11, 'G4', 1],
  ]),

  // Bars 5–8 — the same theme with the turns written out.
  ...melody(4, [
    [0, 'E5', 3],
    [3, 'D5', 0.5], [3.5, 'E5', 0.5], [4, 'D5', 0.5], [4.5, 'Db5', 0.5],
    [5, 'D5', 0.5], [5.5, 'E5', 0.5], [6, 'D5', 1], [7, 'C5', 2.5],
    [9.5, 'D5', 0.5], [10, 'C5', 0.5], [10.5, 'B4', 0.5],
    [11, 'C5', 0.5], [11.5, 'D5', 0.5],
  ]),
  // Bar 6 — the chromatic climb that reaches the highest key on the board.
  ...melody(5, [
    [0, 'E5', 0.5], [0.5, 'Ab4', 0.5], [1, 'A4', 0.5], [1.5, 'Bb4', 0.5],
    [2, 'A4', 0.5], [2.5, 'D5', 0.5], [3, 'Db5', 0.5], [3.5, 'F5', 0.5],
    [4, 'E5', 0.5], [4.5, 'Bb5', 0.5], [5, 'A5', 0.5], [5.5, 'E5', 0.5],
    [6, 'G5', 3], [9, 'F5', 2], [11, 'E5', 1],
  ]),
  ...melody(6, [
    [0, 'D5', 3], [3, 'E5', 1], [4, 'E5', 1], [5, 'B4', 1],
    [6, 'C5', 3], [9, 'A4', 3],
  ]),
  ...melody(7, [
    [0, 'G4', 1], [1, 'B5', 1], [2, 'A5', 1],
    [3, 'G5', 0.5], [3.5, 'F5', 0.5], [4, 'E5', 0.5], [4.5, 'F5', 0.5],
    [5, 'A4', 0.5], [5.5, 'B4', 0.5],
    [6, 'C5', 4], [10, 'B4', 1], [11, 'C5', 1],
  ]),

  ...PHRASE.flatMap((beats, index) => under(index, beats)),
  ...PHRASE.flatMap((beats, index) => under(index + 4, beats)),
].sort((a, b) => a.atMs - b.atMs);

const MELODY = EVENTS.filter((event) => event.role !== 'accompaniment');
const LAST_MS = MELODY[MELODY.length - 1]?.atMs ?? 0;

// The excerpt is the plain statement of the theme, bars 1–4.
const themeNotes = MELODY.filter((event) => event.atMs < 4 * BAR + PICKUP);
const partialNotes = themeNotes.length > 0 ? themeNotes : MELODY.slice(0, 50);

export const chopinNocturneSong: SongDefinition = {
  id: 'chopin-nocturne',
  title: 'Nocturne Op. 9 No. 2',
  artist: 'Frédéric Chopin',
  descriptionKey: 'tutorial.songs.chopinNocturne.description',
  previewDurationMs: Math.min(12000, LAST_MS + BEAT),
  events: EVENTS,
  meter: { beatMs: BEAT, beatsPerBar: 4, barStartMs: PICKUP },
  partialWindowMs: {
    startMs: partialNotes[0]?.atMs ?? 0,
    endMs: partialNotes[partialNotes.length - 1]?.atMs ?? LAST_MS,
  },
};
