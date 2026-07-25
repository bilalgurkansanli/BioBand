import type { NoteId } from '../pianoNotes';
import type { SongDefinition, SongEvent } from './types';

// Sezen Aksu — "Biliyorsun" (Ağlamak Güzeldir, 1981)
// Musa Çetiner / kolaynota.com — Easy Piano, Am, 6/8 (Do#→Db, Sol#→Ab).
// Full treble: opening chorus → bridge → chorus repeat + 1st/2nd endings.
const E = 300; // eighth (6/8 pulse)
const BAR = 6 * E;
const BAR38 = 3 * E;

type Ev = SongEvent;

function phrase(
  startMs: number,
  noteIds: NoteId[],
  spanMs: number = BAR,
): Ev[] {
  if (noteIds.length === 0) {
    return [];
  }
  if (noteIds.length === 1) {
    return [{ noteId: noteIds[0], atMs: startMs }];
  }
  const step = spanMs / noteIds.length;
  return noteIds.map((noteId, i) => ({
    noteId,
    atMs: Math.round(startMs + i * step),
  }));
}

function bar6(startBar: number, noteIds: NoteId[]): Ev[] {
  return phrase(startBar * BAR, noteIds, BAR);
}

/** Sixteenth of the 6/8 pulse — the finest value this tune actually uses. */
const S = E / 2;

/**
 * Snap every onset to the nearest sixteenth.
 *
 * `phrase()` divides the bar evenly by the number of syllables, which is right
 * for the six-note bars — they come out as plain eighths — but an eight-note
 * bar lands on 225ms steps, a value 6/8 does not contain. Those notes fall
 * between the beats and the tune reads as slightly wrong rather than as
 * syncopated. Pitches and order are untouched.
 */
function snapToGrid(): (event: Ev) => Ev {
  let previous = -Infinity;
  return (event) => {
    const snapped = Math.max(previous, Math.round(event.atMs / S) * S);
    previous = snapped;
    return { ...event, atMs: snapped };
  };
}

/** M1–8 / M28–34 — "Sen de benim kadar… biliyorsun" */
function chorusOpen(startBar: number): Ev[] {
  const b = startBar;
  return [
    ...bar6(b, ['E4', 'A4', 'G4', 'A4', 'G4', 'G4']),
    ...bar6(b + 1, ['F4', 'G4', 'F4', 'F4', 'E4', 'F4', 'E4', 'D4']),
    ...bar6(b + 2, ['D4', 'G4', 'F4', 'G4', 'F4', 'F4']),
    ...bar6(b + 3, ['E4', 'F4', 'E4', 'E4', 'D4', 'E4', 'D4', 'C4']),
    ...bar6(b + 4, ['C4', 'F4', 'E4', 'F4', 'E4', 'E4']),
    ...bar6(b + 5, ['D4', 'E4', 'D4', 'D4', 'C4', 'D4', 'C4', 'B4']),
    ...bar6(b + 6, ['B4', 'E4', 'D4', 'E4', 'D4', 'D4']),
  ];
}

const BILIYORSUN_MELODY: Ev[] = [
  // Opening chorus + final bar of couplet (M1–8)
  ...chorusOpen(0),
  ...bar6(7, ['C4', 'D4', 'C4', 'C4', 'B4', 'C4', 'B4', 'A4']),

  // Bridge (M9–17)
  ...bar6(8, ['E4', 'F4', 'G4', 'A4', 'G4', 'F4', 'E4']),
  ...bar6(9, ['E4', 'F4', 'F4', 'E4', 'C4', 'B4', 'A4']),
  ...bar6(10, ['A4', 'G4', 'F4', 'E4']),
  ...bar6(11, ['E4', 'F4', 'E4', 'D4', 'C4', 'B4', 'A4']),
  ...bar6(12, ['A4', 'G4', 'F4']),
  ...bar6(13, ['F4', 'G4', 'F4', 'D4', 'C4', 'B4']),
  ...bar6(14, ['A4', 'A4', 'G4', 'F4']),
  ...bar6(15, ['E4', 'F4', 'E4']),
  ...bar6(16, ['C4', 'B4', 'A4']),

  // M18 (3/8) + scale into M19
  ...phrase(17 * BAR, ['A4', 'G4', 'F4', 'E4'], BAR38),
  ...phrase(17 * BAR + BAR38, ['E4', 'F4', 'G4', 'A4', 'B4'], BAR38),

  // M19–26
  ...phrase(18 * BAR, ['A4', 'B4', 'A4'], BAR),
  ...phrase(19 * BAR, ['D4', 'C4', 'B4', 'A4', 'Ab4'], BAR),
  ...phrase(20 * BAR, ['A4', 'B4', 'B4', 'C5', 'B4'], BAR),
  ...phrase(21 * BAR, ['F4', 'E4', 'D4', 'C4', 'C4', 'D4', 'E4'], BAR),
  ...phrase(22 * BAR, ['E4', 'F4', 'E4', 'G4', 'F4', 'E4'], BAR),
  ...phrase(23 * BAR, ['A4', 'A4', 'G4', 'F4', 'B4', 'B4'], BAR),
  ...phrase(24 * BAR, ['A4', 'G4', 'A4', 'A4', 'G4', 'F4'], BAR),
  ...phrase(25 * BAR, ['G4', 'G4', 'F4', 'E4', 'E4', 'Ab4'], BAR),

  // Page 2 — chorus repeat (M28–34) + 1st ending (M35) + 2nd ending (M36–37)
  ...chorusOpen(27),
  ...bar6(34, ['D4', 'C4', 'C4', 'B4', 'C4', 'D4', 'E4']),
  ...bar6(35, ['E4', 'F4', 'G4', 'A4', 'G4', 'F4', 'E4']),
  ...bar6(36, ['D4', 'C4', 'C4', 'B4', 'C4', 'B4', 'A4']),
]
  .sort((a, b) => a.atMs - b.atMs)
  .map(snapToGrid());

/**
 * Chord root for each dotted-quarter beat of the bar, in La minor.
 * The chorus is one long stepwise descent stated four times, each two bars
 * lower than the last — every one of those bars spells the root and fifth of a
 * link in the diatonic circle Am–Dm–G–C–F–B°–E–Am, so that is what it takes.
 * The bridge stays on Am until the Sol# turns up (bars 19 and 25), which is
 * the E dominant and nothing else.
 * Written on the keyboard and sounded an octave down, under a tune that lives
 * between Do4 and Do5.
 */
const CHORUS_ROOTS: NoteId[] = ['A4', 'D4', 'G4', 'C4', 'F4', 'B4', 'E4'];

const HALF_BAR_ROOTS: [NoteId, NoteId][] = [
  // Opening chorus (M1–8)
  ...CHORUS_ROOTS.map((root): [NoteId, NoteId] => [root, root]),
  ['A4', 'A4'],
  // Bridge (M9–17)
  ['A4', 'A4'], ['A4', 'A4'], ['A4', 'A4'], ['A4', 'A4'],
  ['F4', 'F4'], ['G4', 'G4'], ['A4', 'A4'], ['A4', 'A4'], ['A4', 'A4'],
  // M18 — the two 3/8 halves: tonic, then the scale up on E
  ['A4', 'E4'],
  // M19–26
  ['A4', 'A4'], ['E4', 'E4'], ['A4', 'A4'], ['A4', 'A4'], ['C4', 'C4'],
  ['G4', 'G4'], ['A4', 'A4'], ['C4', 'E4'],
  // M27 — the tune rests; the dominant holds into the repeat
  ['E4', 'E4'],
  // Chorus repeat (M28–34) + endings (M35–37)
  ...CHORUS_ROOTS.map((root): [NoteId, NoteId] => [root, root]),
  ['A4', 'A4'], ['A4', 'A4'], ['A4', 'A4'],
];

/** Root on each of the two dotted-quarter beats — the 6/8 sway. */
const BASS: Ev[] = HALF_BAR_ROOTS.flatMap(([first, second], barIndex) =>
  [first, second].map((noteId, half) => ({
    noteId,
    atMs: barIndex * BAR + half * BAR38,
    durationMs: BAR38,
    role: 'accompaniment' as const,
    transpose: -12,
  })),
);

const BILIYORSUN_EVENTS: Ev[] = [...BILIYORSUN_MELODY, ...BASS].sort(
  (a, b) => a.atMs - b.atMs,
);

const LAST_MS = BILIYORSUN_MELODY[BILIYORSUN_MELODY.length - 1]?.atMs ?? 0;

// Partial ≈ opening "Sen de benim kadar… biliyorsun" (~50 notes)
// Counted over the tune — the bass runs underneath the whole excerpt.
const openingChorus = BILIYORSUN_MELODY.filter((e) => e.atMs < 8 * BAR);
const partialNotes = openingChorus.slice(0, 50);

export const biliyorsunSong: SongDefinition = {
  id: 'biliyorsun',
  title: 'Biliyorsun',
  artist: 'Sezen Aksu',
  descriptionKey: 'tutorial.songs.biliyorsun.description',
  previewDurationMs: Math.min(12000, LAST_MS + E),
  events: BILIYORSUN_EVENTS,
  meter: { beatMs: E, beatsPerBar: 6 },
  partialWindowMs: {
    startMs: partialNotes[0]?.atMs ?? 0,
    endMs: partialNotes[partialNotes.length - 1]?.atMs ?? LAST_MS,
  },
};
