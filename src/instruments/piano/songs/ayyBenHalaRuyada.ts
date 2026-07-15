import type { NoteId } from '../pianoNotes';
import type { SongDefinition } from './types';

// Oğuzhan Koç — "Ayy / Ben Hala Rüyada"
// Musa Çetiner / kolaynota.com — Dm (1 flat). Sib→Bb, Do#→Db.
// Verse «Ay…» + chorus «Güzel günler… ben hala rüyada».
// Quarter ≈ 480ms.
const Q = 480;
const E = Q / 2;
const S = Q / 4;
const BAR = 4 * Q;

type Ev = { noteId: NoteId; atMs: number };

function at(bar: number, offset: number, noteId: NoteId): Ev {
  return { noteId, atMs: bar * BAR + offset };
}

function verseAyy(startBar: number): Ev[] {
  const b = startBar;
  return [
    // Ay… — La La Re Do# Sib La Sol La
    at(b, 0, 'A4'),
    at(b, Q, 'A4'),
    at(b, 2 * Q, 'D5'),
    at(b, 2 * Q + E, 'Db5'),
    at(b, 3 * Q, 'Bb4'),
    at(b, 3 * Q + E, 'A4'),
    at(b + 1, 0, 'G4'),
    at(b + 1, E, 'A4'),
    // Dedim her şeyim tamam — Re Re Do# Sib La Sol La Sib
    at(b + 1, Q, 'D5'),
    at(b + 1, Q + E, 'D5'),
    at(b + 1, 2 * Q, 'Db5'),
    at(b + 1, 2 * Q + E, 'Bb4'),
    at(b + 1, 3 * Q, 'A4'),
    at(b + 1, 3 * Q + E, 'G4'),
    at(b + 2, 0, 'A4'),
    at(b + 2, E, 'Bb4'),
    // Elimi tutmuştun… — La Re Do# Sib La Sol La Fa
    at(b + 2, Q, 'A4'),
    at(b + 2, 2 * Q, 'D5'),
    at(b + 2, 2 * Q + E, 'Db5'),
    at(b + 2, 3 * Q, 'Bb4'),
    at(b + 2, 3 * Q + E, 'A4'),
    at(b + 3, 0, 'G4'),
    at(b + 3, E, 'A4'),
    at(b + 3, Q, 'F4'),
    // inceden usuldan — La Fa Sol La Sib La
    at(b + 3, 2 * Q, 'A4'),
    at(b + 3, 2 * Q + E, 'F4'),
    at(b + 3, 3 * Q, 'G4'),
    at(b + 3, 3 * Q + E, 'A4'),
    at(b + 4, 0, 'Bb4'),
    at(b + 4, E, 'A4'),
  ];
}

function verseAyy2(startBar: number): Ev[] {
  const b = startBar;
  return [
    at(b, 0, 'A4'),
    at(b, Q, 'A4'),
    at(b, 2 * Q, 'D5'),
    at(b, 2 * Q + E, 'Db5'),
    at(b, 3 * Q, 'Bb4'),
    at(b, 3 * Q + E, 'A4'),
    at(b + 1, 0, 'G4'),
    at(b + 1, E, 'A4'),
    at(b + 1, Q, 'D5'),
    at(b + 1, Q + E, 'D5'),
    at(b + 1, 2 * Q, 'Db5'),
    at(b + 1, 2 * Q + E, 'Bb4'),
    at(b + 1, 3 * Q, 'A4'),
    at(b + 1, 3 * Q + E, 'G4'),
    at(b + 2, 0, 'A4'),
    at(b + 2, E, 'Bb4'),
    at(b + 2, Q, 'A4'),
    at(b + 2, 2 * Q, 'D5'),
    at(b + 2, 2 * Q + E, 'Db5'),
    at(b + 2, 3 * Q, 'Bb4'),
    at(b + 2, 3 * Q + E, 'A4'),
    at(b + 3, 0, 'G4'),
    at(b + 3, E, 'A4'),
    at(b + 3, Q, 'F4'),
    // geceyi günden — Sol La Fa Sol La Sib La
    at(b + 3, 2 * Q, 'G4'),
    at(b + 3, 2 * Q + E, 'A4'),
    at(b + 3, 3 * Q, 'F4'),
    at(b + 3, 3 * Q + E, 'G4'),
    at(b + 4, 0, 'A4'),
    at(b + 4, E, 'Bb4'),
    at(b + 4, Q, 'A4'),
  ];
}

function preChorus(startBar: number): Ev[] {
  const b = startBar;
  return [
    // Yıllar geçmiş… — Sib Do Sib La Re Do# Mi Re
    at(b, 0, 'Bb4'),
    at(b, E, 'C5'),
    at(b, Q, 'Bb4'),
    at(b, Q + E, 'A4'),
    at(b, 2 * Q, 'D5'),
    at(b, 2 * Q + E, 'Db5'),
    at(b, 3 * Q, 'E5'),
    at(b, 3 * Q + E, 'D5'),
    // Geç kaldık… — Sib Do Sib Re Re Re Mi Re Do#
    at(b + 1, 0, 'Bb4'),
    at(b + 1, E, 'C5'),
    at(b + 1, Q, 'Bb4'),
    at(b + 1, Q + E, 'D5'),
    at(b + 1, 2 * Q, 'D5'),
    at(b + 1, 2 * Q + E, 'D5'),
    at(b + 1, 3 * Q, 'E5'),
    at(b + 1, 3 * Q + E, 'D5'),
    at(b + 2, 0, 'Db5'),
  ];
}

function chorus(startBar: number): Ev[] {
  const b = startBar;
  return [
    // Güzel günler mazide kalmış — Re Re Re Mi Fa Mi Re Do# Mi
    at(b, 0, 'D5'),
    at(b, E, 'D5'),
    at(b, Q, 'D5'),
    at(b, Q + E, 'E5'),
    at(b, 2 * Q, 'F5'),
    at(b, 2 * Q + E, 'E5'),
    at(b, 3 * Q, 'D5'),
    at(b, 3 * Q + E, 'Db5'),
    at(b + 1, 0, 'E5'),
    // ben hala rüyada — Mi Fa Sol Fa Mi Re
    at(b + 1, E, 'E5'),
    at(b + 1, Q, 'F5'),
    at(b + 1, Q + E, 'G5'),
    at(b + 1, 2 * Q, 'F5'),
    at(b + 1, 2 * Q + E, 'E5'),
    at(b + 1, 3 * Q, 'D5'),
    // Aşkımızın üstü tozlanmış — Re Re Re Mi Fa Mi Re Do#
    at(b + 2, 0, 'D5'),
    at(b + 2, E, 'D5'),
    at(b + 2, Q, 'D5'),
    at(b + 2, Q + E, 'E5'),
    at(b + 2, 2 * Q, 'F5'),
    at(b + 2, 2 * Q + E, 'E5'),
    at(b + 2, 3 * Q, 'D5'),
    at(b + 2, 3 * Q + E, 'Db5'),
    // örtsek bi çarşafla — Sol Fa Mi Re Do# Sib La
    at(b + 3, 0, 'G5'),
    at(b + 3, E, 'F5'),
    at(b + 3, Q, 'E5'),
    at(b + 3, Q + E, 'D5'),
    at(b + 3, 2 * Q, 'Db5'),
    at(b + 3, 2 * Q + E, 'Bb4'),
    at(b + 3, 3 * Q, 'A4'),
  ];
}

function chorusTag(startBar: number): Ev[] {
  const b = startBar;
  return [
    at(b, 0, 'D5'),
    at(b, E, 'D5'),
    at(b, Q, 'D5'),
    at(b, Q + E, 'E5'),
    at(b, 2 * Q, 'F5'),
    at(b, 2 * Q + E, 'E5'),
    at(b, 3 * Q, 'D5'),
    at(b, 3 * Q + E, 'Db5'),
    at(b + 1, 0, 'E5'),
    at(b + 1, E, 'E5'),
    at(b + 1, Q, 'Db5'),
    at(b + 1, Q + E, 'Db5'),
    at(b + 1, 2 * Q, 'D5'),
    // Dün remini… — La Fa Sol La Sib Sol Mi Sol Fa Mi Re
    at(b + 2, 0, 'A4'),
    at(b + 2, E, 'F4'),
    at(b + 2, Q, 'G4'),
    at(b + 2, Q + E, 'A4'),
    at(b + 2, 2 * Q, 'Bb4'),
    at(b + 2, 2 * Q + E, 'G4'),
    at(b + 2, 3 * Q, 'E4'),
    at(b + 2, 3 * Q + E, 'G4'),
    at(b + 3, 0, 'F4'),
    at(b + 3, E, 'E4'),
    at(b + 3, Q, 'D4'),
    // Fa Mi Re Do# | Re
    at(b + 3, Q + E, 'F4'),
    at(b + 3, 2 * Q, 'E4'),
    at(b + 3, 2 * Q + E, 'D4'),
    at(b + 3, 3 * Q, 'Db4'),
    at(b + 4, 0, 'D4'),
  ];
}

const EVENTS: Ev[] = [
  ...verseAyy(0),
  ...verseAyy2(5),
  ...preChorus(10),
  ...chorus(13),
  ...chorus(17),
  ...chorusTag(21),
];

const LAST_MS = EVENTS[EVENTS.length - 1]?.atMs ?? 0;
const partialNotes = EVENTS.slice(0, 50);

export const ayyBenHalaRuyadaSong: SongDefinition = {
  id: 'ayy-ben-hala-ruyada',
  title: 'Ayy / Ben Hala Rüyada',
  artist: 'Oğuzhan Koç',
  descriptionKey: 'tutorial.songs.ayyBenHalaRuyada.description',
  previewDurationMs: Math.min(12000, LAST_MS + Q),
  events: EVENTS,
  partialWindowMs: {
    startMs: partialNotes[0]?.atMs ?? 0,
    endMs: partialNotes[partialNotes.length - 1]?.atMs ?? LAST_MS,
  },
};
