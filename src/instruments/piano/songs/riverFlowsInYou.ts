import type { NoteId } from '../pianoNotes';
import type { SongDefinition, SongEvent } from './types';

// Yiruma — "River Flows in You" (2001). The signature repeating arpeggio
// theme (A major), followed by the piece's rising second theme.
// Quarter note ≈ 500ms.
const Q = 500;
const E = Q / 2;

type Ev = SongEvent;

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

/**
 * Root on beats 1 and 3 of one bar. The theme spells nothing but an A major
 * triad (E-C#-E-C#-E-…-E-A, landing on its own A), so every cell takes A; the
 * rising theme dips to F#m for the bar that turns on C#-B-A-F#, which is the
 * only bar in the piece whose notes exclude the tonic third. Written on the
 * keyboard and sounded an octave down, under an arpeggio that already owns the
 * middle of the range.
 */
function bassBar(startMs: number, noteId: NoteId, beats = 4): Ev[] {
  const hits = beats >= 3 ? [0, 2] : [0];
  return hits.map((beat) => ({
    noteId,
    atMs: startMs + beat * Q,
    durationMs: Math.min(2, beats - beat) * Q,
    role: 'accompaniment' as const,
    transpose: -12,
  }));
}

/** One A bar under a cell. */
function cellBass(startMs: number): Ev[] {
  return bassBar(startMs, 'A4');
}

/** A | F#m | A | A | A — the rise is 17 beats, so its last bar is one beat. */
function riseBass(startMs: number): Ev[] {
  const roots: NoteId[] = ['A4', 'Gb4', 'A4', 'A4'];
  return [
    ...roots.flatMap((noteId, i) => bassBar(startMs + i * 4 * Q, noteId)),
    ...bassBar(startMs + 16 * Q, 'A4', 1),
  ];
}

const MELODY: Ev[] = [
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

// The rising theme is 17 beats, so it nudges everything after it off a global
// bar grid — the bass is laid out from the same section offsets as the tune
// instead of from bar 0, and no `meter` is declared for the same reason.
const CELL_STARTS = [
  0,
  CELL_DURATION,
  2 * CELL_DURATION,
  3 * CELL_DURATION,
  4 * CELL_DURATION + RISE_DURATION,
  4 * CELL_DURATION + RISE_DURATION + CELL_DURATION,
  4 * CELL_DURATION + RISE_DURATION + 2 * CELL_DURATION,
  4 * CELL_DURATION + RISE_DURATION + 3 * CELL_DURATION,
  4 * CELL_DURATION + RISE_DURATION + 4 * CELL_DURATION,
  4 * CELL_DURATION + 2 * RISE_DURATION + 5 * CELL_DURATION,
  4 * CELL_DURATION + 2 * RISE_DURATION + 6 * CELL_DURATION,
  4 * CELL_DURATION + 2 * RISE_DURATION + 7 * CELL_DURATION,
  4 * CELL_DURATION + 2 * RISE_DURATION + 8 * CELL_DURATION,
];
const RISE_STARTS = [
  4 * CELL_DURATION,
  4 * CELL_DURATION + RISE_DURATION + 5 * CELL_DURATION,
];

const EVENTS: Ev[] = [
  ...MELODY,
  ...CELL_STARTS.flatMap(cellBass),
  ...RISE_STARTS.flatMap(riseBass),
].sort((a, b) => a.atMs - b.atMs);

const LAST_MS = MELODY[MELODY.length - 1]?.atMs ?? 0;
// Counted over the tune — the bass runs underneath the whole excerpt.
const partialNotes = MELODY.slice(0, 50);

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
