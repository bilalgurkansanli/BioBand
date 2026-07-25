import type { NoteId } from '../pianoNotes';
import type { SongDefinition, SongEvent } from './types';

// Adele — "Someone Like You" (2011). Full verse + pre-chorus + chorus +
// bridge, simplified to A major. Source: noobnotes.net easy letter-note
// transcription (melody only, no lyrics reproduced).
// Quarter note ≈ 550ms.
const Q = 550;
const E = Q / 2;
const BAR = 4 * Q;

type Ev = SongEvent;

function at(bar: number, offset: number, noteId: NoteId): Ev {
  return { noteId, atMs: bar * BAR + offset };
}

/** Verse — repeating melodic cell. */
function verse(startBar: number): Ev[] {
  const b = startBar;
  return [
    at(b, 0, 'E5'),
    at(b, Q, 'Db5'),
    at(b + 1, 0, 'B4'),
    at(b + 1, Q, 'A4'),
    at(b + 1, 2 * Q, 'E5'),
    at(b + 1, 2 * Q + E, 'E5'),
    at(b + 1, 3 * Q, 'Db5'),
    at(b + 2, 0, 'B4'),
    at(b + 2, Q, 'A4'),
    at(b + 2, 2 * Q, 'E5'),
    at(b + 2, 2 * Q + E, 'E5'),
    at(b + 2, 3 * Q, 'Db5'),
    at(b + 3, 0, 'B4'),
    at(b + 3, Q, 'A4'),
    at(b + 3, 2 * Q, 'E5'),
    at(b + 3, 2 * Q + E, 'E5'),
    at(b + 3, 3 * Q, 'Db5'),
    at(b + 4, 0, 'B4'),
    at(b + 4, Q, 'A4'),
  ];
}

/** Pre-chorus — rising line into the hook. */
function preChorus(startBar: number): Ev[] {
  const b = startBar;
  return [
    at(b, 0, 'E5'),
    at(b, Q, 'Db5'),
    at(b + 1, 0, 'B4'),
    at(b + 1, Q, 'A4'),
    at(b + 1, 2 * Q, 'Gb5'),
    at(b + 1, 3 * Q, 'Db5'),
    at(b + 2, 0, 'A4'),
    at(b + 3, 0, 'Gb4'),
    at(b + 3, Q, 'A4'),
    at(b + 3, 2 * Q, 'B4'),
    at(b + 3, 3 * Q, 'Gb4'),
    at(b + 4, 0, 'A4'),
    at(b + 5, 0, 'Gb4'),
    at(b + 5, Q, 'Gb4'),
    at(b + 5, 2 * Q, 'Gb4'),
    at(b + 5, 3 * Q, 'B4'),
    at(b + 6, 0, 'A4'),
    at(b + 6, Q, 'B4'),
  ];
}

/** Chorus hook. */
function chorus(startBar: number): Ev[] {
  const b = startBar;
  return [
    at(b, 0, 'E5'),
    at(b, E, 'Db5'),
    at(b, Q, 'B4'),
    at(b, 2 * Q, 'Gb5'),
    at(b, 3 * Q, 'E5'),
    at(b + 1, 0, 'E5'),
    at(b + 1, Q, 'E5'),
    at(b + 1, 2 * Q, 'E5'),
    at(b + 1, 2 * Q + E, 'D5'),
    at(b + 1, 3 * Q, 'Db5'),
    at(b + 2, 0, 'Db5'),
    at(b + 2, Q, 'Db5'),
    at(b + 2, 2 * Q, 'Gb4'),
    at(b + 2, 2 * Q + E, 'Gb4'),
    at(b + 2, 3 * Q, 'A4'),
    at(b + 3, 0, 'Gb4'),
    at(b + 4, 0, 'E4'),
    at(b + 4, Q, 'Gb4'),
    at(b + 4, 2 * Q, 'B4'),
    at(b + 4, 3 * Q, 'A4'),
    at(b + 5, 0, 'B4'),
    at(b + 5, Q, 'B4'),
    at(b + 5, 2 * Q, 'A4'),
    at(b + 5, 3 * Q, 'B4'),
    at(b + 6, 0, 'Db5'),
  ];
}

/** Verse 2 — climbs higher than verse 1. */
function verseTwo(startBar: number): Ev[] {
  const b = startBar;
  return [
    at(b, 0, 'A4'),
    at(b, Q, 'Db5'),
    at(b, 2 * Q, 'Db5'),
    at(b, 3 * Q, 'Db5'),
    at(b + 1, 0, 'Db5'),
    at(b + 1, Q, 'B5'),
    at(b + 1, 2 * Q, 'B5'),
    at(b + 1, 3 * Q, 'A5'),
    at(b + 2, 0, 'B4'),
    at(b + 2, E, 'B4'),
    at(b + 2, Q, 'A4'),
    at(b + 2, Q + E, 'A4'),
    at(b + 2, 2 * Q, 'B4'),
    at(b + 2, 3 * Q, 'A4'),
    at(b + 3, 0, 'A4'),
    at(b + 3, Q, 'A4'),
    at(b + 3, 2 * Q, 'B4'),
    at(b + 3, 3 * Q, 'A4'),
    at(b + 4, 0, 'B4'),
    at(b + 4, Q, 'A4'),
    at(b + 4, 2 * Q, 'B4'),
    at(b + 4, 3 * Q, 'A4'),
    at(b + 5, 0, 'B4'),
    at(b + 5, Q, 'A4'),
  ];
}

/** Bridge. */
function bridge(startBar: number): Ev[] {
  const b = startBar;
  return [
    at(b, 0, 'A4'),
    at(b, Q, 'A4'),
    at(b, 2 * Q, 'Db5'),
    at(b, 3 * Q, 'Db5'),
    at(b + 1, 0, 'Db5'),
    at(b + 1, Q, 'Db5'),
    at(b + 1, 2 * Q, 'Db5'),
    at(b + 2, 0, 'B4'),
    at(b + 2, Q, 'B4'),
    at(b + 2, 2 * Q, 'A4'),
    at(b + 2, 3 * Q, 'B4'),
    at(b + 3, 0, 'A4'),
    at(b + 3, Q, 'B4'),
    at(b + 3, 2 * Q, 'A4'),
    at(b + 4, 0, 'B4'),
    at(b + 4, Q, 'Db5'),
    at(b + 5, 0, 'Gb4'),
    at(b + 5, Q, 'A4'),
    at(b + 5, 2 * Q, 'B4'),
    at(b + 5, 3 * Q, 'A4'),
    at(b + 6, 0, 'B4'),
    at(b + 6, Q, 'Db5'),
  ];
}

const MELODY: Ev[] = [
  ...verse(0),
  ...preChorus(5),
  ...chorus(12),
  ...verseTwo(19),
  ...bridge(25),
  ...chorus(32),
];

/**
 * Chord root per bar, in A major. The melody is A-major pentatonic throughout
 * (A B C# E F#), so bars are read by which triad holds the notes on the beats:
 * the verse cell B-A-E-E-C# turns over the I–iii–vi–IV that every one of those
 * notes belongs to, the pre-chorus leans on F#m/Bm where the line sits on
 * F#-A-B, and verse 2 vamps on nothing but A and B — genuinely one harmony, so
 * it stays on the tonic rather than inventing changes.
 * Written on the keyboard, sounded an octave down under the tune.
 */
const BAR_ROOTS: NoteId[] = [
  // Verse — A | C#m | F#m | D | A
  'A4', 'Db4', 'Gb4', 'D4', 'A4',
  // Pre-chorus — A | F#m | D | F#m | D | Bm | E
  'A4', 'Gb4', 'D4', 'Gb4', 'D4', 'B4', 'E4',
  // Chorus — A | C#m | F#m | D | E | Bm | A
  'A4', 'Db4', 'Gb4', 'D4', 'E4', 'B4', 'A4',
  // Verse 2 — an A/B vamp, held on the tonic
  'A4', 'A4', 'A4', 'A4', 'A4', 'A4',
  // Bridge — A | A | Bm | Bm | A | F#m | A
  'A4', 'A4', 'B4', 'B4', 'A4', 'Gb4', 'A4',
  // Chorus repeat
  'A4', 'Db4', 'Gb4', 'D4', 'E4', 'B4', 'A4',
];

/** Root on beats 1 and 3 — a half-note bass, not an arpeggio to compete with. */
const BASS: Ev[] = BAR_ROOTS.flatMap((noteId, barIndex) =>
  [0, 2].map((beat) => ({
    noteId,
    atMs: barIndex * BAR + beat * Q,
    durationMs: 2 * Q,
    role: 'accompaniment' as const,
    transpose: -12,
  })),
);

const EVENTS: Ev[] = [...MELODY, ...BASS].sort((a, b) => a.atMs - b.atMs);

const LAST_MS = MELODY[MELODY.length - 1]?.atMs ?? 0;
// Counted over the tune — the bass runs underneath the whole excerpt.
const partialNotes = MELODY.slice(0, 60);

export const someoneLikeYouSong: SongDefinition = {
  id: 'someone-like-you',
  title: 'Someone Like You',
  artist: 'Adele',
  descriptionKey: 'tutorial.songs.someoneLikeYou.description',
  previewDurationMs: Math.min(12000, LAST_MS + Q),
  events: EVENTS,
  meter: { beatMs: Q, beatsPerBar: 4 },
  partialWindowMs: {
    startMs: partialNotes[0]?.atMs ?? 0,
    endMs: partialNotes[partialNotes.length - 1]?.atMs ?? LAST_MS,
  },
};
