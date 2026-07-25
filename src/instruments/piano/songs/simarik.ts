import type { NoteId } from '../pianoNotes';
import type { SongDefinition, SongEvent } from './types';

// Tarkan — "Şımarık" (Sezen Aksu / Tarkan / Ozan Çolakoğlu)
// Sheet: simarik.pdf (Am/Em feel, F# → Gb). Treble melody only.
// Form: Intro riff → verse → "Seni gidi…" chorus → "ocağına düştüm…" → tag.
// Quarter ≈ 420ms (~143bpm).
const Q = 420;
const E = Q / 2;
const S = Q / 4;
const BAR = 4 * Q;

type Ev = SongEvent;

function at(bar: number, offset: number, noteId: NoteId): Ev {
  return { noteId, atMs: bar * BAR + offset };
}

/** One bar intro ostinato: Am 8×16th | Em 8×16th (F# → Gb). */
function introBar(bar: number, emNotes = 8): Ev[] {
  const am: NoteId[] = [
    'A4',
    'B4',
    'C5',
    'B4',
    'A4',
    'G4',
    'A4',
    'B4',
  ];
  const em: NoteId[] = [
    'E4',
    'Gb4',
    'G4',
    'Gb4',
    'E4',
    'D4',
    'E4',
    'Gb4',
  ];
  const out: Ev[] = [];
  am.forEach((n, i) => out.push(at(bar, i * S, n)));
  em.slice(0, emNotes).forEach((n, i) => out.push(at(bar, 2 * Q + i * S, n)));
  return out;
}

/** Verse — "Takmış koluna… / Orta yerinden… / Ağzında sakız… / arsız arsız…" */
function verse(startBar: number): Ev[] {
  const b = startBar;
  return [
    // m: Takmış koluna elin adamını beni — A×4 B×4 C×4 B×4
    ...[0, 1, 2, 3].map((i) => at(b, i * S, 'A4')),
    ...[0, 1, 2, 3].map((i) => at(b, Q + i * S, 'B4')),
    ...[0, 1, 2, 3].map((i) => at(b, 2 * Q + i * S, 'C5')),
    ...[0, 1, 2, 3].map((i) => at(b, 3 * Q + i * S, 'B4')),
    // Orta yerinden çatlatıyor — A×4 B×4 then rest
    ...[0, 1, 2, 3].map((i) => at(b + 1, i * S, 'A4')),
    ...[0, 1, 2, 3].map((i) => at(b + 1, Q + i * S, 'B4')),
    // Ağzında sakız şişirip şişirip — A then G (Am|Em)
    ...[0, 1, 2, 3].map((i) => at(b + 2, i * S, 'A4')),
    at(b + 2, Q, 'A4'),
    at(b + 2, Q + E, 'A4'),
    ...[0, 1, 2, 3].map((i) => at(b + 2, 2 * Q + i * S, 'G4')),
    at(b + 2, 3 * Q, 'G4'),
    at(b + 2, 3 * Q + E, 'G4'),
    // arsız arsız patlatıyor
    ...[0, 1, 2, 3].map((i) => at(b + 3, i * S, 'A4')),
    at(b + 3, Q, 'A4'),
    at(b + 3, Q + E, 'A4'),
  ];
}

/**
 * Famous chorus — "Seni gidi fındık kıran / yılanı deliğinden çıkaran…"
 * (Am/G contour used in prior BioBand chart + sheet page-1 chorus.)
 */
function seniGidi(startBar: number): Ev[] {
  const b = startBar;
  return [
    // Seni gidi fındık kıran
    at(b, 0, 'A4'),
    at(b, E, 'A4'),
    at(b, Q, 'A4'),
    at(b, Q + E, 'A4'),
    at(b, 2 * Q, 'C5'),
    at(b, 2 * Q + S, 'C5'),
    at(b, 2 * Q + 2 * S, 'B4'),
    at(b, 2 * Q + 3 * S, 'C5'),
    at(b, 3 * Q, 'B4'),
    at(b, 3 * Q + S, 'C5'),
    at(b, 3 * Q + 2 * S, 'B4'),
    at(b, 3 * Q + 3 * S, 'A4'),
    // yılanı deliğinden çıkaran
    at(b + 1, 0, 'G4'),
    at(b + 1, E, 'G4'),
    at(b + 1, Q, 'G4'),
    at(b + 1, 2 * Q, 'B4'),
    at(b + 1, 2 * Q + S, 'B4'),
    at(b + 1, 2 * Q + 2 * S, 'A4'),
    at(b + 1, 2 * Q + 3 * S, 'B4'),
    at(b + 1, 3 * Q, 'A4'),
    at(b + 1, 3 * Q + S, 'B4'),
    at(b + 1, 3 * Q + 2 * S, 'A4'),
    at(b + 1, 3 * Q + 3 * S, 'G4'),
    // Kaderim püsküllü belam
    at(b + 2, 0, 'A4'),
    at(b + 2, E, 'A4'),
    at(b + 2, Q, 'A4'),
    at(b + 2, Q + E, 'A4'),
    at(b + 2, 2 * Q, 'C5'),
    at(b + 2, 2 * Q + S, 'C5'),
    at(b + 2, 2 * Q + 2 * S, 'B4'),
    at(b + 2, 2 * Q + 3 * S, 'C5'),
    at(b + 2, 3 * Q, 'B4'),
    at(b + 2, 3 * Q + S, 'C5'),
    at(b + 2, 3 * Q + 2 * S, 'B4'),
    at(b + 2, 3 * Q + 3 * S, 'A4'),
    // Yakalarsam
    at(b + 3, 0, 'E4'),
    at(b + 3, E, 'E4'),
    at(b + 3, Q, 'E4'),
    at(b + 3, 2 * Q, 'G4'),
    at(b + 3, 2 * Q + S, 'G4'),
    at(b + 3, 2 * Q + 2 * S, 'A4'),
    at(b + 3, 2 * Q + 3 * S, 'A4'),
  ];
}

/** "Ocağına / kucağına / sıcağına düştüm yavrum / el aman" (PDF p2). */
function ocagina(startBar: number): Ev[] {
  const b = startBar;
  return [
    // ocağına düştüm yavrum
    at(b, 0, 'A4'),
    at(b, S, 'B4'),
    at(b, 2 * S, 'C5'),
    at(b, 3 * S, 'D5'),
    at(b, Q, 'E5'),
    at(b, Q + E, 'E5'),
    at(b, 2 * Q, 'D5'),
    at(b, 2 * Q + S, 'E5'),
    at(b, 2 * Q + 2 * S, 'C5'),
    // kucağına düştüm yavrum (up)
    at(b + 1, 0, 'E5'),
    at(b + 1, S, 'Gb5'),
    at(b + 1, 2 * S, 'G5'),
    at(b + 1, 3 * S, 'A5'),
    at(b + 1, Q, 'B5'),
    at(b + 1, Q + E, 'B5'),
    at(b + 1, 2 * Q, 'A5'),
    at(b + 1, 2 * Q + S, 'B5'),
    at(b + 1, 2 * Q + 2 * S, 'G5'),
    // sıcağına düştüm yavrum
    at(b + 2, 0, 'A4'),
    at(b + 2, S, 'B4'),
    at(b + 2, 2 * S, 'C5'),
    at(b + 2, 3 * S, 'D5'),
    at(b + 2, Q, 'E5'),
    at(b + 2, Q + E, 'E5'),
    at(b + 2, 2 * Q, 'D5'),
    at(b + 2, 2 * Q + S, 'E5'),
    at(b + 2, 2 * Q + 2 * S, 'C5'),
    // el aman — descending run
    at(b + 3, 0, 'B4'),
    at(b + 3, E, 'B4'),
    at(b + 3, Q, 'B4'),
    at(b + 3, Q + S, 'C5'),
    at(b + 3, Q + 2 * S, 'D5'),
    at(b + 3, Q + 3 * S, 'E5'),
    at(b + 3, 2 * Q, 'D5'),
    at(b + 3, 2 * Q + S, 'C5'),
    at(b + 3, 2 * Q + 2 * S, 'B4'),
    at(b + 3, 2 * Q + 3 * S, 'A4'),
    at(b + 3, 3 * Q, 'G4'),
    at(b + 3, 3 * Q + S, 'Gb4'),
    at(b + 3, 3 * Q + 2 * S, 'E4'),
  ];
}

const SIMARIK_MELODY: Ev[] = [
  // Intro riff. Four bars — two statements of the two-bar ostinato, which is
  // what the record plays before the vocal enters. Eight bars of it, as this
  // chart used to have, is 125 notes of the same figure and thirteen seconds
  // of nothing happening before the song starts.
  ...introBar(0),
  ...introBar(1),
  ...introBar(2),
  ...introBar(3, 5),
  // Verse
  ...verse(4),
  // Chorus "Seni gidi…"
  ...seniGidi(8),
  // "Ocağına düştüm…"
  ...ocagina(12),
  // Chorus again (tag)
  ...seniGidi(16),
  ...ocagina(20),
];

/**
 * Chord root for each half bar — the Am ↔ Em swing the riff is built on.
 * The intro alternates every two beats (its own ostinato spells Am then Em);
 * the chorus sits on Am, drops to G where the tune leans on G/B, and answers
 * on Em. Written on the keyboard and sounded an octave down, since the tune
 * already occupies both octaves the keys cover.
 */
const HALF_BAR_ROOTS: [NoteId, NoteId][] = [
  // Intro ostinato ×4 — Am | Em
  ['A4', 'E4'], ['A4', 'E4'], ['A4', 'E4'], ['A4', 'E4'],
  // Verse — Am throughout, third bar answers on Em with the tune's G
  ['A4', 'A4'], ['A4', 'A4'], ['A4', 'E4'], ['A4', 'A4'],
  // "Seni gidi…" — Am | G | Am | Em
  ['A4', 'A4'], ['G4', 'G4'], ['A4', 'A4'], ['E4', 'E4'],
  // "Ocağına…" — Am | Em | Am | Em
  ['A4', 'A4'], ['E4', 'E4'], ['A4', 'A4'], ['E4', 'E4'],
  // Chorus tag
  ['A4', 'A4'], ['G4', 'G4'], ['A4', 'A4'], ['E4', 'E4'],
  ['A4', 'A4'], ['E4', 'E4'], ['A4', 'A4'], ['E4', 'E4'],
];

/** Root on beats 1 and 3 — the steady two-feel under the 16th-note riff. */
const BASS: Ev[] = HALF_BAR_ROOTS.flatMap(([first, second], barIndex) =>
  [first, second].map((noteId, half) => ({
    noteId,
    atMs: barIndex * BAR + half * 2 * Q,
    durationMs: 2 * Q,
    role: 'accompaniment' as const,
    transpose: -12,
  })),
);

const SIMARIK_EVENTS: Ev[] = [...SIMARIK_MELODY, ...BASS].sort(
  (a, b) => a.atMs - b.atMs,
);

const LAST_MS = SIMARIK_MELODY[SIMARIK_MELODY.length - 1]?.atMs ?? 0;

// Partial ≈ first "Seni gidi…" chorus (~50 notes)
// Counted over the tune — the bass runs underneath the whole excerpt.
const PARTIAL_START_MS = 8 * BAR;
const chorusNotes = SIMARIK_MELODY.filter((e) => e.atMs >= PARTIAL_START_MS);
const partialNotes = chorusNotes.slice(0, 50);

export const simarikSong: SongDefinition = {
  id: 'simarik',
  title: 'Şımarık',
  artist: 'Tarkan',
  descriptionKey: 'tutorial.songs.simarik.description',
  previewDurationMs: Math.min(12000, LAST_MS + Q),
  events: SIMARIK_EVENTS,
  meter: { beatMs: Q, beatsPerBar: 4 },
  partialWindowMs: {
    startMs: partialNotes[0]?.atMs ?? 0,
    endMs: partialNotes[partialNotes.length - 1]?.atMs ?? LAST_MS,
  },
};
