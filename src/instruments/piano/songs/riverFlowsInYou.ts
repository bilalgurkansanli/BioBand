import type { NoteId } from '../pianoNotes';
import type { SongDefinition } from './types';

// Yiruma — "River Flows in You" (2001). The signature repeating arpeggio
// theme (A major), followed by the piece's rising second theme.
// Quarter note ≈ 500ms.
const Q = 500;
const E = Q / 2;

type Ev = { noteId: NoteId; atMs: number };

/** The signature repeating figure: E-C#-E-C#-E-[top]-E-A. */
function cell(startMs: number, top: NoteId): Ev[] {
  return [
    { noteId: 'E5', atMs: startMs },
    { noteId: 'Db5', atMs: startMs + E },
    { noteId: 'E5', atMs: startMs + Q },
    { noteId: 'Db5', atMs: startMs + Q + E },
    { noteId: 'E5', atMs: startMs + 2 * Q },
    { noteId: top, atMs: startMs + 2 * Q + E },
    { noteId: 'E5', atMs: startMs + 3 * Q },
    { noteId: 'A4', atMs: startMs + 3 * Q + E },
  ];
}

/** Rising second theme — higher register, longer note values. */
function riseTheme(startMs: number): Ev[] {
  const t = startMs;
  return [
    { noteId: 'A4', atMs: t },
    { noteId: 'B4', atMs: t + Q },
    { noteId: 'Db5', atMs: t + 2 * Q },
    { noteId: 'E5', atMs: t + 3 * Q },
    { noteId: 'Db5', atMs: t + 4 * Q },
    { noteId: 'B4', atMs: t + 5 * Q },
    { noteId: 'A4', atMs: t + 6 * Q },
    { noteId: 'Gb4', atMs: t + 7 * Q },
    { noteId: 'A4', atMs: t + 8 * Q },
    { noteId: 'B4', atMs: t + 9 * Q },
    { noteId: 'Db5', atMs: t + 10 * Q },
    { noteId: 'E5', atMs: t + 11 * Q },
    { noteId: 'Gb5', atMs: t + 12 * Q },
    { noteId: 'E5', atMs: t + 13 * Q },
    { noteId: 'Db5', atMs: t + 14 * Q },
    { noteId: 'B4', atMs: t + 15 * Q },
    { noteId: 'A4', atMs: t + 16 * Q },
  ];
}

const CELL_DURATION = 4 * Q;
const RISE_DURATION = 17 * Q;

const EVENTS: Ev[] = [
  ...cell(0, 'B4'),
  ...cell(CELL_DURATION, 'B4'),
  ...cell(2 * CELL_DURATION, 'Db5'),
  ...cell(3 * CELL_DURATION, 'Db5'),
  ...riseTheme(4 * CELL_DURATION),
  ...cell(4 * CELL_DURATION + RISE_DURATION, 'B4'),
  ...cell(4 * CELL_DURATION + RISE_DURATION + CELL_DURATION, 'Db5'),
  ...cell(4 * CELL_DURATION + RISE_DURATION + 2 * CELL_DURATION, 'Db5'),
  ...cell(4 * CELL_DURATION + RISE_DURATION + 3 * CELL_DURATION, 'B4'),
  ...cell(4 * CELL_DURATION + RISE_DURATION + 4 * CELL_DURATION, 'A4'),
  ...riseTheme(4 * CELL_DURATION + RISE_DURATION + 5 * CELL_DURATION),
  ...cell(4 * CELL_DURATION + 2 * RISE_DURATION + 5 * CELL_DURATION, 'B4'),
  ...cell(4 * CELL_DURATION + 2 * RISE_DURATION + 6 * CELL_DURATION, 'Db5'),
  ...cell(4 * CELL_DURATION + 2 * RISE_DURATION + 7 * CELL_DURATION, 'B4'),
  ...cell(4 * CELL_DURATION + 2 * RISE_DURATION + 8 * CELL_DURATION, 'A4'),
];

const LAST_MS = EVENTS[EVENTS.length - 1]?.atMs ?? 0;
const partialNotes = EVENTS.slice(0, 50);

export const riverFlowsInYouSong: SongDefinition = {
  id: 'river-flows-in-you',
  title: 'River Flows in You',
  artist: 'Yiruma',
  descriptionKey: 'tutorial.songs.riverFlowsInYou.description',
  previewDurationMs: Math.min(12000, LAST_MS + Q),
  events: EVENTS,
  partialWindowMs: {
    startMs: partialNotes[0]?.atMs ?? 0,
    endMs: partialNotes[partialNotes.length - 1]?.atMs ?? LAST_MS,
  },
};
