import type { NoteId } from '../pianoNotes';
import type { SongDefinition } from './types';

// Mozart — Rondo Alla Turca (Türk Marşı), K.331
// Musa Çetiner kolaynota — 2/4, Am. Sol#→Ab, Re#→Eb, Fa#→Gb.
// Melody only. Final return uses A–B–C–B cadence (not the G–F#–E turn).
// Quarter ≈ 440ms.
const Q = 440;
const E = Q / 2;
const S = Q / 4;
const BAR = 2 * Q;

type Ev = { noteId: NoteId; atMs: number };

function at(bar: number, offset: number, noteId: NoteId): Ev {
  return { noteId, atMs: bar * BAR + offset };
}

/**
 * A theme. `cBar` = bar where Do lands (downbeat).
 * Pickup sits on the previous upbeat. Cadence Mi is E4 (same octave as Sol–Fa#), not E5.
 */
function themeA(cBar: number, pickupBeat: number = Q): Ev[] {
  const pBar = cBar - 1;
  return [
    // Pickup: Si La Sol# La
    at(pBar, pickupBeat, 'B4'),
    at(pBar, pickupBeat + S, 'A4'),
    at(pBar, pickupBeat + 2 * S, 'Ab4'),
    at(pBar, pickupBeat + 3 * S, 'A4'),
    // Do | Re Do Si Do
    at(cBar, 0, 'C5'),
    at(cBar, Q, 'D5'),
    at(cBar, Q + S, 'C5'),
    at(cBar, Q + 2 * S, 'B4'),
    at(cBar, Q + 3 * S, 'C5'),
    // Mi | Fa Mi Re# Mi
    at(cBar + 1, 0, 'E5'),
    at(cBar + 1, Q, 'F5'),
    at(cBar + 1, Q + S, 'E5'),
    at(cBar + 1, Q + 2 * S, 'Eb5'),
    at(cBar + 1, Q + 3 * S, 'E5'),
    // Si La Sol# La ×2
    at(cBar + 2, 0, 'B4'),
    at(cBar + 2, S, 'A4'),
    at(cBar + 2, 2 * S, 'Ab4'),
    at(cBar + 2, 3 * S, 'A4'),
    at(cBar + 2, Q, 'B4'),
    at(cBar + 2, Q + S, 'A4'),
    at(cBar + 2, Q + 2 * S, 'Ab4'),
    at(cBar + 2, Q + 3 * S, 'A4'),
    // Do | La Do
    at(cBar + 3, 0, 'C5'),
    at(cBar + 3, Q, 'A4'),
    at(cBar + 3, Q + E, 'C5'),
    // Si La Sol La ×2 | Si La Sol Fa# | Mi (E4 — step down from Gb4)
    at(cBar + 4, 0, 'B4'),
    at(cBar + 4, S, 'A4'),
    at(cBar + 4, 2 * S, 'G4'),
    at(cBar + 4, 3 * S, 'A4'),
    at(cBar + 4, Q, 'B4'),
    at(cBar + 4, Q + S, 'A4'),
    at(cBar + 4, Q + 2 * S, 'G4'),
    at(cBar + 4, Q + 3 * S, 'A4'),
    at(cBar + 5, 0, 'B4'),
    at(cBar + 5, S, 'A4'),
    at(cBar + 5, 2 * S, 'G4'),
    at(cBar + 5, 3 * S, 'Gb4'),
    at(cBar + 5, Q, 'E4'),
  ];
}

/** B section (contrast). */
function middle(startBar: number): Ev[] {
  const b = startBar;
  return [
    // Mi Fa | Sol Sol | La Sol Fa Mi | Re
    at(b, 0, 'E5'),
    at(b, E, 'F5'),
    at(b, Q, 'G5'),
    at(b, Q + E, 'G5'),
    at(b + 1, 0, 'A5'),
    at(b + 1, S, 'G5'),
    at(b + 1, 2 * S, 'F5'),
    at(b + 1, 3 * S, 'E5'),
    at(b + 1, Q, 'D5'),
    at(b + 2, 0, 'E5'),
    at(b + 2, E, 'F5'),
    at(b + 2, Q, 'G5'),
    at(b + 2, Q + E, 'G5'),
    at(b + 3, 0, 'A5'),
    at(b + 3, S, 'G5'),
    at(b + 3, 2 * S, 'F5'),
    at(b + 3, 3 * S, 'E5'),
    at(b + 3, Q, 'D5'),
    // Do Re | Mi Mi | Fa Mi Re Do | Do  (first ending on Do)
    at(b + 4, 0, 'C5'),
    at(b + 4, E, 'D5'),
    at(b + 4, Q, 'E5'),
    at(b + 4, Q + E, 'E5'),
    at(b + 5, 0, 'F5'),
    at(b + 5, S, 'E5'),
    at(b + 5, 2 * S, 'D5'),
    at(b + 5, 3 * S, 'C5'),
    at(b + 5, Q, 'C5'),
    // Do Re | Mi Mi | Fa Mi Re Do | Si
    at(b + 6, 0, 'C5'),
    at(b + 6, E, 'D5'),
    at(b + 6, Q, 'E5'),
    at(b + 6, Q + E, 'E5'),
    at(b + 7, 0, 'F5'),
    at(b + 7, S, 'E5'),
    at(b + 7, 2 * S, 'D5'),
    at(b + 7, 3 * S, 'C5'),
    at(b + 7, Q, 'B4'),
  ];
}

/**
 * Final A return — after Do, the G–Fa#–Mi turn is NOT used.
 * Sheet cadence: La Si | Do Si | La Sol# | La Mi Fa Re | Do Si | La
 */
function themeAClose(cBar: number): Ev[] {
  const pBar = cBar - 1;
  return [
    at(pBar, 0, 'B4'),
    at(pBar, S, 'A4'),
    at(pBar, 2 * S, 'Ab4'),
    at(pBar, 3 * S, 'A4'),
    at(cBar, 0, 'C5'),
    at(cBar, Q, 'D5'),
    at(cBar, Q + S, 'C5'),
    at(cBar, Q + 2 * S, 'B4'),
    at(cBar, Q + 3 * S, 'C5'),
    at(cBar + 1, 0, 'E5'),
    at(cBar + 1, Q, 'F5'),
    at(cBar + 1, Q + S, 'E5'),
    at(cBar + 1, Q + 2 * S, 'Eb5'),
    at(cBar + 1, Q + 3 * S, 'E5'),
    at(cBar + 2, 0, 'B4'),
    at(cBar + 2, S, 'A4'),
    at(cBar + 2, 2 * S, 'Ab4'),
    at(cBar + 2, 3 * S, 'A4'),
    at(cBar + 2, Q, 'B4'),
    at(cBar + 2, Q + S, 'A4'),
    at(cBar + 2, Q + 2 * S, 'Ab4'),
    at(cBar + 2, Q + 3 * S, 'A4'),
    // Do — then 2nd ending (not Sol–Fa#–Mi)
    at(cBar + 3, 0, 'C5'),
    at(cBar + 3, Q, 'A4'),
    at(cBar + 3, Q + E, 'B4'),
    at(cBar + 4, 0, 'C5'),
    at(cBar + 4, E, 'B4'),
    at(cBar + 4, Q, 'A4'),
    at(cBar + 4, Q + E, 'Ab4'),
    at(cBar + 5, 0, 'A4'),
    at(cBar + 5, S, 'E5'),
    at(cBar + 5, 2 * S, 'F5'),
    at(cBar + 5, 3 * S, 'D5'),
    at(cBar + 5, Q, 'C5'),
    at(cBar + 5, Q + E, 'B4'),
    at(cBar + 6, 0, 'A4'),
  ];
}

// 2nd A pickup on the beat right after Mi (E 8th + pickup), no empty bar.
const EVENTS: Ev[] = [
  ...themeA(1, Q),
  ...themeA(8, 0),
  ...middle(14),
  ...themeAClose(23),
];

const LAST_MS = EVENTS[EVENTS.length - 1]?.atMs ?? 0;

const themeNotes = EVENTS.filter((e) => e.atMs < 8 * BAR);
const partialNotes =
  themeNotes.length >= 50
    ? themeNotes.slice(0, 50)
    : EVENTS.slice(0, 50);

export const turkMarsiSong: SongDefinition = {
  id: 'turk-marsi',
  title: 'Türk Marşı',
  artist: 'Wolfgang Amadeus Mozart',
  descriptionKey: 'tutorial.songs.turkMarsi.description',
  previewDurationMs: Math.min(12000, LAST_MS + Q),
  events: EVENTS,
  partialWindowMs: {
    startMs: partialNotes[0]?.atMs ?? 0,
    endMs: partialNotes[partialNotes.length - 1]?.atMs ?? LAST_MS,
  },
};
