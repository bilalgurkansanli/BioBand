import type { NoteId } from '../pianoNotes';
import type { SongDefinition, SongEvent } from './types';

// Serdar Ortaç — "Mesafe"
// Musa Çetiner / kolaynota.com — Easy Piano, Am (Sol# → Ab).
// Full melody (treble): verse → "Hiç yüzünden…" → "Boşver" → chorus + 2nd ending.
// Quarter ≈ 520ms (~115bpm).
const Q = 520;
const E = Q / 2;
const S = Q / 4;
const H = Q * 2;
const BAR = 4 * Q;

type Ev = SongEvent;

function at(bar: number, offset: number, noteId: NoteId): Ev {
  return { noteId, atMs: bar * BAR + offset };
}

/** Bars 1–4 — "Bir zamanlar sevdiğin…" */
function verseBlock(startBar: number): Ev[] {
  const b = startBar;
  return [
    // m1: Mi (half) Do La
    at(b, 0, 'E4'),
    at(b, H, 'C4'),
    at(b, H + Q, 'A4'),
    // m2: Si Do Re Fa
    at(b + 1, 0, 'B4'),
    at(b + 1, E, 'C5'),
    at(b + 1, Q, 'D5'),
    at(b + 1, 2 * Q, 'F5'),
    // m3: Mi Do La
    at(b + 2, 0, 'E4'),
    at(b + 2, H, 'C4'),
    at(b + 2, H + Q, 'A4'),
    // m4: Si Do Re Mi
    at(b + 3, 0, 'B4'),
    at(b + 3, E, 'C5'),
    at(b + 3, Q, 'D5'),
    at(b + 3, 2 * Q, 'E5'),
  ];
}

/** Bars 5–8 — "Hiç yüzünden darılmak / Her güzel şeye alınmak" (×2) */
function preHook(startBar: number): Ev[] {
  const b = startBar;
  return [
    // m5: 8th rest, Do×4 16ths, Do Re Si Si La
    at(b, E, 'C5'),
    at(b, E + S, 'C5'),
    at(b, E + 2 * S, 'C5'),
    at(b, E + 3 * S, 'C5'),
    at(b, Q + E, 'C5'),
    at(b, 2 * Q, 'D5'),
    at(b, 2 * Q + E, 'B4'),
    at(b, 3 * Q, 'B4'),
    at(b, 3 * Q + E, 'A4'),
    // m6: Si Do La | La Sol# La Si Sol#
    at(b + 1, 0, 'B4'),
    at(b + 1, E, 'C5'),
    at(b + 1, Q, 'A4'),
    at(b + 1, 2 * Q, 'A4'),
    at(b + 1, 2 * Q + E, 'Ab4'),
    at(b + 1, 3 * Q, 'A4'),
    at(b + 1, 3 * Q + E, 'B4'),
    at(b + 1, 3 * Q + E + S, 'Ab4'),
    // m7 = m5
    at(b + 2, E, 'C5'),
    at(b + 2, E + S, 'C5'),
    at(b + 2, E + 2 * S, 'C5'),
    at(b + 2, E + 3 * S, 'C5'),
    at(b + 2, Q + E, 'C5'),
    at(b + 2, 2 * Q, 'D5'),
    at(b + 2, 2 * Q + E, 'B4'),
    at(b + 2, 3 * Q, 'B4'),
    at(b + 2, 3 * Q + E, 'A4'),
    // m8 = m6
    at(b + 3, 0, 'B4'),
    at(b + 3, E, 'C5'),
    at(b + 3, Q, 'A4'),
    at(b + 3, 2 * Q, 'A4'),
    at(b + 3, 2 * Q + E, 'Ab4'),
    at(b + 3, 3 * Q, 'A4'),
    at(b + 3, 3 * Q + E, 'B4'),
    at(b + 3, 3 * Q + E + S, 'Ab4'),
  ];
}

/** Bars 9–16 — "Hiç yüzünden darılmak…" main hook */
function hookBlock(startBar: number): Ev[] {
  const b = startBar;
  return [
    // m9: Re Re Re Mi Fa Re Re
    at(b, 0, 'D5'),
    at(b, E, 'D5'),
    at(b, Q, 'D5'),
    at(b, Q + E, 'E5'),
    at(b, 2 * Q, 'F5'),
    at(b, 2 * Q + E, 'D5'),
    at(b, 3 * Q, 'D5'),
    // m10: Re×4 Mi Fa Re Re
    at(b + 1, 0, 'D5'),
    at(b + 1, S, 'D5'),
    at(b + 1, 2 * S, 'D5'),
    at(b + 1, 3 * S, 'D5'),
    at(b + 1, Q, 'E5'),
    at(b + 1, Q + E, 'F5'),
    at(b + 1, 2 * Q, 'D5'),
    at(b + 1, 3 * Q, 'D5'),
    // m11: Do×4 Re Mi Do Do
    at(b + 2, 0, 'C5'),
    at(b + 2, S, 'C5'),
    at(b + 2, 2 * S, 'C5'),
    at(b + 2, 3 * S, 'C5'),
    at(b + 2, Q, 'D5'),
    at(b + 2, Q + E, 'E5'),
    at(b + 2, 2 * Q, 'C5'),
    at(b + 2, 3 * Q, 'C5'),
    // m12: Do×4 Re Mi Sol Fa
    at(b + 3, 0, 'C5'),
    at(b + 3, S, 'C5'),
    at(b + 3, 2 * S, 'C5'),
    at(b + 3, 3 * S, 'C5'),
    at(b + 3, Q, 'D5'),
    at(b + 3, Q + E, 'E5'),
    at(b + 3, 2 * Q, 'G5'),
    at(b + 3, 3 * Q, 'F5'),
    // m13 = m9
    at(b + 4, 0, 'D5'),
    at(b + 4, E, 'D5'),
    at(b + 4, Q, 'D5'),
    at(b + 4, Q + E, 'E5'),
    at(b + 4, 2 * Q, 'F5'),
    at(b + 4, 2 * Q + E, 'D5'),
    at(b + 4, 3 * Q, 'D5'),
    // m14 = m10
    at(b + 5, 0, 'D5'),
    at(b + 5, S, 'D5'),
    at(b + 5, 2 * S, 'D5'),
    at(b + 5, 3 * S, 'D5'),
    at(b + 5, Q, 'E5'),
    at(b + 5, Q + E, 'F5'),
    at(b + 5, 2 * Q, 'D5'),
    at(b + 5, 3 * Q, 'D5'),
    // m15: Do Do Do Re Mi Do Do
    at(b + 6, 0, 'C5'),
    at(b + 6, E, 'C5'),
    at(b + 6, Q, 'C5'),
    at(b + 6, Q + E, 'D5'),
    at(b + 6, 2 * Q, 'E5'),
    at(b + 6, 2 * Q + E, 'C5'),
    at(b + 6, 3 * Q, 'C5'),
    // m16: Do×4 Re Mi Do Do Re Do Si
    at(b + 7, 0, 'C5'),
    at(b + 7, S, 'C5'),
    at(b + 7, 2 * S, 'C5'),
    at(b + 7, 3 * S, 'C5'),
    at(b + 7, Q, 'D5'),
    at(b + 7, Q + E, 'E5'),
    at(b + 7, 2 * Q, 'C5'),
    at(b + 7, 2 * Q + E, 'C5'),
    at(b + 7, 3 * Q, 'D5'),
    at(b + 7, 3 * Q + S, 'C5'),
    at(b + 7, 3 * Q + 2 * S, 'B4'),
  ];
}

/** Bars 17–20 — "Boşver boşver / mesafe koy mesafe koy" */
function bosver(startBar: number): Ev[] {
  const b = startBar;
  return [
    // m17: Si Si Si Do Re Si Si
    at(b, 0, 'B4'),
    at(b, E, 'B4'),
    at(b, Q, 'B4'),
    at(b, Q + E, 'C5'),
    at(b, 2 * Q, 'D5'),
    at(b, 2 * Q + E, 'B4'),
    at(b, 3 * Q, 'B4'),
    // m18: Si×4 Do Re Si Si (dense)
    at(b + 1, 0, 'B4'),
    at(b + 1, S, 'B4'),
    at(b + 1, 2 * S, 'B4'),
    at(b + 1, 3 * S, 'B4'),
    at(b + 1, Q, 'B4'),
    at(b + 1, Q + E, 'C5'),
    at(b + 1, 2 * Q, 'D5'),
    at(b + 1, 3 * Q, 'B4'),
    at(b + 1, 3 * Q + E, 'B4'),
    // m19–20: Si La | Si La (half + half)
    at(b + 2, 0, 'B4'),
    at(b + 2, H, 'A4'),
    at(b + 3, 0, 'B4'),
    at(b + 3, H, 'A4'),
  ];
}

/** Bars 21–28 — chorus 1st ending (play once through) */
function chorusFirst(startBar: number): Ev[] {
  const b = startBar;
  return [
    // m21: La La Si Do
    at(b, 0, 'A4'),
    at(b, Q, 'A4'),
    at(b, 2 * Q, 'B4'),
    at(b, 3 * Q, 'C5'),
    // m22: Fa Mi Re
    at(b + 1, 0, 'F5'),
    at(b + 1, Q, 'E5'),
    at(b + 1, 2 * Q, 'D5'),
    // m23: Re Re Do Do Si×4 Do Re
    at(b + 2, 0, 'D5'),
    at(b + 2, E, 'D5'),
    at(b + 2, Q, 'C5'),
    at(b + 2, Q + E, 'C5'),
    at(b + 2, 2 * Q, 'B4'),
    at(b + 2, 2 * Q + S, 'B4'),
    at(b + 2, 2 * Q + 2 * S, 'B4'),
    at(b + 2, 2 * Q + 3 * S, 'B4'),
    at(b + 2, 3 * Q, 'C5'),
    at(b + 2, 3 * Q + E, 'D5'),
    // m24: Mi Re Do
    at(b + 3, 0, 'E5'),
    at(b + 3, Q, 'D5'),
    at(b + 3, 2 * Q, 'C5'),
    // m25: La La La Si Do
    at(b + 4, 0, 'A4'),
    at(b + 4, E, 'A4'),
    at(b + 4, Q, 'A4'),
    at(b + 4, 2 * Q, 'B4'),
    at(b + 4, 3 * Q, 'C5'),
    // m26: Fa Mi Re
    at(b + 5, 0, 'F5'),
    at(b + 5, Q, 'E5'),
    at(b + 5, 2 * Q, 'D5'),
    // m27 1st ending: Si | Mi Re Do Mi Re Do Do
    at(b + 6, 0, 'B4'),
    at(b + 6, Q, 'E5'),
    at(b + 6, Q + E, 'D5'),
    at(b + 6, 2 * Q, 'C5'),
    at(b + 6, 2 * Q + E, 'E5'),
    at(b + 6, 3 * Q, 'D5'),
    at(b + 6, 3 * Q + E, 'C5'),
    // m28: Do held
    at(b + 7, 0, 'C5'),
  ];
}

/** Bars 29–32 — 2nd ending */
function secondEnding(startBar: number): Ev[] {
  const b = startBar;
  return [
    at(b, 0, 'B4'),
    at(b + 1, 0, 'Ab4'),
    at(b + 1, Q, 'Ab4'),
    at(b + 1, 2 * Q, 'A4'),
    at(b + 2, 0, 'B4'),
    at(b + 2, Q, 'C5'),
    at(b + 2, 2 * Q, 'B4'),
    at(b + 3, 0, 'A4'),
  ];
}

const MESAFE_MELODY: Ev[] = [
  // Page 1 — verse with written repeat (bars 1–4 twice)
  ...verseBlock(0),
  ...verseBlock(4),
  // "Hiç yüzünden…" lead-in (bars 5–8)
  ...preHook(8),
  // Main hook (bars 9–16)
  ...hookBlock(12),
  // Page 2 — Boşver / mesafe koy
  ...bosver(20),
  // Chorus + 1st ending
  ...chorusFirst(24),
  // 2nd ending (after imagined repeat)
  ...secondEnding(32),
];

/**
 * Chord root for each half bar, in La minor with the Sol# leading tone. The
 * verse spells Am outright (Mi-Do-La), answers on Dm where the line lands
 * Re-Fa, and closes on E; every Sol# in the chart is that same E dominant.
 * The hook rocks Dm against C — the melody's own Re-block against Do-block —
 * and «Boşver» sits on the Si-Re of G before falling back through E to Am.
 * Written on the keyboard and sounded an octave down, under a tune that runs
 * from Do4 to Sol5.
 */
const HALF_BAR_ROOTS: [NoteId, NoteId][] = [
  // Verse ×2
  ['A4', 'A4'], ['D4', 'D4'], ['A4', 'A4'], ['E4', 'E4'],
  ['A4', 'A4'], ['D4', 'D4'], ['A4', 'A4'], ['E4', 'E4'],
  // "Hiç yüzünden…" lead-in — the Sol# half bars are E
  ['A4', 'A4'], ['A4', 'E4'], ['A4', 'A4'], ['A4', 'E4'],
  // Main hook — Dm block, Do block, twice
  ['D4', 'D4'], ['D4', 'D4'], ['C4', 'C4'], ['C4', 'C4'],
  ['D4', 'D4'], ['D4', 'D4'], ['C4', 'C4'], ['C4', 'C4'],
  // "Boşver / mesafe koy"
  ['G4', 'G4'], ['G4', 'G4'], ['E4', 'A4'], ['E4', 'A4'],
  // Chorus + 1st ending
  ['A4', 'A4'], ['D4', 'D4'], ['D4', 'G4'], ['A4', 'A4'],
  ['A4', 'A4'], ['D4', 'D4'], ['E4', 'A4'], ['A4', 'A4'],
  // 2nd ending
  ['E4', 'E4'], ['E4', 'A4'], ['E4', 'E4'], ['A4', 'A4'],
];

/** Root on beats 1 and 3 — a half-note pulse under a sixteenth-note hook. */
const BASS: Ev[] = HALF_BAR_ROOTS.flatMap(([first, second], barIndex) =>
  [first, second].map((noteId, half) => ({
    noteId,
    atMs: barIndex * BAR + half * H,
    durationMs: H,
    role: 'accompaniment' as const,
    transpose: -12,
  })),
);

const MESAFE_EVENTS: Ev[] = [...MESAFE_MELODY, ...BASS].sort(
  (a, b) => a.atMs - b.atMs,
);

const LAST_MS = MESAFE_MELODY[MESAFE_MELODY.length - 1]?.atMs ?? 0;

// Partial ≈ "Hiç yüzünden darılmak…" (~50 notes from hook start)
// Counted over the tune — the bass runs underneath the whole excerpt.
const PARTIAL_START_MS = 12 * BAR;
const hookNotes = MESAFE_MELODY.filter((e) => e.atMs >= PARTIAL_START_MS);
const partialNotes = hookNotes.slice(0, 50);

export const mesafeSong: SongDefinition = {
  id: 'mesafe',
  title: 'Mesafe',
  artist: 'Serdar Ortaç',
  descriptionKey: 'tutorial.songs.mesafe.description',
  previewDurationMs: Math.min(12000, LAST_MS + Q),
  events: MESAFE_EVENTS,
  meter: { beatMs: Q, beatsPerBar: 4 },
  partialWindowMs: {
    startMs: partialNotes[0]?.atMs ?? PARTIAL_START_MS,
    endMs: partialNotes[partialNotes.length - 1]?.atMs ?? LAST_MS,
  },
};
