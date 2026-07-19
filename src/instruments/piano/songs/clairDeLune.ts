import type { NoteId } from '../pianoNotes';
import type { SongDefinition } from './types';

// Debussy — "Clair de Lune", from Suite bergamasque (public domain).
// Simplified melodic reduction of the soft, flowing opening theme (Db major).
// Quarter note ≈ 700ms (slow, dreamlike).
const Q = 700;
const E = Q / 2;
const S = Q / 4;

type Ev = { noteId: NoteId; atMs: number };

/** The opening rising phrase, then a gentle falling answer. */
function openingPhrase(startMs: number): Ev[] {
  const t = startMs;
  return [
    { noteId: 'Db4', atMs: t },
    { noteId: 'Gb4', atMs: t + Q },
    { noteId: 'Ab4', atMs: t + 2 * Q },
    { noteId: 'Db5', atMs: t + 3 * Q },
    { noteId: 'Eb5', atMs: t + 4 * Q },
    { noteId: 'Db5', atMs: t + 5 * Q },
    { noteId: 'Bb4', atMs: t + 6 * Q },
    { noteId: 'Ab4', atMs: t + 7 * Q },
    { noteId: 'Gb4', atMs: t + 8 * Q },
    { noteId: 'Ab4', atMs: t + 9 * Q },
    { noteId: 'Db4', atMs: t + 10 * Q },
  ];
}

/** Rising echo, a step higher, resolving further. */
function risingEcho(startMs: number): Ev[] {
  const t = startMs;
  return [
    { noteId: 'Eb4', atMs: t },
    { noteId: 'Ab4', atMs: t + Q },
    { noteId: 'Bb4', atMs: t + 2 * Q },
    { noteId: 'Eb5', atMs: t + 3 * Q },
    { noteId: 'F5', atMs: t + 4 * Q },
    { noteId: 'Eb5', atMs: t + 5 * Q },
    { noteId: 'Db5', atMs: t + 6 * Q },
    { noteId: 'Bb4', atMs: t + 7 * Q },
    { noteId: 'Ab4', atMs: t + 8 * Q },
    { noteId: 'Gb4', atMs: t + 9 * Q },
    { noteId: 'Eb4', atMs: t + 10 * Q },
  ];
}

/** A gently undulating middle idea, quicker note values. */
function undulation(startMs: number): Ev[] {
  const t = startMs;
  const notes: NoteId[] = [
    'Ab4', 'Bb4', 'Db5', 'Eb5', 'Db5', 'Bb4',
    'Ab4', 'Gb4', 'Ab4', 'Bb4', 'Ab4', 'Gb4',
    'Eb4', 'Gb4', 'Ab4', 'Bb4', 'Ab4', 'Gb4',
    'Eb4', 'Db4',
  ];
  return notes.map((noteId, i) => ({ noteId, atMs: t + i * S }));
}

/** Closing — a soft descent back to the tonic. */
function closing(startMs: number): Ev[] {
  const t = startMs;
  return [
    { noteId: 'Db5', atMs: t },
    { noteId: 'Bb4', atMs: t + Q },
    { noteId: 'Ab4', atMs: t + 2 * Q },
    { noteId: 'Gb4', atMs: t + 3 * Q },
    { noteId: 'Eb4', atMs: t + 4 * Q },
    { noteId: 'Db4', atMs: t + 5 * Q },
    { noteId: 'Ab4', atMs: t + 6 * Q },
    { noteId: 'Db4', atMs: t + 8 * Q },
  ];
}

const PHRASE_DURATION = 11 * Q;
const UNDULATION_DURATION = 20 * S;
const CLOSING_DURATION = 10 * Q;

const EVENTS: Ev[] = [
  ...openingPhrase(0),
  ...risingEcho(PHRASE_DURATION),
  ...undulation(2 * PHRASE_DURATION),
  ...openingPhrase(2 * PHRASE_DURATION + UNDULATION_DURATION),
  ...risingEcho(3 * PHRASE_DURATION + UNDULATION_DURATION),
  ...undulation(4 * PHRASE_DURATION + UNDULATION_DURATION),
  ...openingPhrase(4 * PHRASE_DURATION + 2 * UNDULATION_DURATION),
  ...risingEcho(5 * PHRASE_DURATION + 2 * UNDULATION_DURATION),
  ...closing(6 * PHRASE_DURATION + 2 * UNDULATION_DURATION),
];

const LAST_MS = EVENTS[EVENTS.length - 1]?.atMs ?? 0;
const partialNotes = EVENTS.slice(0, 50);

export const clairDeLuneSong: SongDefinition = {
  id: 'clair-de-lune',
  title: 'Clair de Lune',
  artist: 'Claude Debussy',
  descriptionKey: 'tutorial.songs.clairDeLune.description',
  previewDurationMs: Math.min(12000, LAST_MS + Q),
  events: EVENTS,
  partialWindowMs: {
    startMs: partialNotes[0]?.atMs ?? 0,
    endMs: partialNotes[partialNotes.length - 1]?.atMs ?? LAST_MS,
  },
};
