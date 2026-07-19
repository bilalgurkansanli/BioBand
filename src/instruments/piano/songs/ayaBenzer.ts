import type { NoteId } from '../pianoNotes';
import type { SongDefinition } from './types';

// Mustafa Sandal — "Aya Benzer" (Detay, 1998)
// Musa Çetiner / kolaynota.com — Am (no key sig; Sol#→Ab, Fa#→Gb).
// Intro riff + "Ben dönerim…" verse + "İyi dinle…" + "Aya benzer…" chorus.
// Quarter ≈ 480ms (~125bpm).
const Q = 480;
const E = Q / 2;
const S = Q / 4;
const BAR = 4 * Q;

type Ev = { noteId: NoteId; atMs: number };

function at(bar: number, offset: number, noteId: NoteId): Ev {
  return { noteId, atMs: bar * BAR + offset };
}

/** Intro motif (M1–4): La La La Fa | Fa Fa Sol Sol Sol Mi | … | Sol# La Si | Si Do Si La */
function introHead(startBar: number): Ev[] {
  const b = startBar;
  return [
    // M1: La×3 Fa | Fa Fa
    at(b, 0, 'A4'),
    at(b, E, 'A4'),
    at(b, Q, 'A4'),
    at(b, Q + E, 'F4'),
    at(b, 2 * Q, 'F4'),
    at(b, 2 * Q + E, 'F4'),
    // M2: Sol×3 Mi | Mi Mi
    at(b + 1, 0, 'G4'),
    at(b + 1, E, 'G4'),
    at(b + 1, Q, 'G4'),
    at(b + 1, Q + E, 'E4'),
    at(b + 1, 2 * Q, 'E4'),
    at(b + 1, 2 * Q + E, 'E4'),
    // M3: La×3 Fa | Fa Fa
    at(b + 2, 0, 'A4'),
    at(b + 2, E, 'A4'),
    at(b + 2, Q, 'A4'),
    at(b + 2, Q + E, 'F4'),
    at(b + 2, 2 * Q, 'F4'),
    at(b + 2, 2 * Q + E, 'F4'),
    // M4: Sol# La Si | Si Do Si La
    at(b + 3, 0, 'Ab4'),
    at(b + 3, E, 'A4'),
    at(b + 3, Q, 'B4'),
    at(b + 3, 2 * Q, 'B4'),
    at(b + 3, 2 * Q + S, 'C5'),
    at(b + 3, 2 * Q + 2 * S, 'B4'),
    at(b + 3, 2 * Q + 3 * S, 'A4'),
  ];
}

/** Intro run (M5–7). */
function introRun(startBar: number): Ev[] {
  const b = startBar;
  return [
    // M5: La Sol La La | La Sol Fa Fa | Mi Fa Mi Fa | Sol Sol La
    at(b, 0, 'A4'),
    at(b, S, 'G4'),
    at(b, 2 * S, 'A4'),
    at(b, 3 * S, 'A4'),
    at(b, Q, 'A4'),
    at(b, Q + S, 'G4'),
    at(b, Q + 2 * S, 'F4'),
    at(b, Q + 3 * S, 'F4'),
    at(b, 2 * Q, 'E4'),
    at(b, 2 * Q + S, 'F4'),
    at(b, 2 * Q + 2 * S, 'E4'),
    at(b, 2 * Q + 3 * S, 'F4'),
    at(b, 3 * Q, 'G4'),
    at(b, 3 * Q + S, 'G4'),
    at(b, 3 * Q + 2 * S, 'A4'),
    // M6: Fa Sol Fa Sol | Mi Si Si | Si Do Si La
    at(b + 1, 0, 'F4'),
    at(b + 1, S, 'G4'),
    at(b + 1, 2 * S, 'F4'),
    at(b + 1, 3 * S, 'G4'),
    at(b + 1, Q, 'E4'),
    at(b + 1, 2 * Q, 'B4'),
    at(b + 1, 2 * Q + E, 'B4'),
    at(b + 1, 3 * Q, 'B4'),
    at(b + 1, 3 * Q + S, 'C5'),
    at(b + 1, 3 * Q + 2 * S, 'B4'),
    at(b + 1, 3 * Q + 3 * S, 'A4'),
  ];
}

/** "Ben dönerim etrafında / Hiç kimse fark etmez / Aşk bu affetmez" */
function verseA(startBar: number): Ev[] {
  const b = startBar;
  return [
    // M10–11: Ben dönerim etrafında…
    at(b, 0, 'A4'),
    at(b + 1, 0, 'E5'),
    at(b + 1, E, 'E5'),
    at(b + 1, Q, 'E5'),
    at(b + 1, Q + E, 'E5'),
    at(b + 1, 2 * Q, 'E5'),
    at(b + 1, 2 * Q + E, 'D5'),
    at(b + 1, 3 * Q, 'D5'),
    at(b + 1, 3 * Q + E, 'C5'),
    at(b + 2, 0, 'B4'),
    at(b + 2, E, 'A4'),
    at(b + 2, Q, 'A4'),
    // Hiç kimse fark etmez
    at(b + 2, 2 * Q, 'D5'),
    at(b + 2, 2 * Q + E, 'D5'),
    at(b + 2, 3 * Q, 'B4'),
    at(b + 2, 3 * Q + E, 'A4'),
    at(b + 3, 0, 'A4'),
    at(b + 3, E, 'D5'),
    at(b + 3, Q, 'D5'),
    // Aşk bu affetmez
    at(b + 3, 2 * Q, 'C5'),
    at(b + 3, 2 * Q + S, 'D5'),
    at(b + 3, 2 * Q + 2 * S, 'C5'),
    at(b + 3, 2 * Q + 3 * S, 'E5'),
    at(b + 3, 3 * Q, 'D5'),
    at(b + 3, 3 * Q + S, 'C5'),
    at(b + 3, 3 * Q + 2 * S, 'B4'),
    at(b + 4, 0, 'A4'),
  ];
}

/** "Işıkların sönerse / Hep dönerim… / Aşk bu göstermez / Rüya biterse" */
function verseB(startBar: number): Ev[] {
  const b = startBar;
  return [
    at(b, 0, 'E5'),
    at(b, E, 'E5'),
    at(b, Q, 'E5'),
    at(b, Q + E, 'E5'),
    at(b, 2 * Q, 'E5'),
    at(b, 2 * Q + E, 'D5'),
    at(b, 3 * Q, 'D5'),
    at(b, 3 * Q + E, 'C5'),
    at(b + 1, 0, 'B4'),
    at(b + 1, E, 'A4'),
    at(b + 1, Q, 'A4'),
    at(b + 1, 2 * Q, 'D5'),
    at(b + 1, 2 * Q + E, 'D5'),
    at(b + 1, 3 * Q, 'D5'),
    at(b + 1, 3 * Q + E, 'C5'),
    at(b + 2, 0, 'B4'),
    at(b + 2, E, 'A4'),
    at(b + 2, Q, 'A4'),
    at(b + 2, Q + E, 'A4'),
    // Aşk bu göstermez
    at(b + 2, 2 * Q, 'E5'),
    at(b + 2, 2 * Q + E, 'D5'),
    at(b + 2, 3 * Q, 'C5'),
    at(b + 2, 3 * Q + E, 'B4'),
    at(b + 3, 0, 'B4'),
    at(b + 3, E, 'C5'),
    at(b + 3, Q, 'B4'),
    at(b + 3, Q + E, 'A4'),
    // Rüya biterse…
    at(b + 3, 2 * Q, 'E5'),
    at(b + 3, 2 * Q + E, 'D5'),
    at(b + 3, 3 * Q, 'C5'),
    at(b + 3, 3 * Q + E, 'B4'),
    at(b + 4, 0, 'B4'),
    at(b + 4, E, 'A4'),
    at(b + 4, Q, 'A4'),
    at(b + 4, Q + E, 'G4'),
    at(b + 4, 2 * Q, 'B4'),
    at(b + 4, 2 * Q + E, 'A4'),
    at(b + 4, 3 * Q, 'G4'),
  ];
}

/** "İyi dinle duyarsın sesimi…" bridge (compact). */
function bridge(startBar: number): Ev[] {
  const b = startBar;
  return [
    at(b, 0, 'A4'),
    at(b, E, 'E5'),
    at(b, Q, 'D5'),
    at(b, Q + E, 'C5'),
    at(b, 2 * Q, 'B4'),
    at(b, 2 * Q + E, 'B4'),
    at(b, 3 * Q, 'A4'),
    at(b, 3 * Q + E, 'A4'),
    at(b + 1, 0, 'G4'),
    at(b + 1, E, 'B4'),
    at(b + 1, Q, 'A4'),
    at(b + 1, Q + E, 'G4'),
    at(b + 1, 2 * Q, 'A4'),
    at(b + 1, 2 * Q + E, 'E5'),
    at(b + 1, 3 * Q, 'D5'),
    at(b + 1, 3 * Q + E, 'C5'),
    at(b + 2, 0, 'B4'),
    at(b + 2, E, 'A4'),
    at(b + 2, Q, 'A4'),
    at(b + 2, Q + E, 'B4'),
    at(b + 2, 2 * Q, 'D5'),
    at(b + 2, 2 * Q + E, 'C5'),
    at(b + 2, 3 * Q, 'B4'),
    // Dinle en kuytu…
    at(b + 3, 0, 'A4'),
    at(b + 3, E, 'E5'),
    at(b + 3, Q, 'D5'),
    at(b + 3, Q + E, 'C5'),
    at(b + 3, 2 * Q, 'B4'),
    at(b + 3, 2 * Q + E, 'B4'),
    at(b + 3, 3 * Q, 'A4'),
    at(b + 3, 3 * Q + E, 'A4'),
    at(b + 4, 0, 'G4'),
    at(b + 4, E, 'B4'),
    at(b + 4, Q, 'A4'),
    at(b + 4, Q + E, 'G4'),
    at(b + 4, 2 * Q, 'A4'),
    at(b + 4, 2 * Q + E, 'E5'),
    at(b + 4, 3 * Q, 'D5'),
    at(b + 4, 3 * Q + E, 'C5'),
    at(b + 5, 0, 'B4'),
    at(b + 5, E, 'A4'),
    at(b + 5, Q, 'B4'),
    at(b + 5, Q + E, 'A4'),
    at(b + 5, 2 * Q, 'B4'),
  ];
}

/**
 * "(Kalbinde) yorulduysa yolculuklardan / Vazgeç artık yıldızlardan" —
 * pre-chorus ramp that was missing between the bridge and the chorus hook;
 * added from the kolaynota.com sheet (was previously skipped, making the
 * jump into "Aya benzer" feel abrupt).
 */
function preChorus(startBar: number): Ev[] {
  const b = startBar;
  return [
    // de yorulduysa yolculuklardan
    at(b, 0, 'A4'),
    at(b, E, 'E5'),
    at(b, Q, 'D5'),
    at(b, Q + E, 'C5'),
    at(b, 2 * Q, 'B4'),
    at(b, 2 * Q + E, 'A4'),
    at(b, 3 * Q, 'A4'),
    at(b, 3 * Q + E, 'G4'),
    // lar dan — Vazgeç
    at(b + 1, 0, 'B4'),
    at(b + 1, E, 'A4'),
    at(b + 1, Q, 'G4'),
    at(b + 1, Q + E, 'A4'),
    // artık yıldızlardan
    at(b + 1, 2 * Q, 'E5'),
    at(b + 1, 2 * Q + E, 'D5'),
    at(b + 1, 3 * Q, 'C5'),
    at(b + 1, 3 * Q + E, 'B4'),
    at(b + 2, 0, 'A4'),
    at(b + 2, Q, 'B4'),
  ];
}

/** "Aya benzer yüreğim / E doğal olarak takipteyim…" */
function chorusBody(startBar: number): Ev[] {
  const b = startBar;
  return [
    // Aya benzer — La Sol La Si | La Sol Fa Fa
    at(b, 0, 'A5'),
    at(b, E, 'G5'),
    at(b, Q, 'A5'),
    at(b, Q + E, 'B5'),
    at(b, 2 * Q, 'A5'),
    at(b, 2 * Q + E, 'G5'),
    at(b, 3 * Q, 'F5'),
    at(b, 3 * Q + E, 'F5'),
    // E doğal olarak — Fa Mi Fa Mi Fa | Sol Sol La
    at(b + 1, 0, 'F5'),
    at(b + 1, E, 'E5'),
    at(b + 1, Q, 'F5'),
    at(b + 1, Q + E, 'E5'),
    at(b + 1, 2 * Q, 'F5'),
    at(b + 1, 2 * Q + E, 'G5'),
    at(b + 1, 3 * Q, 'G5'),
    at(b + 1, 3 * Q + E, 'A5'),
    // takipteyim — Sol Fa Mi | Mi Mi Si Do Si La
    at(b + 2, 0, 'G5'),
    at(b + 2, E, 'F5'),
    at(b + 2, Q, 'E5'),
    at(b + 2, 2 * Q, 'E5'),
    at(b + 2, 2 * Q + E, 'E5'),
    at(b + 2, 3 * Q, 'B4'),
    at(b + 2, 3 * Q + E, 'C5'),
    at(b + 3, 0, 'B4'),
    at(b + 3, E, 'A4'),
  ];
}

function endingBekle(startBar: number): Ev[] {
  const b = startBar;
  return [
    // Bekle geliyorum aşkım — La Sol La | Sol Fa Fa | Mi Mi
    at(b, 0, 'A5'),
    at(b, E, 'G5'),
    at(b, Q, 'A5'),
    at(b, Q + E, 'G5'),
    at(b, 2 * Q, 'F5'),
    at(b, 2 * Q + E, 'F5'),
    at(b, 3 * Q, 'E5'),
    at(b, 3 * Q + E, 'E5'),
  ];
}

function endingSeni(startBar: number): Ev[] {
  const b = startBar;
  return [
    // Seni seviyorum aşkım — Si×5 Do Si | Sol# Fa# Sol# La
    at(b, 0, 'B4'),
    at(b, S, 'B4'),
    at(b, 2 * S, 'B4'),
    at(b, 3 * S, 'B4'),
    at(b, Q, 'B4'),
    at(b, Q + E, 'C5'),
    at(b, 2 * Q, 'B4'),
    at(b, 3 * Q, 'Ab4'),
    at(b + 1, 0, 'Gb4'),
    at(b + 1, E, 'Ab4'),
    at(b + 1, Q, 'A4'),
  ];
}

const AYA_EVENTS: Ev[] = [
  ...introHead(0),
  ...introRun(4),
  // M8–9 rest → vocal
  ...verseA(9),
  ...verseB(14),
  ...bridge(19),
  ...preChorus(25),
  ...chorusBody(28),
  ...endingBekle(32),
  ...chorusBody(34),
  ...endingSeni(38),
];

const LAST_MS = AYA_EVENTS[AYA_EVENTS.length - 1]?.atMs ?? 0;

const introNotes = AYA_EVENTS.filter((e) => e.atMs < 6 * BAR);
const partialNotes =
  introNotes.length >= 50
    ? introNotes.slice(0, 50)
    : AYA_EVENTS.slice(0, 50);

export const ayaBenzerSong: SongDefinition = {
  id: 'aya-benzer',
  title: 'Aya Benzer',
  artist: 'Mustafa Sandal',
  descriptionKey: 'tutorial.songs.ayaBenzer.description',
  previewDurationMs: Math.min(12000, LAST_MS + Q),
  events: AYA_EVENTS,
  partialWindowMs: {
    startMs: partialNotes[0]?.atMs ?? 0,
    endMs: partialNotes[partialNotes.length - 1]?.atMs ?? LAST_MS,
  },
};
