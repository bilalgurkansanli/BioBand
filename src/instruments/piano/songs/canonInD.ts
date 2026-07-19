import type { NoteId } from '../pianoNotes';
import type { SongDefinition } from './types';

// Pachelbel — Canon in D (public domain). Built on the piece's famous
// 8-chord ground bass (D-A-Bm-F#m-G-D-G-A), stated first as the bass line
// itself, then with rising melodic variations layered on top — the same
// technique the real canon uses to build up voices.
// Quarter note ≈ 500ms.
const Q = 500;
const E = Q / 2;

type Ev = { noteId: NoteId; atMs: number };

// The ground bass, one note per chord, repeated throughout the piece.
const GROUND: NoteId[] = ['D4', 'A4', 'B4', 'Gb4', 'G4', 'D4', 'G4', 'A4'];

/** State the ground bass plainly, one note per beat. */
function groundStatement(startMs: number): Ev[] {
  return GROUND.map((noteId, i) => ({ noteId, atMs: startMs + i * Q }));
}

/** First melodic variation — eighth-note motion above the ground. */
function variationOne(startMs: number): Ev[] {
  const t = startMs;
  // D major — every C is sharp (Db in this keyboard's flat naming).
  const upper: NoteId[] = ['D5', 'Db5', 'B4', 'A4', 'B4', 'A4', 'G4', 'Gb4'];
  const out: Ev[] = [];
  GROUND.forEach((_, i) => {
    out.push({ noteId: upper[i], atMs: t + i * Q });
    out.push({
      noteId: GROUND[(i + 2) % GROUND.length],
      atMs: t + i * Q + E,
    });
  });
  return out;
}

/** Second variation — the piece's well-known rising 16th-note run. */
function variationTwo(startMs: number): Ev[] {
  const t = startMs;
  const S = Q / 4;
  const runs: NoteId[][] = [
    ['D5', 'Gb5', 'A5', 'Gb5'],
    ['A4', 'D5', 'Gb5', 'A5'],
    ['B4', 'D5', 'Gb5', 'A5'],
    ['Gb4', 'B4', 'D5', 'Gb5'],
    ['G4', 'B4', 'D5', 'G5'],
    ['D4', 'Gb4', 'A4', 'D5'],
    ['G4', 'B4', 'D5', 'G5'],
    ['A4', 'Db5', 'E5', 'A5'],
  ];
  const events: Ev[] = [];
  runs.forEach((group, i) => {
    group.forEach((noteId, j) => {
      events.push({ noteId, atMs: t + i * Q + j * S });
    });
  });
  return events;
}

const GROUND_DURATION = GROUND.length * Q;

const EVENTS: Ev[] = [
  ...groundStatement(0),
  ...groundStatement(GROUND_DURATION),
  ...variationOne(2 * GROUND_DURATION),
  ...variationOne(3 * GROUND_DURATION),
  ...variationTwo(4 * GROUND_DURATION),
  ...variationTwo(5 * GROUND_DURATION),
  ...groundStatement(6 * GROUND_DURATION),
  ...variationOne(7 * GROUND_DURATION),
];

const LAST_MS = EVENTS[EVENTS.length - 1]?.atMs ?? 0;
const partialNotes = EVENTS.slice(0, 50);

export const canonInDSong: SongDefinition = {
  id: 'canon-in-d',
  title: 'Canon in D',
  artist: 'Johann Pachelbel',
  descriptionKey: 'tutorial.songs.canonInD.description',
  previewDurationMs: Math.min(12000, LAST_MS + Q),
  events: EVENTS,
  partialWindowMs: {
    startMs: partialNotes[0]?.atMs ?? 0,
    endMs: partialNotes[partialNotes.length - 1]?.atMs ?? LAST_MS,
  },
};
