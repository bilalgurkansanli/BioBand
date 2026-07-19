import type { NoteId } from '../pianoNotes';
import type { SongDefinition } from './types';

// Manifest — "Yaşanacaksa"
// Musa Çetiner / kolaynota.com — Am, 4/4. Sol#→Ab.
// Verse «Bu hikaye…» + chorus «Yaşanacaksa…» + coda.
// Quarter ≈ 480ms.
const Q = 480;
const E = Q / 2;
const S = Q / 4;
const BAR = 4 * Q;

type Ev = { noteId: NoteId; atMs: number };

function at(bar: number, offset: number, noteId: NoteId): Ev {
  return { noteId, atMs: bar * BAR + offset };
}

function verseA(startBar: number): Ev[] {
  const b = startBar;
  return [
    // Bu hikaye — Mi Mi Fa Mi Re
    at(b, 0, 'E5'),
    at(b, E, 'E5'),
    at(b, Q, 'F5'),
    at(b, Q + E, 'E5'),
    at(b, 2 * Q, 'D5'),
    // sonu kötü bite — Do Re Do Re Do Re
    at(b + 1, 0, 'C5'),
    at(b + 1, E, 'D5'),
    at(b + 1, Q, 'C5'),
    at(b + 1, Q + E, 'D5'),
    at(b + 1, 2 * Q, 'C5'),
    at(b + 1, 2 * Q + E, 'D5'),
    // cekse — Mi Si La
    at(b + 2, 0, 'E5'),
    at(b + 2, Q, 'B4'),
    at(b + 2, 2 * Q, 'A4'),
    // Niye koş — La La Si
    at(b + 3, 0, 'A4'),
    at(b + 3, Q, 'A4'),
    at(b + 3, 2 * Q, 'B4'),
    // tun peşimden… — Do Re Do Re Do Do Re Do Re Do
    at(b + 4, 0, 'C5'),
    at(b + 4, S, 'D5'),
    at(b + 4, 2 * S, 'C5'),
    at(b + 4, 3 * S, 'D5'),
    at(b + 4, Q, 'C5'),
    at(b + 4, Q + E, 'C5'),
    at(b + 4, 2 * Q, 'D5'),
    at(b + 4, 2 * Q + E, 'C5'),
    at(b + 4, 3 * Q, 'D5'),
    at(b + 4, 3 * Q + E, 'C5'),
    // çeldin aklımı — Mi Si Si Do Re
    at(b + 5, 0, 'E5'),
    at(b + 5, Q, 'B4'),
    at(b + 5, Q + E, 'B4'),
    at(b + 5, 2 * Q, 'C5'),
    at(b + 5, 3 * Q, 'D5'),
    // Tüm suç bende — Mi Mi Fa Mi Re
    at(b + 6, 0, 'E5'),
    at(b + 6, E, 'E5'),
    at(b + 6, Q, 'F5'),
    at(b + 6, Q + E, 'E5'),
    at(b + 6, 2 * Q, 'D5'),
    // Sakın yine geri dönme — La La La Si La Sol Sol Si
    at(b + 7, 0, 'A4'),
    at(b + 7, E, 'A4'),
    at(b + 7, Q, 'A4'),
    at(b + 7, Q + E, 'B4'),
    at(b + 7, 2 * Q, 'A4'),
    at(b + 7, 2 * Q + E, 'G4'),
    at(b + 7, 3 * Q, 'G4'),
    at(b + 7, 3 * Q + E, 'B4'),
  ];
}

function verseB(startBar: number): Ev[] {
  const b = startBar;
  return [
    // Aşktan fazla… — Mi Sol | Fa Mi Re Re Sol Fa Mi Re Re Re
    at(b, 0, 'E5'),
    at(b, Q, 'G5'),
    at(b + 1, 0, 'F5'),
    at(b + 1, E, 'E5'),
    at(b + 1, Q, 'D5'),
    at(b + 1, Q + E, 'D5'),
    at(b + 1, 2 * Q, 'G5'),
    at(b + 1, 2 * Q + E, 'F5'),
    at(b + 1, 3 * Q, 'E5'),
    at(b + 1, 3 * Q + E, 'D5'),
    at(b + 2, 0, 'D5'),
    at(b + 2, E, 'D5'),
    // sayende Yapma mut — Mi Si Do Re Mi Mi Mi
    at(b + 2, Q, 'E5'),
    at(b + 2, 2 * Q, 'B4'),
    at(b + 2, 2 * Q + E, 'C5'),
    at(b + 2, 3 * Q, 'D5'),
    at(b + 3, 0, 'E5'),
    at(b + 3, E, 'E5'),
    at(b + 3, Q, 'E5'),
    // luymuş gibi — La La Si Sol | Mi Fa Mi
    at(b + 3, 2 * Q, 'A4'),
    at(b + 3, 2 * Q + E, 'A4'),
    at(b + 3, 3 * Q, 'B4'),
    at(b + 3, 3 * Q + E, 'G4'),
    at(b + 4, 0, 'E5'),
    at(b + 4, E, 'F5'),
    at(b + 4, Q, 'E5'),
    // Hiç tutma ellerimi — La La Si Sol | Mi Mi Fa Mi
    at(b + 4, 2 * Q, 'A4'),
    at(b + 4, 2 * Q + E, 'A4'),
    at(b + 4, 3 * Q, 'B4'),
    at(b + 4, 3 * Q + E, 'G4'),
    at(b + 5, 0, 'E5'),
    at(b + 5, E, 'E5'),
    at(b + 5, Q, 'F5'),
    at(b + 5, Q + E, 'E5'),
    // inadımdan kaybettiğimi — La La La Si Sol
    at(b + 5, 2 * Q, 'A4'),
    at(b + 5, 2 * Q + E, 'A4'),
    at(b + 5, 3 * Q, 'A4'),
    at(b + 5, 3 * Q + E, 'B4'),
    at(b + 6, 0, 'G4'),
    // çok geç öğrendim — Fa Fa Sol Fa Mi Mi Fa Mi Mi Fa Mi
    at(b + 6, E, 'F5'),
    at(b + 6, Q, 'F5'),
    at(b + 6, Q + E, 'G5'),
    at(b + 6, 2 * Q, 'F5'),
    at(b + 6, 2 * Q + E, 'E5'),
    at(b + 6, 3 * Q, 'E5'),
    at(b + 6, 3 * Q + E, 'F5'),
    at(b + 7, 0, 'E5'),
    at(b + 7, E, 'E5'),
    at(b + 7, Q, 'F5'),
    at(b + 7, Q + E, 'E5'),
  ];
}

function preChorus(startBar: number): Ev[] {
  const b = startBar;
  return [
    // Kalbimde yara izi — La La Si Sol | Mi Fa Mi
    at(b, 0, 'A4'),
    at(b, E, 'A4'),
    at(b, Q, 'B4'),
    at(b, Q + E, 'G4'),
    at(b, 2 * Q, 'E5'),
    at(b, 2 * Q + E, 'F5'),
    at(b, 3 * Q, 'E5'),
    // Korkma pişman değilim — La La Si Sol | Mi Fa Mi
    at(b + 1, 0, 'A4'),
    at(b + 1, E, 'A4'),
    at(b + 1, Q, 'B4'),
    at(b + 1, Q + E, 'G4'),
    at(b + 1, 2 * Q, 'E5'),
    at(b + 1, 2 * Q + E, 'F5'),
    at(b + 1, 3 * Q, 'E5'),
    // Öğrettin bazı aşklar… — La La Si Sol Fa Fa Fa Sol | Fa Mi Mi
    at(b + 2, 0, 'A4'),
    at(b + 2, E, 'A4'),
    at(b + 2, Q, 'B4'),
    at(b + 2, Q + E, 'G4'),
    at(b + 2, 2 * Q, 'F5'),
    at(b + 2, 2 * Q + E, 'F5'),
    at(b + 2, 3 * Q, 'F5'),
    at(b + 2, 3 * Q + E, 'G5'),
    at(b + 3, 0, 'F5'),
    at(b + 3, E, 'E5'),
    at(b + 3, Q, 'E5'),
  ];
}

/**
 * Chorus hook, verified against the kolaynota.com sheet: the FIRST statement
 * (right after "bitmezmiş") starts clean on the downbeat with no pickup —
 * "Do Si Do Do Mi Do Si Do" — not the "Mi Do Si" anacrusis this used to open
 * with. That pickup only belongs before the REPEAT (see the manual pickup
 * added in EVENTS ahead of the second chorusBody call, matching the sheet's
 * "[1.]" first-ending bracket).
 */
function chorusBody(startBar: number): Ev[] {
  const b = startBar;
  return [
    // Yaşanacaksa yaşana — Do Si Do Do Mi Do Si Do
    at(b, 0, 'C5'),
    at(b, E, 'B4'),
    at(b, Q, 'C5'),
    at(b, Q + E, 'C5'),
    at(b, 2 * Q, 'E5'),
    at(b, 2 * Q + E, 'C5'),
    at(b, 3 * Q, 'B4'),
    at(b, 3 * Q + E, 'C5'),
    // cak Ayrılıklar mutsuzluklar — Do Do Si Si La Sol La
    at(b + 1, 0, 'C5'),
    at(b + 1, E, 'C5'),
    at(b + 1, Q, 'B4'),
    at(b + 1, Q + E, 'B4'),
    at(b + 1, 2 * Q, 'A4'),
    at(b + 1, 2 * Q + E, 'G4'),
    at(b + 1, 3 * Q, 'A4'),
    // Ölüm yok ya bunun sonun da — La La Sol Fa Sol La La
    at(b + 2, 0, 'A4'),
    at(b + 2, E, 'A4'),
    at(b + 2, Q, 'G4'),
    at(b + 2, Q + E, 'F4'),
    at(b + 2, 2 * Q, 'G4'),
    at(b + 2, 2 * Q + E, 'A4'),
    at(b + 2, 3 * Q, 'A4'),
    // Tüm acı — La La La
    at(b + 3, 0, 'A4'),
    at(b + 3, E, 'A4'),
    at(b + 3, Q, 'A4'),
  ];
}

function endingSolSharp(startBar: number): Ev[] {
  const b = startBar;
  return [
    // lar bir yere kadar — Sol# La Sol# Sol# La Sol#
    at(b, 0, 'Ab4'),
    at(b, E, 'A4'),
    at(b, Q, 'Ab4'),
    at(b, Q + E, 'Ab4'),
    at(b, 2 * Q, 'A4'),
    at(b, 3 * Q, 'Ab4'),
  ];
}

function bridgeCoda(startBar: number): Ev[] {
  const b = startBar;
  return [
    // Haklısın boşver — La Si La Si La | Si La Sol
    at(b, 0, 'A4'),
    at(b, E, 'B4'),
    at(b, Q, 'A4'),
    at(b, Q + E, 'B4'),
    at(b, 2 * Q, 'A4'),
    at(b, 3 * Q, 'B4'),
    at(b + 1, 0, 'A4'),
    at(b + 1, E, 'G4'),
    // Her zaman yaptığın gibi — Si La Sol La Si | Si Si Si Si
    at(b + 1, Q, 'B4'),
    at(b + 1, Q + E, 'A4'),
    at(b + 1, 2 * Q, 'G4'),
    at(b + 1, 2 * Q + E, 'A4'),
    at(b + 1, 3 * Q, 'B4'),
    at(b + 2, 0, 'B4'),
    at(b + 2, E, 'B4'),
    at(b + 2, Q, 'B4'),
    at(b + 2, Q + E, 'B4'),
    // Bana da boş ver unut gitsin — La Sol Fa Sol La
    at(b + 2, 2 * Q, 'A4'),
    at(b + 2, 2 * Q + E, 'G4'),
    at(b + 2, 3 * Q, 'F4'),
    at(b + 2, 3 * Q + E, 'G4'),
    at(b + 3, 0, 'A4'),
    // Sevgiden korkmaya… — La La La Sol# Sol# Sol# Si Do Si
    at(b + 3, Q, 'A4'),
    at(b + 3, Q + E, 'A4'),
    at(b + 3, 2 * Q, 'A4'),
    at(b + 3, 2 * Q + E, 'Ab4'),
    at(b + 3, 3 * Q, 'Ab4'),
    at(b + 3, 3 * Q + E, 'Ab4'),
    at(b + 4, 0, 'B4'),
    at(b + 4, E, 'C5'),
    at(b + 4, Q, 'B4'),
  ];
}

const EVENTS: Ev[] = [
  ...verseA(0),
  ...verseB(8),
  ...preChorus(16),
  // 1st (clean, no pickup) chorus statement — matches the sheet right after
  // "bitmezmiş".
  ...chorusBody(20),
  ...endingSolSharp(24),
  // "[1.]" first-ending pickup back into the repeat — "Ya-şa-na" anacrusis,
  // only used here, not on the first statement.
  at(25, 2 * Q, 'E5'),
  at(25, 2 * Q + E, 'C5'),
  at(25, 3 * Q, 'B4'),
  ...chorusBody(26),
  ...endingSolSharp(30),
  ...bridgeCoda(31),
];

const LAST_MS = EVENTS[EVENTS.length - 1]?.atMs ?? 0;
const partialNotes = EVENTS.slice(0, 50);

export const yasanacaksaSong: SongDefinition = {
  id: 'yasanacaksa',
  title: 'Yaşanacaksa',
  artist: 'Manifest',
  descriptionKey: 'tutorial.songs.yasanacaksa.description',
  previewDurationMs: Math.min(12000, LAST_MS + Q),
  events: EVENTS,
  partialWindowMs: {
    startMs: partialNotes[0]?.atMs ?? 0,
    endMs: partialNotes[partialNotes.length - 1]?.atMs ?? LAST_MS,
  },
};
