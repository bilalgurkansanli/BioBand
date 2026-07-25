import type { NoteId } from '../pianoNotes';
import type { SongDefinition, SongEvent } from './types';

// Jingle Bells — Michael Kravchuk lead sheet (F major, 4/4).
// Form: Verse + Chorus + Verse + Chorus (≥50 notes; full sing-along).
// Quarter ≈ 480ms (~125bpm).
const Q = 480;
const H = 2 * Q;
const W = 4 * Q;
const BAR = 4 * Q;

type Ev = SongEvent;

function bar(startBar: number, notes: [NoteId, number][]): Ev[] {
  const t0 = startBar * BAR;
  return notes.map(([noteId, offset]) => ({ noteId, atMs: t0 + offset }));
}

/** Shift every event by `barOffset` bars (for repeating sections). */
function atBars(events: Ev[], barOffset: number): Ev[] {
  const shift = barOffset * BAR;
  return events.map((event) => ({
    noteId: event.noteId,
    atMs: event.atMs + shift,
  }));
}

/** Bars 0–15 relative — "Dashing through the snow…" */
const VERSE: Ev[] = [
  ...bar(0, [
    ['C4', 0],
    ['A4', Q],
    ['G4', 2 * Q],
    ['F4', 3 * Q],
  ]),
  ...bar(1, [['C4', 0]]),
  ...bar(2, [
    ['C4', 0],
    ['A4', Q],
    ['G4', 2 * Q],
    ['F4', 3 * Q],
  ]),
  ...bar(3, [['D4', 0]]),
  ...bar(4, [
    ['D4', 0],
    ['Bb4', Q],
    ['A4', 2 * Q],
    ['G4', 3 * Q],
  ]),
  ...bar(5, [['E4', 0]]),
  ...bar(6, [
    ['C5', 0],
    ['C5', Q],
    ['Bb4', 2 * Q],
    ['G4', 3 * Q],
  ]),
  ...bar(7, [['A4', 0]]),
  ...bar(8, [
    ['C4', 0],
    ['A4', Q],
    ['G4', 2 * Q],
    ['F4', 3 * Q],
  ]),
  ...bar(9, [['C4', 0]]),
  ...bar(10, [
    ['C4', 0],
    ['A4', Q],
    ['G4', 2 * Q],
    ['F4', 3 * Q],
  ]),
  ...bar(11, [['D4', 0]]),
  ...bar(12, [
    ['D4', 0],
    ['Bb4', Q],
    ['A4', 2 * Q],
    ['G4', 3 * Q],
  ]),
  ...bar(13, [
    ['C5', 0],
    ['C5', Q],
    ['C5', 2 * Q],
    ['C5', 3 * Q],
  ]),
  ...bar(14, [
    ['D5', 0],
    ['C5', Q],
    ['Bb4', 2 * Q],
    ['G4', 3 * Q],
  ]),
  ...bar(15, [['F4', 0]]),
];

/** Bars 0–15 relative — "Jingle bells…" through final "sleigh!" */
const CHORUS: Ev[] = [
  ...bar(0, [
    ['A4', 0],
    ['A4', Q],
    ['A4', 2 * Q],
  ]),
  ...bar(1, [
    ['A4', 0],
    ['A4', Q],
    ['A4', 2 * Q],
  ]),
  ...bar(2, [
    ['A4', 0],
    ['C5', Q],
    ['F4', 2 * Q],
    ['G4', 3 * Q],
  ]),
  ...bar(3, [['A4', 0]]),
  ...bar(4, [
    ['Bb4', 0],
    ['Bb4', Q],
    ['Bb4', 2 * Q],
    ['Bb4', 3 * Q],
  ]),
  ...bar(5, [
    ['Bb4', 0],
    ['A4', Q],
    ['A4', 2 * Q],
    ['A4', 3 * Q],
  ]),
  ...bar(6, [
    ['A4', 0],
    ['G4', Q],
    ['G4', 2 * Q],
    ['A4', 3 * Q],
  ]),
  ...bar(7, [
    ['G4', 0],
    ['C5', H],
  ]),
  ...bar(8, [
    ['A4', 0],
    ['A4', Q],
    ['A4', 2 * Q],
  ]),
  ...bar(9, [
    ['A4', 0],
    ['A4', Q],
    ['A4', 2 * Q],
  ]),
  ...bar(10, [
    ['A4', 0],
    ['C5', Q],
    ['F4', 2 * Q],
    ['G4', 3 * Q],
  ]),
  ...bar(11, [['A4', 0]]),
  ...bar(12, [
    ['Bb4', 0],
    ['Bb4', Q],
    ['Bb4', 2 * Q],
    ['Bb4', 3 * Q],
  ]),
  ...bar(13, [
    ['Bb4', 0],
    ['A4', Q],
    ['A4', 2 * Q],
    ['A4', 3 * Q],
  ]),
  ...bar(14, [
    ['C5', 0],
    ['C5', Q],
    ['Bb4', 2 * Q],
    ['G4', 3 * Q],
  ]),
  ...bar(15, [['F4', 0]]),
];

// Chord roots per bar, from the lead sheet's F / Bb / C7 harmony. Written on
// the keyboard and sounded an octave down — a bass in the melody's own two
// octaves would just crowd the tune.
const VERSE_ROOTS: NoteId[] = [
  'F4', 'F4', 'F4', 'F4',
  'Bb4', 'C4', 'C4', 'F4',
  'F4', 'F4', 'F4', 'F4',
  'Bb4', 'C4', 'C4', 'F4',
];
const CHORUS_ROOTS: NoteId[] = [
  'F4', 'F4', 'F4', 'F4',
  'Bb4', 'Bb4', 'F4', 'C4',
  'F4', 'F4', 'F4', 'F4',
  'Bb4', 'Bb4', 'C4', 'F4',
];

/** Root on beats 1 and 3 — the sleigh-ride two-feel under the tune. */
function bassLine(roots: NoteId[], barOffset: number): Ev[] {
  const events: Ev[] = [];
  roots.forEach((noteId, barIndex) => {
    for (const beat of [0, 2]) {
      events.push({
        noteId,
        atMs: (barOffset + barIndex) * BAR + beat * Q,
        durationMs: H,
        role: 'accompaniment',
        transpose: -12,
      });
    }
  });
  return events;
}

// Verse → Chorus → Verse → Chorus (64 bars)
const MELODY: Ev[] = [
  ...atBars(VERSE, 0),
  ...atBars(CHORUS, 16),
  ...atBars(VERSE, 32),
  ...atBars(CHORUS, 48),
];

const JINGLE_BELLS_EVENTS: Ev[] = [
  ...MELODY,
  ...bassLine(VERSE_ROOTS, 0),
  ...bassLine(CHORUS_ROOTS, 16),
  ...bassLine(VERSE_ROOTS, 32),
  ...bassLine(CHORUS_ROOTS, 48),
].sort((a, b) => a.atMs - b.atMs);

const LAST_MS = MELODY[MELODY.length - 1]?.atMs ?? 0;

// "Bir kısmı": 1-based notes 46–96 (51 notes) — mostly first chorus into verse 2.
const PARTIAL_START_INDEX = 45; // 1-based note 46
const PARTIAL_END_INDEX = 95; // 1-based note 96 (inclusive)
// Counted over the tune — the bass runs underneath the whole excerpt.
const partialFirst = MELODY[PARTIAL_START_INDEX];
const partialLast = MELODY[PARTIAL_END_INDEX];

export const jingleBellsSong: SongDefinition = {
  id: 'jingle-bells',
  title: 'Jingle Bells',
  artist: 'James Lord Pierpont',
  descriptionKey: 'tutorial.songs.jingleBells.description',
  previewDurationMs: Math.min(12000, LAST_MS + W),
  events: JINGLE_BELLS_EVENTS,
  meter: { beatMs: Q, beatsPerBar: 4 },
  partialWindowMs:
    partialFirst && partialLast
      ? {
          startMs: partialFirst.atMs,
          endMs: partialLast.atMs,
        }
      : undefined,
};
