import type { NoteId } from '../pianoNotes';
import type { SongDefinition } from './types';

// Üsküdar'a Gideriken (Katibim) — Türk halk ezgisi
// Musa Çetiner / kolaynota.com — Am (Sol#→Ab), 2/4.
// Intro theme + «Üsküdara gideriken…» + «Katibimin setresi…»
// Quarter ≈ 520ms.
const Q = 520;
const E = Q / 2;
const S = Q / 4;
const H = Q * 2;
const BAR = 2 * Q;

type Ev = { noteId: NoteId; atMs: number };

function at(bar: number, offset: number, noteId: NoteId): Ev {
  return { noteId, atMs: bar * BAR + offset };
}

/** Theme phrase ending on Si (bars 1–7). */
function themeToSi(startBar: number): Ev[] {
  const b = startBar;
  return [
    // M1: Mi Fa Mi Re
    at(b, 0, 'E5'),
    at(b, E, 'F5'),
    at(b, Q, 'E5'),
    at(b, Q + E, 'D5'),
    // M2: Do Si Do Re
    at(b + 1, 0, 'C5'),
    at(b + 1, E, 'B4'),
    at(b + 1, Q, 'C5'),
    at(b + 1, Q + E, 'D5'),
    // M3: Mi Fa Mi Re
    at(b + 2, 0, 'E5'),
    at(b + 2, E, 'F5'),
    at(b + 2, Q, 'E5'),
    at(b + 2, Q + E, 'D5'),
    // M4: Do Si La
    at(b + 3, 0, 'C5'),
    at(b + 3, E, 'B4'),
    at(b + 3, Q, 'A4'),
    // M5: Si Re Do Si
    at(b + 4, 0, 'B4'),
    at(b + 4, E, 'D5'),
    at(b + 4, Q, 'C5'),
    at(b + 4, Q + E, 'B4'),
    // M6: Si Si La Sol# La
    at(b + 5, 0, 'B4'),
    at(b + 5, E, 'B4'),
    at(b + 5, Q, 'A4'),
    at(b + 5, Q + S, 'Ab4'),
    at(b + 5, Q + E, 'A4'),
    // M7: Si
    at(b + 6, 0, 'B4'),
  ];
}

/** Same theme resolving to La. */
function themeToLa(startBar: number): Ev[] {
  const b = startBar;
  return [
    at(b, 0, 'E5'),
    at(b, E, 'F5'),
    at(b, Q, 'E5'),
    at(b, Q + E, 'D5'),
    at(b + 1, 0, 'C5'),
    at(b + 1, E, 'B4'),
    at(b + 1, Q, 'C5'),
    at(b + 1, Q + E, 'D5'),
    at(b + 2, 0, 'E5'),
    at(b + 2, E, 'F5'),
    at(b + 2, Q, 'E5'),
    at(b + 2, Q + E, 'D5'),
    at(b + 3, 0, 'C5'),
    at(b + 3, E, 'B4'),
    at(b + 3, Q, 'A4'),
    at(b + 4, 0, 'B4'),
    at(b + 4, E, 'D5'),
    at(b + 4, Q, 'C5'),
    at(b + 4, Q + E, 'B4'),
    at(b + 5, 0, 'B4'),
    at(b + 5, E, 'B4'),
    at(b + 5, Q, 'A4'),
    at(b + 5, Q + S, 'Ab4'),
    at(b + 5, Q + E, 'A4'),
    at(b + 6, 0, 'A4'),
  ];
}

/** «Üsküdara gideriken aldı da bir yağmur» (4 bars). */
function verse(startBar: number): Ev[] {
  const b = startBar;
  return [
    // La | Mi Mi
    at(b, 0, 'A4'),
    at(b, Q, 'E5'),
    at(b, Q + E, 'E5'),
    // Fa Mi Fa Sol Mi
    at(b + 1, 0, 'F5'),
    at(b + 1, E, 'E5'),
    at(b + 1, E + S, 'F5'),
    at(b + 1, Q, 'G5'),
    at(b + 1, Q + E, 'E5'),
    // Re Re Re Do Re
    at(b + 2, 0, 'D5'),
    at(b + 2, E, 'D5'),
    at(b + 2, Q, 'D5'),
    at(b + 2, Q + S, 'C5'),
    at(b + 2, Q + E, 'D5'),
    // Mi
    at(b + 3, 0, 'E5'),
  ];
}

/** «Katibimin setresi uzun / eteği çamur» ending Si. */
function refrainToSi(startBar: number): Ev[] {
  const b = startBar;
  return [
    // La Si Do Re
    at(b, 0, 'A4'),
    at(b, E, 'B4'),
    at(b, Q, 'C5'),
    at(b, Q + E, 'D5'),
    // Mi Fa Mi Re
    at(b + 1, 0, 'E5'),
    at(b + 1, E, 'F5'),
    at(b + 1, Q, 'E5'),
    at(b + 1, Q + E, 'D5'),
    // Do Si La
    at(b + 2, 0, 'C5'),
    at(b + 2, E, 'B4'),
    at(b + 2, Q, 'A4'),
    // Si Re Do Si
    at(b + 3, 0, 'B4'),
    at(b + 3, E, 'D5'),
    at(b + 3, Q, 'C5'),
    at(b + 3, Q + E, 'B4'),
    // Si Si La Sol# La
    at(b + 4, 0, 'B4'),
    at(b + 4, E, 'B4'),
    at(b + 4, Q, 'A4'),
    at(b + 4, Q + S, 'Ab4'),
    at(b + 4, Q + E, 'A4'),
    // Si
    at(b + 5, 0, 'B4'),
  ];
}

/** Refrain resolving to La. */
function refrainToLa(startBar: number): Ev[] {
  const b = startBar;
  return [
    at(b, 0, 'A4'),
    at(b, E, 'B4'),
    at(b, Q, 'C5'),
    at(b, Q + E, 'D5'),
    at(b + 1, 0, 'E5'),
    at(b + 1, E, 'F5'),
    at(b + 1, Q, 'E5'),
    at(b + 1, Q + E, 'D5'),
    at(b + 2, 0, 'C5'),
    at(b + 2, E, 'B4'),
    at(b + 2, Q, 'A4'),
    at(b + 3, 0, 'B4'),
    at(b + 3, E, 'D5'),
    at(b + 3, Q, 'C5'),
    at(b + 3, Q + E, 'B4'),
    at(b + 4, 0, 'B4'),
    at(b + 4, E, 'B4'),
    at(b + 4, Q, 'A4'),
    at(b + 4, Q + S, 'Ab4'),
    at(b + 4, Q + E, 'A4'),
    at(b + 5, 0, 'A4'),
  ];
}

const EVENTS: Ev[] = [
  ...themeToSi(0),
  ...themeToLa(7),
  ...verse(14),
  ...verse(18),
  ...refrainToSi(22),
  ...refrainToLa(28),
];

const LAST_MS = EVENTS[EVENTS.length - 1]?.atMs ?? 0;

const introNotes = EVENTS.filter((e) => e.atMs < 14 * BAR);
const partialNotes =
  introNotes.length >= 50
    ? introNotes.slice(0, 50)
    : EVENTS.slice(0, 50);

export const uskudaraGiderkenSong: SongDefinition = {
  id: 'uskudara-giderken',
  title: "Üsküdar'a Giderken",
  artist: 'Anonim',
  descriptionKey: 'tutorial.songs.uskudaraGiderken.description',
  previewDurationMs: Math.min(12000, LAST_MS + Q),
  events: EVENTS,
  partialWindowMs: {
    startMs: partialNotes[0]?.atMs ?? 0,
    endMs: partialNotes[partialNotes.length - 1]?.atMs ?? LAST_MS,
  },
};
