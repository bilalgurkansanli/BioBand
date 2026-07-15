import type { NoteId } from '../pianoNotes';
import type { SongDefinition } from './types';

// Barış Manço — "Gülpembe" (music: Ahmet Güvenç)
// Source: gitaregitim.net PDF (Em, 4/4) + prior kolaynota intro cells.
// Treble/melody line only. F# → Gb; Dm uses F♮.
// Quarter ≈ 600ms (~100bpm).
const Q = 600;
const E = Q / 2;
const S = Q / 4;
const BAR = 4 * Q;

type Ev = { noteId: NoteId; atMs: number };

function at(bar: number, offset: number, noteId: NoteId): Ev {
  return { noteId, atMs: bar * BAR + offset };
}

/**
 * Iconic intro cell: Fa-Mi-Re → held Mi (F♮), then optional pickup.
 * Matches kolaynota / PDF opening riff.
 */
function introCell(
  bar: number,
  pickup: NoteId[] | null,
  pickupAt = 2 * Q + E,
): Ev[] {
  const out: Ev[] = [
    at(bar, 0, 'F4'),
    at(bar, S + 40, 'E4'), // ~triplet into
    at(bar, 2 * S + 80, 'D4'),
    at(bar, E + S, 'E4'), // held Mi
  ];
  if (pickup) {
    pickup.forEach((n, i) => {
      out.push(at(bar, pickupAt + i * E, n));
    });
  }
  return out;
}

/** Full intro (PDF bars 1–5 / kolaynota hook), played twice for substance. */
function intro(startBar: number): Ev[] {
  const b = startBar;
  return [
    // Opening held Mi (PDF), then cells
    at(b, 0, 'E4'),
    ...introCell(b + 1, ['B4', 'A4', 'B4']),
    ...introCell(b + 2, ['A4', 'B4', 'A4']),
    ...introCell(b + 3, ['G4', 'Gb4', 'G4']),
    ...introCell(b + 4, null),
  ];
}

/** "Sen gülünce güller açar Gülpembe / bülbüller seni söyler biz dinlerdik Gülpembe" */
function verseSenGulunce(startBar: number): Ev[] {
  const b = startBar;
  return [
    // Sen gülünce güller açar
    at(b, 0, 'A4'),
    at(b, E, 'A4'),
    at(b, Q, 'A4'),
    at(b, Q + E, 'G4'),
    at(b, 2 * Q, 'A4'),
    at(b, 2 * Q + E, 'E4'),
    at(b, 3 * Q, 'E4'),
    at(b, 3 * Q + E, 'Gb4'),
    // Gülpembe_
    at(b + 1, 0, 'G4'),
    at(b + 1, Q, 'A4'),
    at(b + 1, 2 * Q, 'B4'),
    at(b + 1, 3 * Q, 'A4'),
    // bülbüller seni söyler
    at(b + 2, 0, 'B4'),
    at(b + 2, E, 'B4'),
    at(b + 2, Q, 'A4'),
    at(b + 2, Q + E, 'G4'),
    at(b + 2, 2 * Q, 'Gb4'),
    at(b + 2, 3 * Q, 'E4'),
    // biz dinlerdik Gülpembe (G → Dm → Em)
    at(b + 3, 0, 'D4'),
    at(b + 3, E, 'E4'),
    at(b + 3, Q, 'Gb4'),
    at(b + 3, Q + E, 'G4'),
    at(b + 3, 2 * Q, 'A4'),
    at(b + 3, 2 * Q + E, 'G4'),
    at(b + 3, 3 * Q, 'F4'),
    at(b + 3, 3 * Q + E, 'E4'),
  ];
}

/** "Sen gelince bahar gelir Gülpembe / dereler seni çağlar" */
function verseSenGelince(startBar: number): Ev[] {
  const b = startBar;
  return [
    at(b, 0, 'A4'),
    at(b, E, 'A4'),
    at(b, Q, 'A4'),
    at(b, Q + E, 'G4'),
    at(b, 2 * Q, 'A4'),
    at(b, 2 * Q + E, 'E4'),
    at(b, 3 * Q, 'E4'),
    at(b, 3 * Q + E, 'Gb4'),
    at(b + 1, 0, 'G4'),
    at(b + 1, Q, 'A4'),
    at(b + 1, 2 * Q, 'B4'),
    at(b + 1, 3 * Q, 'A4'),
    // dereler seni çağlar
    at(b + 2, 0, 'B4'),
    at(b + 2, E, 'A4'),
    at(b + 2, Q, 'G4'),
    at(b + 2, Q + E, 'Gb4'),
    at(b + 2, 2 * Q, 'E4'),
    at(b + 2, 3 * Q, 'D4'),
  ];
}

/** "sevinirdik Gülpembe / Güz yağmurlarıyla bir gün göçtün gittin…" */
function verseSevinirdik(startBar: number): Ev[] {
  const b = startBar;
  return [
    // sevinirdik (D): Gb Gb Gb E Gb
    at(b, 0, 'Gb4'),
    at(b, E, 'Gb4'),
    at(b, Q, 'Gb4'),
    at(b, Q + E, 'E4'),
    at(b, 2 * Q, 'Gb4'),
    // gül pem (G → Dm)
    at(b + 1, 0, 'B4'),
    at(b + 1, Q, 'A4'),
    at(b + 1, 2 * Q, 'G4'),
    at(b + 1, 3 * Q, 'F4'),
    // be (Em) + pickup "Güz yağmurlarıyla"
    at(b + 2, 0, 'E4'),
    at(b + 2, 2 * Q, 'D4'),
    at(b + 2, 2 * Q + E, 'E4'),
    at(b + 2, 3 * Q, 'Gb4'),
    at(b + 2, 3 * Q + E, 'A4'),
    // bir gün göçtün gittin
    at(b + 3, 0, 'B4'),
    at(b + 3, E, 'A4'),
    at(b + 3, Q, 'G4'),
    at(b + 3, Q + E, 'E4'),
    at(b + 3, 2 * Q, 'D4'),
    at(b + 3, 3 * Q, 'E4'),
    // inanamadık Gülpembe (D → Em, held B)
    at(b + 4, 0, 'Gb4'),
    at(b + 4, E, 'Gb4'),
    at(b + 4, Q, 'A4'),
    at(b + 4, Q + E, 'A4'),
    at(b + 4, 2 * Q, 'A4'),
    at(b + 4, 2 * Q + E, 'G4'),
    at(b + 4, 3 * Q, 'A4'),
    at(b + 5, 0, 'B4'),
  ];
}

/** "bizim iller sessiz / bizim iller sensiz / olamadı Gülpembe" */
function verseBizimIller(startBar: number): Ev[] {
  const b = startBar;
  return [
    at(b, Q, 'A4'),
    at(b, Q + E, 'B4'),
    at(b, 2 * Q, 'A4'),
    at(b, 2 * Q + E, 'G4'),
    at(b, 3 * Q, 'Gb4'),
    at(b + 1, Q, 'A4'),
    at(b + 1, Q + E, 'B4'),
    at(b + 1, 2 * Q, 'A4'),
    at(b + 1, 2 * Q + E, 'G4'),
    at(b + 1, 3 * Q, 'E4'),
    at(b + 2, Q, 'Gb4'),
    at(b + 2, Q + E, 'A4'),
    at(b + 2, 2 * Q, 'G4'),
    at(b + 2, 2 * Q + E, 'Gb4'),
    at(b + 2, 3 * Q, 'E4'),
    at(b + 3, 0, 'E4'),
  ];
}

/** "Du dağımda son bir türkü Gülpembe / hâlâ hep seni söyler seni çağırır Gülpembe" */
function ending(startBar: number): Ev[] {
  const b = startBar;
  return [
    // Du dağımda
    at(b, 0, 'G4'),
    at(b, Q, 'A4'),
    at(b, 2 * Q, 'B4'),
    at(b, 2 * Q + E, 'A4'),
    at(b, 3 * Q, 'G4'),
    // son bir türkü Gülpembe
    at(b + 1, 0, 'A4'),
    at(b + 1, E, 'B4'),
    at(b + 1, Q, 'C5'),
    at(b + 1, Q + E, 'B4'),
    at(b + 1, 2 * Q, 'A4'),
    at(b + 1, 2 * Q + E, 'G4'),
    at(b + 1, 3 * Q, 'E4'),
    // hâlâ hep seni söyler
    at(b + 2, 0, 'E4'),
    at(b + 2, E, 'Gb4'),
    at(b + 2, Q, 'G4'),
    at(b + 2, Q + E, 'A4'),
    at(b + 2, 2 * Q, 'G4'),
    at(b + 2, 3 * Q, 'E4'),
    // seni çağırır
    at(b + 3, 0, 'Gb4'),
    at(b + 3, E, 'Gb4'),
    at(b + 3, Q, 'Gb4'),
    at(b + 3, Q + E, 'E4'),
    at(b + 3, 2 * Q, 'Gb4'),
    // gül pem be
    at(b + 4, 0, 'B4'),
    at(b + 4, Q, 'A4'),
    at(b + 4, 2 * Q, 'G4'),
    at(b + 4, 3 * Q, 'F4'),
    at(b + 5, 0, 'E4'),
  ];
}

const GULPEMBE_EVENTS: Ev[] = [
  ...intro(0),
  ...intro(5), // second pass of intro hook
  ...verseSenGulunce(10),
  ...verseSenGelince(14),
  ...verseSevinirdik(17),
  ...verseBizimIller(23),
  ...ending(27),
];

const LAST_MS = GULPEMBE_EVENTS[GULPEMBE_EVENTS.length - 1]?.atMs ?? 0;

// Partial ≈ iconic intro (both passes) — recognizable Fa-Mi-Re-Mi hook
const PARTIAL_END_MS = 10 * BAR;
const introNotes = GULPEMBE_EVENTS.filter((e) => e.atMs < PARTIAL_END_MS);
const partialNotes =
  introNotes.length >= 50
    ? introNotes.slice(0, 50)
    : GULPEMBE_EVENTS.slice(0, 50);

export const gulpembeSong: SongDefinition = {
  id: 'gulpembe',
  title: 'Gülpembe',
  artist: 'Barış Manço',
  descriptionKey: 'tutorial.songs.gulpembe.description',
  previewDurationMs: Math.min(12000, LAST_MS + Q),
  events: GULPEMBE_EVENTS,
  partialWindowMs: {
    startMs: partialNotes[0]?.atMs ?? 0,
    endMs: partialNotes[partialNotes.length - 1]?.atMs ?? LAST_MS,
  },
};
