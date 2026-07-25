import type { NoteId } from '../pianoNotes';
import type { SongDefinition, SongEvent } from './types';

// Mabel Matiz — "Ahu"
// Musa Çetiner / kolaynota.com — Am feel. Fa#→Gb, Sib→Bb, Lab→Ab.
// «Yandı gönül…» + «Çal beni…» + D.S. return.
// Quarter ≈ 500ms.
const Q = 500;
const E = Q / 2;
const BAR = 4 * Q;

type Ev = SongEvent;

function at(bar: number, offset: number, noteId: NoteId): Ev {
  return { noteId, atMs: bar * BAR + offset };
}

function motifYandi(startBar: number): Ev[] {
  const b = startBar;
  return [
    // Do Mi Re Do Si
    at(b, 0, 'C5'),
    at(b, E, 'E5'),
    at(b, Q, 'D5'),
    at(b, Q + E, 'C5'),
    at(b, 2 * Q, 'B4'),
  ];
}

function verseOpen(startBar: number): Ev[] {
  const b = startBar;
  return [
    ...motifYandi(b),
    // Do Mi Re Do Si Si Re Do Si
    at(b + 1, 0, 'C5'),
    at(b + 1, E, 'E5'),
    at(b + 1, Q, 'D5'),
    at(b + 1, Q + E, 'C5'),
    at(b + 1, 2 * Q, 'B4'),
    at(b + 1, 2 * Q + E, 'B4'),
    at(b + 1, 3 * Q, 'D5'),
    at(b + 1, 3 * Q + E, 'C5'),
    at(b + 2, 0, 'B4'),
    // La La Sol La Sol La Si
    at(b + 2, E, 'A4'),
    at(b + 2, Q, 'A4'),
    at(b + 2, Q + E, 'G4'),
    at(b + 2, 2 * Q, 'A4'),
    at(b + 2, 2 * Q + E, 'G4'),
    at(b + 2, 3 * Q, 'A4'),
    at(b + 2, 3 * Q + E, 'B4'),
  ];
}

function ahuHook(startBar: number): Ev[] {
  const b = startBar;
  return [
    // Mi Mi Mi Mi Fa Mi | Re Do Re Mi Fa
    at(b, 0, 'E5'),
    at(b, E, 'E5'),
    at(b, Q, 'E5'),
    at(b, Q + E, 'E5'),
    at(b, 2 * Q, 'F5'),
    at(b, 2 * Q + E, 'E5'),
    at(b, 3 * Q, 'D5'),
    at(b, 3 * Q + E, 'C5'),
    at(b + 1, 0, 'D5'),
    at(b + 1, E, 'E5'),
    at(b + 1, Q, 'F5'),
    // Sol Fa Fa Mi Mi Re
    at(b + 1, Q + E, 'G5'),
    at(b + 1, 2 * Q, 'F5'),
    at(b + 1, 2 * Q + E, 'F5'),
    at(b + 1, 3 * Q, 'E5'),
    at(b + 1, 3 * Q + E, 'E5'),
    at(b + 2, 0, 'D5'),
    // Mi Mi Re Mi Re Do
    at(b + 2, E, 'E5'),
    at(b + 2, Q, 'E5'),
    at(b + 2, Q + E, 'D5'),
    at(b + 2, 2 * Q, 'E5'),
    at(b + 2, 2 * Q + E, 'D5'),
    at(b + 2, 3 * Q, 'C5'),
  ];
}

function midClimb(startBar: number): Ev[] {
  const b = startBar;
  return [
    // Do Si Do Re Mi | Si La Si Do Re | La Sol La Si Do | Sol Fa La Sol
    at(b, 0, 'C5'),
    at(b, E, 'B4'),
    at(b, Q, 'C5'),
    at(b, Q + E, 'D5'),
    at(b, 2 * Q, 'E5'),
    at(b + 1, 0, 'B4'),
    at(b + 1, E, 'A4'),
    at(b + 1, Q, 'B4'),
    at(b + 1, Q + E, 'C5'),
    at(b + 1, 2 * Q, 'D5'),
    at(b + 2, 0, 'A4'),
    at(b + 2, E, 'G4'),
    at(b + 2, Q, 'A4'),
    at(b + 2, Q + E, 'B4'),
    at(b + 2, 2 * Q, 'C5'),
    at(b + 3, 0, 'G4'),
    at(b + 3, E, 'F4'),
    at(b + 3, Q, 'A4'),
    at(b + 3, Q + E, 'G4'),
  ];
}

function calBeni(startBar: number): Ev[] {
  const b = startBar;
  return [
    // Do Si Do Mi Re Do Si | Do Mi Re Do Do Do Si
    at(b, 0, 'C5'),
    at(b, E, 'B4'),
    at(b, Q, 'C5'),
    at(b, Q + E, 'E5'),
    at(b, 2 * Q, 'D5'),
    at(b, 2 * Q + E, 'C5'),
    at(b, 3 * Q, 'B4'),
    at(b + 1, 0, 'C5'),
    at(b + 1, E, 'E5'),
    at(b + 1, Q, 'D5'),
    at(b + 1, Q + E, 'C5'),
    at(b + 1, 2 * Q, 'C5'),
    at(b + 1, 2 * Q + E, 'C5'),
    at(b + 1, 3 * Q, 'B4'),
    // Re Do Si La | La Sol La Sol La Si
    at(b + 2, 0, 'D5'),
    at(b + 2, E, 'C5'),
    at(b + 2, Q, 'B4'),
    at(b + 2, Q + E, 'A4'),
    at(b + 3, 0, 'A4'),
    at(b + 3, E, 'G4'),
    at(b + 3, Q, 'A4'),
    at(b + 3, Q + E, 'G4'),
    at(b + 3, 2 * Q, 'A4'),
    at(b + 3, 2 * Q + E, 'B4'),
  ];
}

function alSenin(startBar: number): Ev[] {
  const b = startBar;
  return [
    ...motifYandi(b),
    // Do Mi Re Do Si Si Re Do Si
    at(b + 1, 0, 'C5'),
    at(b + 1, E, 'E5'),
    at(b + 1, Q, 'D5'),
    at(b + 1, Q + E, 'C5'),
    at(b + 1, 2 * Q, 'B4'),
    at(b + 1, 2 * Q + E, 'B4'),
    at(b + 1, 3 * Q, 'D5'),
    at(b + 1, 3 * Q + E, 'C5'),
    at(b + 2, 0, 'B4'),
    // La La Sol La Sol La Sol La Si
    at(b + 2, E, 'A4'),
    at(b + 2, Q, 'A4'),
    at(b + 2, Q + E, 'G4'),
    at(b + 2, 2 * Q, 'A4'),
    at(b + 2, 2 * Q + E, 'G4'),
    at(b + 2, 3 * Q, 'A4'),
    at(b + 3, 0, 'G4'),
    at(b + 3, E, 'A4'),
    at(b + 3, Q, 'B4'),
  ];
}

function colorBridge(startBar: number): Ev[] {
  const b = startBar;
  return [
    // La La Si Do Re Mi Fa | Sol Fa# Sol | Sib La Sol Fa# Sol
    at(b, 0, 'A4'),
    at(b, E, 'A4'),
    at(b, Q, 'B4'),
    at(b, Q + E, 'C5'),
    at(b, 2 * Q, 'D5'),
    at(b, 2 * Q + E, 'E5'),
    at(b, 3 * Q, 'F5'),
    at(b + 1, 0, 'G5'),
    at(b + 1, E, 'Gb5'),
    at(b + 1, Q, 'G5'),
    at(b + 1, 2 * Q, 'Bb4'),
    at(b + 1, 2 * Q + E, 'A4'),
    at(b + 1, 3 * Q, 'G4'),
    at(b + 2, 0, 'Gb4'),
    at(b + 2, E, 'G4'),
    // Fa Mi Fa | Lab Sol Fa Mi Fa
    at(b + 2, Q, 'F4'),
    at(b + 2, Q + E, 'E4'),
    at(b + 2, 2 * Q, 'F4'),
    at(b + 2, 3 * Q, 'Ab4'),
    at(b + 3, 0, 'G4'),
    at(b + 3, E, 'F4'),
    at(b + 3, Q, 'E4'),
    at(b + 3, Q + E, 'F4'),
    // Sol Fa Mi Re ×2 | Do Re Do Re Do | Re Si Si La Sol
    at(b + 3, 2 * Q, 'G4'),
    at(b + 3, 2 * Q + E, 'F4'),
    at(b + 3, 3 * Q, 'E4'),
    at(b + 3, 3 * Q + E, 'D4'),
    at(b + 4, 0, 'G4'),
    at(b + 4, E, 'F4'),
    at(b + 4, Q, 'E4'),
    at(b + 4, Q + E, 'D4'),
    at(b + 4, 2 * Q, 'C4'),
    at(b + 4, 2 * Q + E, 'D4'),
    at(b + 4, 3 * Q, 'C4'),
    at(b + 4, 3 * Q + E, 'D4'),
    at(b + 5, 0, 'C4'),
    at(b + 5, E, 'D4'),
    at(b + 5, Q, 'B4'),
    at(b + 5, Q + E, 'B4'),
    at(b + 5, 2 * Q, 'A4'),
    at(b + 5, 3 * Q, 'G4'),
  ];
}

const MELODY: Ev[] = [
  ...verseOpen(0),
  ...ahuHook(3),
  ...ahuHook(6),
  ...midClimb(9),
  ...calBeni(13),
  ...alSenin(17),
  // D.S. recall opening
  ...motifYandi(21),
  ...verseOpen(22).slice(5),
  ...colorBridge(25),
  ...calBeni(31),
  ...alSenin(35),
  at(39, 0, 'C5'),
];

/**
 * Chord root per bar, in La minor. The verse and the «Ahu» hook sit on Am with
 * the one Dm bar the tune spells with its Re-Fa; the mid climb walks the line
 * down Am–G–F–G; «Çal beni» circles Do, so those bars take C; and the colour
 * bridge follows its own chromatic descent G–F–C–C–G back to the tonic.
 * Written on the keyboard and sounded an octave down, under a tune that runs
 * from Do4 to Sol5.
 */
const BAR_ROOTS: NoteId[] = [
  // «Yandı gönül» verse
  'A4', 'A4', 'A4',
  // «Ahu» hook ×2
  'A4', 'D4', 'A4', 'A4', 'D4', 'A4',
  // Mid climb — descending Am–G–F–G
  'A4', 'G4', 'F4', 'G4',
  // «Çal beni»
  'C4', 'C4', 'G4', 'A4',
  // «Al senin»
  'A4', 'A4', 'A4', 'G4',
  // D.S. recall (bar 22 is the tune's rest — the bass holds it)
  'A4', 'A4', 'A4', 'A4',
  // Colour bridge
  'A4', 'G4', 'F4', 'C4', 'C4', 'G4',
  // «Çal beni» / «Al senin» again, then the last Do
  'C4', 'C4', 'G4', 'A4',
  'A4', 'A4', 'A4', 'G4',
  'A4',
];

/** Root on beats 1 and 3 — a half-note pulse under a busy eighth-note tune. */
const BASS: Ev[] = BAR_ROOTS.flatMap((noteId, barIndex) =>
  [0, 2].map((beat) => ({
    noteId,
    atMs: barIndex * BAR + beat * Q,
    durationMs: 2 * Q,
    role: 'accompaniment' as const,
    transpose: -12,
  })),
);

const EVENTS: Ev[] = [...MELODY, ...BASS].sort((a, b) => a.atMs - b.atMs);

const LAST_MS = MELODY[MELODY.length - 1]?.atMs ?? 0;
// Counted over the tune — the bass runs underneath the whole excerpt.
const partialNotes = MELODY.slice(0, 50);

export const ahuSong: SongDefinition = {
  id: 'ahu',
  title: 'Ahu',
  artist: 'Mabel Matiz',
  descriptionKey: 'tutorial.songs.ahu.description',
  previewDurationMs: Math.min(12000, LAST_MS + Q),
  events: EVENTS,
  meter: { beatMs: Q, beatsPerBar: 4 },
  partialWindowMs: {
    startMs: partialNotes[0]?.atMs ?? 0,
    endMs: partialNotes[partialNotes.length - 1]?.atMs ?? LAST_MS,
  },
};
