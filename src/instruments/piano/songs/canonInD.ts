import type { NoteId } from '../pianoNotes';
import type { SongDefinition, SongEvent } from './types';

// Pachelbel — Canon in D (public domain). Built on the piece's famous
// 8-chord ground bass (D-A-Bm-F#m-G-D-G-A), stated first as the bass line
// itself, then with rising melodic variations layered on top — the same
// technique the real canon uses to build up voices.
// Quarter note ≈ 500ms.
const Q = 500;
const E = Q / 2;

type Ev = SongEvent;

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

/**
 * The ground bass under every section. The canon *is* its bass — carrying only
 * the upper line leaves the tune correct and the piece unrecognisable. Written
 * on the keyboard and sounded an octave down, since the melody already uses
 * both octaves the keys cover.
 */
function groundBass(startMs: number): Ev[] {
  return GROUND.map((noteId, i) => ({
    noteId,
    atMs: startMs + i * Q,
    durationMs: Q,
    role: 'accompaniment' as const,
    transpose: -12,
  }));
}

const MELODY: Ev[] = [
  ...groundStatement(0),
  ...groundStatement(GROUND_DURATION),
  ...variationOne(2 * GROUND_DURATION),
  ...variationOne(3 * GROUND_DURATION),
  ...variationTwo(4 * GROUND_DURATION),
  ...variationTwo(5 * GROUND_DURATION),
  ...groundStatement(6 * GROUND_DURATION),
  ...variationOne(7 * GROUND_DURATION),
];

const SECTION_COUNT = 8;

const EVENTS: Ev[] = [
  ...MELODY,
  ...Array.from({ length: SECTION_COUNT }, (_, i) =>
    groundBass(i * GROUND_DURATION),
  ).flat(),
].sort((a, b) => a.atMs - b.atMs);

const LAST_MS = MELODY[MELODY.length - 1]?.atMs ?? 0;
// The excerpt is measured over the tune — the bass runs under all of it.
const partialNotes = MELODY.slice(0, 50);

export const canonInDSong: SongDefinition = {
  id: 'canon-in-d',
  title: 'Canon in D',
  artist: 'Johann Pachelbel',
  descriptionKey: 'tutorial.songs.canonInD.description',
  previewDurationMs: Math.min(12000, LAST_MS + Q),
  events: EVENTS,
  meter: { beatMs: Q, beatsPerBar: 4 },
  partialWindowMs: {
    startMs: partialNotes[0]?.atMs ?? 0,
    endMs: partialNotes[partialNotes.length - 1]?.atMs ?? LAST_MS,
  },
};
