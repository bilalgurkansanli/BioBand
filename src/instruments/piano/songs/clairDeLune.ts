import type { NoteId } from '../pianoNotes';
import type { SongDefinition, SongEvent } from './types';

// Debussy — "Clair de lune", third movement of the Suite bergamasque, L. 75.
// Pitches and rhythms follow the Mutopia Project's public-domain engraving,
// bars 1–14: the opening phrase, its falling answer, and the restatement that
// climbs to B♭5 before settling.
//
// SOUNDING KEY IS D♭ MAJOR — Debussy's own, untransposed. The top line of
// these fourteen bars runs C4–B♭5, which is exactly the span of this keyboard,
// so nothing had to be moved.
//
// WHAT IS SIMPLIFIED. Debussy writes the tune in thirds and sixths: every
// melody note here is the upper voice of those chords, and the inner note is
// dropped rather than turned into a second thing to play. The same third is
// still heard an octave down in the left hand, which is where it comes from.
// The left hand's own bass falls to A♭2 once, below this keyboard even after
// the octave shift, and is taken up an octave there.
//
// 9/8, eighth = 400ms (Andante très expressif).
const E = 400;
const BAR = 9 * E;

type Ev = SongEvent;
/** [eighths after the bar line, note, length in eighths]. */
type Step = [number, NoteId, number];

function melody(index: number, steps: Step[]): Ev[] {
  return steps.map(([pos, noteId, length]) => ({
    noteId,
    atMs: index * BAR + pos * E,
    durationMs: length * E,
  }));
}

/**
 * Left hand — heard, never highlighted, sounded an octave below the keys.
 * Debussy's sustained chords, which carry the harmony the melody floats over.
 */
function under(index: number, steps: Step[]): Ev[] {
  return steps.map(([pos, noteId, length]) => ({
    noteId,
    atMs: index * BAR + pos * E,
    durationMs: length * E,
    role: 'accompaniment' as const,
    transpose: -12,
  }));
}

// The opening phrase. Bar 1 is an eighth of silence, the third stepping up,
// then the same third an octave higher held across the bar — the lift is the
// first thing anyone recognises, so it keeps its octave.
const OPENING: Ev[] = [
  ...melody(0, [[1, 'Ab4', 1], [2, 'Ab5', 4], [6, 'F5', 4]]),
  ...melody(1, [[1, 'Eb5', 1], [2, 'F5', 1], [3, 'Eb5', 7]]),
  ...melody(2, [[1, 'Db5', 1], [2, 'Eb5', 1], [3, 'Db5', 1.5], [4.5, 'F5', 3], [7.5, 'Db5', 2.5]]),
  ...melody(3, [[1, 'C5', 1], [2, 'Db5', 1], [3, 'C5', 7]]),

  // The answer: the line turns over and walks down two octaves' worth of the
  // scale, ending on the low C that fixes this piece's bottom key.
  ...melody(4, [
    [1, 'Bb4', 1], [2, 'C5', 1], [3, 'Bb4', 1], [4, 'Eb5', 1],
    [5, 'Bb4', 1], [6, 'Ab4', 1], [7, 'Bb4', 1], [8, 'Ab4', 2],
  ]),
  ...melody(5, [[1, 'Gb4', 1], [2, 'Ab4', 1], [3, 'Gb4', 3], [6, 'F4', 4]]),
  ...melody(6, [
    [1, 'F4', 1], [2, 'Gb4', 1], [3, 'F4', 1], [4, 'Bb4', 1],
    [5, 'F4', 1], [6, 'Eb4', 1], [7, 'F4', 1], [8, 'Eb4', 2],
  ]),
  ...melody(7, [[1, 'Db4', 1], [2, 'Eb4', 1], [3, 'Db4', 3], [6, 'C4', 3]]),

  ...under(0, [[1, 'F5', 8], [1, 'Ab5', 8]]),
  ...under(1, [[0, 'Gb5', 9], [0, 'A5', 9]]),
  ...under(2, [[0, 'F5', 9], [0, 'Ab5', 9]]),
  ...under(3, [[0, 'Eb5', 9], [0, 'Gb5', 9]]),
  ...under(4, [[0, 'Eb5', 6], [6, 'Eb5', 3], [0, 'Db5', 6], [6, 'C5', 3]]),
  ...under(5, [[0, 'Db5', 6], [6, 'C5', 3], [0, 'Bb4', 6], [6, 'A4', 3]]),
  ...under(6, [[0, 'Bb4', 9], [0, 'Ab4', 6], [6, 'Gb4', 3]]),
  ...under(7, [[0, 'Ab4', 6], [6, 'Gb4', 3], [0, 'F4', 6], [6, 'Eb4', 1.5], [7.5, 'Ab4', 1.5]]),
];

// The restatement. Same opening, but the third bar of the phrase rises to A♭5
// instead of turning back, and the whole thing settles on B♭.
const RESTATEMENT: Ev[] = [
  ...melody(8, [[1, 'Ab4', 2], [3, 'Ab5', 3], [6, 'F5', 4]]),
  ...melody(9, [[1, 'Eb5', 1], [2, 'F5', 1], [3, 'Eb5', 7]]),
  ...melody(10, [[1, 'Db5', 1], [2, 'Eb5', 1], [3, 'Ab5', 3], [6, 'F5', 4]]),
  ...melody(11, [[1, 'Eb5', 1], [2, 'F5', 1], [3, 'Eb5', 3], [6, 'Db5', 4]]),
  ...melody(12, [[1, 'Db5', 1], [2, 'Eb5', 1], [3, 'Bb5', 1.5], [4.5, 'Ab5', 3], [7.5, 'F5', 1.5]]),
  ...melody(13, [
    [0, 'F5', 1], [1, 'Eb5', 1], [2, 'F5', 1],
    [3, 'Eb5', 1.5], [4.5, 'Db5', 3], [7.5, 'Bb4', 1.5],
  ]),

  ...under(8, [
    [0, 'Db4', 1], [0, 'Ab4', 1],
    [1, 'F4', 1], [1, 'Ab4', 1],
    [2, 'F5', 7], [2, 'Ab5', 7],
  ]),
  ...under(9, [[1, 'Db4', 8], [1, 'Gb4', 8], [1, 'Bb4', 8], [1, 'Db5', 8], [0, 'Gb4', 6]]),
  ...under(10, [
    [1, 'F4', 2], [1, 'Ab4', 2],
    [3, 'Db5', 3], [3, 'F5', 3],
    [6, 'Ab4', 3], [6, 'Db5', 3],
    [0, 'Db4', 6],
  ]),
  ...under(11, [[1, 'Db4', 8], [1, 'Gb4', 8], [1, 'Bb4', 8], [1, 'Db5', 8], [0, 'Gb4', 6]]),
  ...under(12, [[1, 'F4', 2], [1, 'B4', 2], [3, 'B4', 3.5], [3, 'Db5', 3.5], [3, 'F5', 3.5], [0, 'Ab4', 9]]),
  ...under(13, [[1, 'Eb4', 3.5], [4.5, 'Db4', 4.5], [0, 'Bb4', 9]]),
];

const EVENTS: Ev[] = [...OPENING, ...RESTATEMENT].sort((a, b) => a.atMs - b.atMs);

const MELODY = EVENTS.filter((event) => event.role !== 'accompaniment');
const LAST_MS = MELODY[MELODY.length - 1]?.atMs ?? 0;

// The excerpt is the opening phrase, bars 1–8.
const openingNotes = MELODY.filter((event) => event.atMs < 8 * BAR);
const partialNotes = openingNotes.length > 0 ? openingNotes : MELODY.slice(0, 50);

export const clairDeLuneSong: SongDefinition = {
  id: 'clair-de-lune',
  title: 'Clair de Lune',
  artist: 'Claude Debussy',
  descriptionKey: 'tutorial.songs.clairDeLune.description',
  previewDurationMs: Math.min(12000, LAST_MS + 3 * E),
  events: EVENTS,
  meter: { beatMs: 3 * E, beatsPerBar: 3 },
  partialWindowMs: {
    startMs: partialNotes[0]?.atMs ?? 0,
    endMs: partialNotes[partialNotes.length - 1]?.atMs ?? LAST_MS,
  },
};
