import type { NoteId } from '../pianoNotes';
import type { SongDefinition } from './types';

// BLOK3 — "Kusura Bakma"
// Musa Çetiner / kolaynota.com — Dm/F (1 flat). Sib→Bb.
// «Senden geçemiyorum… kusura bakma» full treble.
// Quarter ≈ 460ms.
const Q = 460;
const E = Q / 2;
const S = Q / 4;
const BAR = 4 * Q;

type Ev = { noteId: NoteId; atMs: number };

function at(bar: number, offset: number, noteId: NoteId): Ev {
  return { noteId, atMs: bar * BAR + offset };
}

/** Main hook: Senden geçemiyorum… kusura bakma */
function hook(startBar: number): Ev[] {
  const b = startBar;
  return [
    // Re Mi Fa Sol | Sib La Sol Fa Mi Do
    at(b, 0, 'D5'),
    at(b, E, 'E5'),
    at(b, Q, 'F5'),
    at(b, Q + E, 'G5'),
    at(b, 2 * Q, 'Bb4'),
    at(b, 2 * Q + E, 'A4'),
    at(b, 3 * Q, 'G4'),
    at(b, 3 * Q + E, 'F4'),
    at(b + 1, 0, 'E4'),
    at(b + 1, E, 'C5'),
    // Do Fa Mi Re Sib
    at(b + 1, Q, 'C5'),
    at(b + 1, Q + E, 'F5'),
    at(b + 1, 2 * Q, 'E5'),
    at(b + 1, 2 * Q + E, 'D5'),
    at(b + 1, 3 * Q, 'Bb4'),
    // Re Re Re | Do Do Do Sib Re Re Sib Sib
    at(b + 2, 0, 'D5'),
    at(b + 2, S, 'D5'),
    at(b + 2, 2 * S, 'D5'),
    at(b + 2, Q, 'C5'),
    at(b + 2, Q + S, 'C5'),
    at(b + 2, Q + 2 * S, 'C5'),
    at(b + 2, Q + 3 * S, 'Bb4'),
    at(b + 2, 2 * Q, 'D5'),
    at(b + 2, 2 * Q + E, 'D5'),
    at(b + 2, 3 * Q, 'Bb4'),
    at(b + 2, 3 * Q + E, 'Bb4'),
  ];
}

function verseMid(startBar: number): Ev[] {
  const b = startBar;
  return [
    // La | La×5 Sol Mi Do
    at(b, 0, 'A4'),
    at(b + 1, 0, 'A4'),
    at(b + 1, S, 'A4'),
    at(b + 1, 2 * S, 'A4'),
    at(b + 1, 3 * S, 'A4'),
    at(b + 1, Q, 'A4'),
    at(b + 1, Q + E, 'G4'),
    at(b + 1, 2 * Q, 'E4'),
    at(b + 1, 3 * Q, 'C5'),
    // Do Fa Mi Re Sib | Re Re Re Do Do Do Sib Re Re Sib Sib
    at(b + 2, 0, 'C5'),
    at(b + 2, E, 'F5'),
    at(b + 2, Q, 'E5'),
    at(b + 2, Q + E, 'D5'),
    at(b + 2, 2 * Q, 'Bb4'),
    at(b + 3, 0, 'D5'),
    at(b + 3, S, 'D5'),
    at(b + 3, 2 * S, 'D5'),
    at(b + 3, Q, 'C5'),
    at(b + 3, Q + S, 'C5'),
    at(b + 3, Q + 2 * S, 'C5'),
    at(b + 3, Q + 3 * S, 'Bb4'),
    at(b + 3, 2 * Q, 'D5'),
    at(b + 3, 2 * Q + E, 'D5'),
    at(b + 3, 3 * Q, 'Bb4'),
    at(b + 3, 3 * Q + E, 'Bb4'),
  ];
}

function bridge(startBar: number): Ev[] {
  const b = startBar;
  return [
    // Bizde aynı… — La Re Re Do Do Re Re Do | Do Re Re Do Sib La
    at(b, 0, 'A4'),
    at(b, E, 'D5'),
    at(b, Q, 'D5'),
    at(b, Q + E, 'C5'),
    at(b, 2 * Q, 'C5'),
    at(b, 2 * Q + E, 'D5'),
    at(b, 3 * Q, 'D5'),
    at(b, 3 * Q + E, 'C5'),
    at(b + 1, 0, 'C5'),
    at(b + 1, E, 'D5'),
    at(b + 1, Q, 'D5'),
    at(b + 1, Q + E, 'C5'),
    at(b + 1, 2 * Q, 'Bb4'),
    at(b + 1, 3 * Q, 'A4'),
    // Sib La ×4
    at(b + 2, 0, 'Bb4'),
    at(b + 2, E, 'A4'),
    at(b + 2, Q, 'Bb4'),
    at(b + 2, Q + E, 'A4'),
    at(b + 2, 2 * Q, 'Bb4'),
    at(b + 2, 2 * Q + E, 'A4'),
    at(b + 2, 3 * Q, 'Bb4'),
    at(b + 2, 3 * Q + E, 'A4'),
    // Do Re Re Do Sib La
    at(b + 3, 0, 'C5'),
    at(b + 3, E, 'D5'),
    at(b + 3, Q, 'D5'),
    at(b + 3, Q + E, 'C5'),
    at(b + 3, 2 * Q, 'Bb4'),
    at(b + 3, 3 * Q, 'A4'),
  ];
}

function preHook(startBar: number): Ev[] {
  const b = startBar;
  return [
    // Ama Allah var seni çok özledim — Re Re Fa Mi Fa Fa Mi | Sol Fa Mi Mi Re Re Re
    at(b, 0, 'D5'),
    at(b, E, 'D5'),
    at(b, Q, 'F5'),
    at(b, Q + E, 'E5'),
    at(b, 2 * Q, 'F5'),
    at(b, 2 * Q + E, 'F5'),
    at(b, 3 * Q, 'E5'),
    at(b + 1, 0, 'G5'),
    at(b + 1, E, 'F5'),
    at(b + 1, Q, 'E5'),
    at(b + 1, Q + E, 'E5'),
    at(b + 1, 2 * Q, 'D5'),
    at(b + 1, 2 * Q + E, 'D5'),
    at(b + 1, 3 * Q, 'D5'),
    // Yalanım yok… — Fa Mi Fa Fa Mi | Sol Fa Mi Mi Re
    at(b + 2, 0, 'F5'),
    at(b + 2, E, 'E5'),
    at(b + 2, Q, 'F5'),
    at(b + 2, Q + E, 'F5'),
    at(b + 2, 2 * Q, 'E5'),
    at(b + 2, 3 * Q, 'G5'),
    at(b + 3, 0, 'F5'),
    at(b + 3, E, 'E5'),
    at(b + 3, Q, 'E5'),
    at(b + 3, Q + E, 'D5'),
    // Sensiz beni… — Sol La Sol Fa Mi | Fa Sol Fa Mi Re | Fa Mi Fa Mi Fa | Sol Fa Mi Mi Re
    at(b + 4, 0, 'G5'),
    at(b + 4, E, 'A5'),
    at(b + 4, Q, 'G5'),
    at(b + 4, Q + E, 'F5'),
    at(b + 4, 2 * Q, 'E5'),
    at(b + 4, 3 * Q, 'F5'),
    at(b + 5, 0, 'G5'),
    at(b + 5, E, 'F5'),
    at(b + 5, Q, 'E5'),
    at(b + 5, Q + E, 'D5'),
    at(b + 5, 2 * Q, 'F5'),
    at(b + 5, 2 * Q + E, 'E5'),
    at(b + 5, 3 * Q, 'F5'),
    at(b + 5, 3 * Q + E, 'E5'),
    at(b + 6, 0, 'F5'),
    at(b + 6, E, 'G5'),
    at(b + 6, Q, 'F5'),
    at(b + 6, Q + E, 'E5'),
    at(b + 6, 2 * Q, 'E5'),
    at(b + 6, 3 * Q, 'D5'),
  ];
}

const EVENTS: Ev[] = [
  ...hook(0),
  ...verseMid(3),
  ...hook(7),
  ...bridge(11),
  ...preHook(15),
  ...hook(22),
  at(25, 0, 'A4'),
];

const LAST_MS = EVENTS[EVENTS.length - 1]?.atMs ?? 0;
const partialNotes = EVENTS.slice(0, 50);

export const kusuraBakmaSong: SongDefinition = {
  id: 'kusura-bakma',
  title: 'Kusura Bakma',
  artist: 'BLOK3',
  descriptionKey: 'tutorial.songs.kusuraBakma.description',
  previewDurationMs: Math.min(12000, LAST_MS + Q),
  events: EVENTS,
  partialWindowMs: {
    startMs: partialNotes[0]?.atMs ?? 0,
    endMs: partialNotes[partialNotes.length - 1]?.atMs ?? LAST_MS,
  },
};
