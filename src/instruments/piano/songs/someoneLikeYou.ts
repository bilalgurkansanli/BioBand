import type { NoteId } from '../pianoNotes';
import type { SongDefinition } from './types';

// Adele — "Someone Like You" (2011). Full verse + pre-chorus + chorus +
// bridge, simplified to A major. Source: noobnotes.net easy letter-note
// transcription (melody only, no lyrics reproduced).
// Quarter note ≈ 550ms.
const Q = 550;
const E = Q / 2;
const BAR = 4 * Q;

type Ev = { noteId: NoteId; atMs: number };

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

const EVENTS: Ev[] = [
  ...verse(0),
  ...preChorus(5),
  ...chorus(12),
  ...verseTwo(19),
  ...bridge(25),
  ...chorus(32),
];

const LAST_MS = EVENTS[EVENTS.length - 1]?.atMs ?? 0;
const partialNotes = EVENTS.slice(0, 60);

export const someoneLikeYouSong: SongDefinition = {
  id: 'someone-like-you',
  title: 'Someone Like You',
  artist: 'Adele',
  descriptionKey: 'tutorial.songs.someoneLikeYou.description',
  previewDurationMs: Math.min(12000, LAST_MS + Q),
  events: EVENTS,
  partialWindowMs: {
    startMs: partialNotes[0]?.atMs ?? 0,
    endMs: partialNotes[partialNotes.length - 1]?.atMs ?? LAST_MS,
  },
};
