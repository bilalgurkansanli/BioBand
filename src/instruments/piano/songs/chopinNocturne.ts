import type { NoteId } from '../pianoNotes';
import type { SongDefinition } from './types';

// Chopin — Nocturne in E-flat major, Op. 9 No. 2 (public domain).
// Simplified melodic reduction of the famous singing theme, restated twice
// with the piece's characteristic ornamented variation the second time.
// Quarter note ≈ 650ms (slow, cantabile).
const Q = 650;
const E = Q / 2;
const S = Q / 4;

type Ev = { noteId: NoteId; atMs: number };

/** Plain statement of the main theme. */
function themePlain(startMs: number): Ev[] {
  const t = startMs;
  return [
    { noteId: 'Bb4', atMs: t },
    { noteId: 'Eb5', atMs: t + Q },
    { noteId: 'F5', atMs: t + 2 * Q },
    { noteId: 'Eb5', atMs: t + 2 * Q + E },
    { noteId: 'D5', atMs: t + 3 * Q },
    { noteId: 'C5', atMs: t + 3 * Q + E },
    { noteId: 'Bb4', atMs: t + 4 * Q },
    { noteId: 'G4', atMs: t + 6 * Q },
    { noteId: 'Ab4', atMs: t + 7 * Q },
    { noteId: 'Bb4', atMs: t + 8 * Q },
    { noteId: 'C5', atMs: t + 9 * Q },
    { noteId: 'Bb4', atMs: t + 9 * Q + E },
    { noteId: 'Ab4', atMs: t + 10 * Q },
    { noteId: 'G4', atMs: t + 10 * Q + E },
    { noteId: 'F4', atMs: t + 11 * Q },
    { noteId: 'Eb4', atMs: t + 13 * Q },
  ];
}

/** Second phrase — answers the theme, cadences on the dominant. */
function themeAnswer(startMs: number): Ev[] {
  const t = startMs;
  return [
    { noteId: 'F4', atMs: t },
    { noteId: 'Bb4', atMs: t + Q },
    { noteId: 'C5', atMs: t + 2 * Q },
    { noteId: 'Bb4', atMs: t + 2 * Q + E },
    { noteId: 'Ab4', atMs: t + 3 * Q },
    { noteId: 'G4', atMs: t + 3 * Q + E },
    { noteId: 'F4', atMs: t + 4 * Q },
    { noteId: 'Eb4', atMs: t + 6 * Q },
    { noteId: 'F4', atMs: t + 7 * Q },
    { noteId: 'G4', atMs: t + 8 * Q },
    { noteId: 'Ab4', atMs: t + 9 * Q },
    { noteId: 'Bb4', atMs: t + 10 * Q },
    { noteId: 'C5', atMs: t + 11 * Q },
    { noteId: 'D5', atMs: t + 12 * Q },
    { noteId: 'Eb5', atMs: t + 13 * Q },
    { noteId: 'F5', atMs: t + 15 * Q },
  ];
}

/** Ornamented restatement of the theme — a florid descending turn at the end. */
function themeOrnamented(startMs: number): Ev[] {
  const t = startMs;
  return [
    { noteId: 'Bb4', atMs: t },
    { noteId: 'Eb5', atMs: t + Q },
    { noteId: 'F5', atMs: t + 2 * Q },
    { noteId: 'Eb5', atMs: t + 2 * Q + E },
    { noteId: 'D5', atMs: t + 3 * Q },
    { noteId: 'C5', atMs: t + 3 * Q + E },
    { noteId: 'Bb4', atMs: t + 4 * Q },
    // The famous ornamented run.
    { noteId: 'G5', atMs: t + 5 * Q },
    { noteId: 'F5', atMs: t + 5 * Q + S },
    { noteId: 'Eb5', atMs: t + 5 * Q + 2 * S },
    { noteId: 'D5', atMs: t + 5 * Q + 3 * S },
    { noteId: 'C5', atMs: t + 6 * Q },
    { noteId: 'Bb4', atMs: t + 6 * Q + S },
    { noteId: 'Ab4', atMs: t + 6 * Q + 2 * S },
    { noteId: 'G4', atMs: t + 6 * Q + 3 * S },
    { noteId: 'F4', atMs: t + 7 * Q },
    { noteId: 'Eb4', atMs: t + 9 * Q },
  ];
}

/** Closing cadence. */
function closing(startMs: number): Ev[] {
  const t = startMs;
  return [
    { noteId: 'F4', atMs: t },
    { noteId: 'G4', atMs: t + Q },
    { noteId: 'Ab4', atMs: t + 2 * Q },
    { noteId: 'Bb4', atMs: t + 3 * Q },
    { noteId: 'Eb5', atMs: t + 4 * Q },
    { noteId: 'D5', atMs: t + 5 * Q },
    { noteId: 'C5', atMs: t + 6 * Q },
    { noteId: 'Bb4', atMs: t + 7 * Q },
    { noteId: 'Eb4', atMs: t + 9 * Q },
  ];
}

const PLAIN_DURATION = 15 * Q;
const ANSWER_DURATION = 17 * Q;
const ORNAMENT_DURATION = 11 * Q;

const EVENTS: Ev[] = [
  ...themePlain(0),
  ...themeAnswer(PLAIN_DURATION),
  ...themeOrnamented(PLAIN_DURATION + ANSWER_DURATION),
  ...themeAnswer(PLAIN_DURATION + ANSWER_DURATION + ORNAMENT_DURATION),
  ...themePlain(PLAIN_DURATION + 2 * ANSWER_DURATION + ORNAMENT_DURATION),
  ...themeOrnamented(2 * PLAIN_DURATION + 2 * ANSWER_DURATION + ORNAMENT_DURATION),
  ...closing(2 * PLAIN_DURATION + 2 * ANSWER_DURATION + 2 * ORNAMENT_DURATION),
];

const LAST_MS = EVENTS[EVENTS.length - 1]?.atMs ?? 0;
const partialNotes = EVENTS.slice(0, 50);

export const chopinNocturneSong: SongDefinition = {
  id: 'chopin-nocturne',
  title: 'Nocturne Op. 9 No. 2',
  artist: 'Frédéric Chopin',
  descriptionKey: 'tutorial.songs.chopinNocturne.description',
  previewDurationMs: Math.min(12000, LAST_MS + Q),
  events: EVENTS,
  partialWindowMs: {
    startMs: partialNotes[0]?.atMs ?? 0,
    endMs: partialNotes[partialNotes.length - 1]?.atMs ?? LAST_MS,
  },
};
