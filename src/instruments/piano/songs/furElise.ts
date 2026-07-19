import type { NoteId } from '../pianoNotes';
import type { SongDefinition } from './types';

// Beethoven — Für Elise, WoO 59 (public domain). A-B-A rondo excerpt:
// the famous A-minor opening theme, the flowing F-major middle section,
// then the theme's return.
// Quarter note ≈ 450ms.
const Q = 450;
const E = Q / 2;

type Ev = { noteId: NoteId; atMs: number };

/** The famous 8-bar theme. `endNotes` supplies the differing 1st/2nd ending. */
function theme(startMs: number, endNotes: NoteId[]): Ev[] {
  const t = startMs;
  const events: Ev[] = [
    { noteId: 'E5', atMs: t },
    { noteId: 'Eb5', atMs: t + E },
    { noteId: 'E5', atMs: t + Q },
    { noteId: 'Eb5', atMs: t + Q + E },
    { noteId: 'E5', atMs: t + 2 * Q },
    { noteId: 'B4', atMs: t + 2 * Q + E },
    { noteId: 'D5', atMs: t + 3 * Q },
    { noteId: 'C5', atMs: t + 3 * Q + E },
    { noteId: 'A4', atMs: t + 4 * Q },
    { noteId: 'C4', atMs: t + 5 * Q },
    { noteId: 'E4', atMs: t + 5 * Q + E },
    { noteId: 'A4', atMs: t + 6 * Q },
    { noteId: 'B4', atMs: t + 7 * Q },
  ];
  endNotes.forEach((noteId, i) => {
    events.push({ noteId, atMs: t + 8 * Q + i * Q });
  });
  return events;
}

/** Flowing F-major middle section (B). */
function sectionB(startMs: number): Ev[] {
  const t = startMs;
  return [
    { noteId: 'C4', atMs: t },
    { noteId: 'F4', atMs: t + E },
    { noteId: 'A4', atMs: t + Q },
    { noteId: 'C5', atMs: t + Q + E },
    { noteId: 'F5', atMs: t + 2 * Q },
    { noteId: 'E5', atMs: t + 3 * Q },
    { noteId: 'F5', atMs: t + 3 * Q + E },
    { noteId: 'A4', atMs: t + 4 * Q },
    { noteId: 'C5', atMs: t + 4 * Q + E },
    { noteId: 'D5', atMs: t + 5 * Q },
    { noteId: 'B4', atMs: t + 5 * Q + E },
    { noteId: 'G4', atMs: t + 6 * Q },
    { noteId: 'B4', atMs: t + 6 * Q + E },
    { noteId: 'D5', atMs: t + 7 * Q },
    { noteId: 'C5', atMs: t + 7 * Q + E },
    { noteId: 'C4', atMs: t + 8 * Q },
    { noteId: 'F4', atMs: t + 8 * Q + E },
    { noteId: 'A4', atMs: t + 9 * Q },
    { noteId: 'C5', atMs: t + 9 * Q + E },
    { noteId: 'F5', atMs: t + 10 * Q },
    { noteId: 'E5', atMs: t + 11 * Q },
    { noteId: 'F5', atMs: t + 11 * Q + E },
    { noteId: 'A4', atMs: t + 12 * Q },
    { noteId: 'C5', atMs: t + 12 * Q + E },
    // Rising run back toward the theme's opening E.
    { noteId: 'B4', atMs: t + 13 * Q },
    { noteId: 'C5', atMs: t + 13 * Q + E },
    { noteId: 'D5', atMs: t + 14 * Q },
    { noteId: 'Eb5', atMs: t + 14 * Q + E },
    { noteId: 'E5', atMs: t + 15 * Q },
  ];
}

const THEME_A_DURATION = 8 * Q + 4 * Q; // theme body + 4-note ending
const SECTION_B_DURATION = 16 * Q;

const EVENTS: Ev[] = [
  ...theme(0, ['E4', 'Ab4', 'B4', 'C5', 'E4']),
  ...theme(THEME_A_DURATION, ['D5', 'C5', 'B4', 'A4']),
  ...sectionB(2 * THEME_A_DURATION),
  ...theme(2 * THEME_A_DURATION + SECTION_B_DURATION, ['E4', 'Ab4', 'B4', 'C5', 'E4']),
  ...theme(3 * THEME_A_DURATION + SECTION_B_DURATION, ['D5', 'C5', 'B4', 'A4']),
  ...sectionB(4 * THEME_A_DURATION + SECTION_B_DURATION),
  ...theme(4 * THEME_A_DURATION + 2 * SECTION_B_DURATION, ['E4', 'Ab4', 'B4', 'C5', 'E4']),
  ...theme(5 * THEME_A_DURATION + 2 * SECTION_B_DURATION, ['D5', 'C5', 'B4', 'A4']),
];

const LAST_MS = EVENTS[EVENTS.length - 1]?.atMs ?? 0;
const partialNotes = EVENTS.slice(0, 50);

export const furEliseSong: SongDefinition = {
  id: 'fur-elise',
  title: 'Für Elise',
  artist: 'Ludwig van Beethoven',
  descriptionKey: 'tutorial.songs.furElise.description',
  previewDurationMs: Math.min(12000, LAST_MS + Q),
  events: EVENTS,
  partialWindowMs: {
    startMs: partialNotes[0]?.atMs ?? 0,
    endMs: partialNotes[partialNotes.length - 1]?.atMs ?? LAST_MS,
  },
};
