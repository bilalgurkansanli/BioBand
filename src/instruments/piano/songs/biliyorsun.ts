import type { NoteId } from '../pianoNotes';
import type { SongDefinition } from './types';

// Sezen Aksu — "Biliyorsun" (Ağlamak Güzeldir, 1981)
// Musa Çetiner / kolaynota.com — Easy Piano, Am, 6/8 (Do#→Db, Sol#→Ab).
// Full treble: opening chorus → bridge → chorus repeat + 1st/2nd endings.
const E = 300; // eighth (6/8 pulse)
const BAR = 6 * E;
const BAR38 = 3 * E;

type Ev = { noteId: NoteId; atMs: number };

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

const BILIYORSUN_EVENTS: Ev[] = [
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
];

const LAST_MS = BILIYORSUN_EVENTS[BILIYORSUN_EVENTS.length - 1]?.atMs ?? 0;

// Partial ≈ opening "Sen de benim kadar… biliyorsun" (~50 notes)
const openingChorus = BILIYORSUN_EVENTS.filter((e) => e.atMs < 8 * BAR);
const partialNotes = openingChorus.slice(0, 50);

export const biliyorsunSong: SongDefinition = {
  id: 'biliyorsun',
  title: 'Biliyorsun',
  artist: 'Sezen Aksu',
  descriptionKey: 'tutorial.songs.biliyorsun.description',
  previewDurationMs: Math.min(12000, LAST_MS + E),
  events: BILIYORSUN_EVENTS,
  partialWindowMs: {
    startMs: partialNotes[0]?.atMs ?? 0,
    endMs: partialNotes[partialNotes.length - 1]?.atMs ?? LAST_MS,
  },
};
