import type { NoteId } from '../pianoNotes';
import type { SongDefinition, SongEvent } from './types';

// Müslüm Gürses / Kenan Doğulu — "Tutamıyorum Zamanı"
// Musa Çetiner / kolaynota.com — Easy Piano, Am, 4/4.
// Page 1 verse ("İnadına yenilmeden…") + chorus title hook.
// Quarter ≈ 520ms.
const Q = 520;
const E = Q / 2;
const S = Q / 4;
const BAR = 4 * Q;

type Ev = SongEvent;

function at(bar: number, offset: number, noteId: NoteId): Ev {
  return { noteId, atMs: bar * BAR + offset };
}

/** Intro motif (M1–3): Do … Si Si | Do … Si Re | Do … Si */
function intro(startBar: number): Ev[] {
  const b = startBar;
  return [
    at(b, 0, 'C5'),
    at(b, Q + E, 'B4'),
    at(b, 2 * Q, 'B4'),
    at(b + 1, 0, 'C5'),
    at(b + 1, Q + E, 'B4'),
    at(b + 1, 2 * Q, 'D5'),
    at(b + 2, 0, 'C5'),
    at(b + 2, Q + E, 'B4'),
  ];
}

/**
 * Verse — "İnadına yenilmeden âşık olmadan gel…"
 * (kolaynota M4–11; written repeat of M5–11 played twice).
 */
function verseA(startBar: number): Ev[] {
  const b = startBar;
  return [
    // İnadı — Do … Si | Mi La Si
    at(b, 0, 'C5'),
    at(b, Q + E, 'B4'),
    at(b, 2 * Q, 'E4'),
    at(b, 2 * Q + E, 'A4'),
    at(b, 3 * Q, 'B4'),
    // na yenilmeden — Do Re Do Si La
    at(b + 1, 0, 'C5'),
    at(b + 1, E, 'D5'),
    at(b + 1, Q, 'C5'),
    at(b + 1, Q + E, 'B4'),
    at(b + 1, 2 * Q, 'A4'),
    // âşık olmadan — Sol La Sol Fa Mi
    at(b + 2, 0, 'G4'),
    at(b + 2, E, 'A4'),
    at(b + 2, Q, 'G4'),
    at(b + 2, Q + E, 'F4'),
    at(b + 2, 2 * Q, 'E4'),
    // gel
    at(b + 3, 0, 'E4'),
  ];
}

function verseB(startBar: number): Ev[] {
  const b = startBar;
  return [
    // Bu gidişin — rest + Mi La Si
    at(b, Q + E, 'E4'),
    at(b, 2 * Q, 'A4'),
    at(b, 2 * Q + E, 'B4'),
    // sonu kötü — Do Re Do Si La
    at(b + 1, 0, 'C5'),
    at(b + 1, E, 'D5'),
    at(b + 1, Q, 'C5'),
    at(b + 1, Q + E, 'B4'),
    at(b + 1, 2 * Q, 'A4'),
    // kalbi kaybetme — Sol La Sol Fa Mi
    at(b + 2, 0, 'G4'),
    at(b + 2, E, 'A4'),
    at(b + 2, Q, 'G4'),
    at(b + 2, Q + E, 'F4'),
    at(b + 2, 2 * Q, 'E4'),
    // gel (Fa held)
    at(b + 3, 0, 'F4'),
  ];
}

/** "Siyahını bırak da gel / derdi sil yeter / Aşka zulmedip küsmesen yeter" */
function verseC(startBar: number): Ev[] {
  const b = startBar;
  return [
    // Siyahını — La Si Do Re
    at(b, E, 'A4'),
    at(b, Q, 'B4'),
    at(b, Q + E, 'C5'),
    at(b, 2 * Q, 'D5'),
    // bırakta gel — Mi Re Do Si
    at(b + 1, 0, 'E5'),
    at(b + 1, E, 'D5'),
    at(b + 1, Q, 'C5'),
    at(b + 1, Q + E, 'B4'),
    // derdi sil yeter — Do Re Do Si La
    at(b + 2, 0, 'C5'),
    at(b + 2, E, 'D5'),
    at(b + 2, Q, 'C5'),
    at(b + 2, Q + E, 'B4'),
    at(b + 2, 2 * Q, 'A4'),
    // Aşka zulmedip — Re Mi Re Do Si
    at(b + 3, 0, 'D5'),
    at(b + 3, E, 'E5'),
    at(b + 3, Q, 'D5'),
    at(b + 3, Q + E, 'C5'),
    at(b + 3, 2 * Q, 'B4'),
    // küsmesen yeter — Do Re Do Si La
    at(b + 4, 0, 'C5'),
    at(b + 4, E, 'D5'),
    at(b + 4, Q, 'C5'),
    at(b + 4, Q + E, 'B4'),
    at(b + 4, 2 * Q, 'A4'),
  ];
}

/**
 * Chorus title hook — "Kal gittiğin yerde… tutamıyorum zamanı"
 * (prior BioBand / kolaynota chorus transcription).
 */
function chorus(startBar: number): Ev[] {
  const b = startBar;
  return [
    // Kal gittiğin yerde mutlu ol
    at(b, 0, 'A4'),
    at(b, E, 'A4'),
    at(b, Q, 'B4'),
    at(b, Q + E, 'C5'),
    at(b, 2 * Q, 'F5'),
    at(b, 2 * Q + E, 'E5'),
    at(b, 3 * Q, 'D5'),
    at(b, 3 * Q + E, 'D5'),
    // ya da gel — Re Db Re
    at(b + 1, 0, 'D5'),
    at(b + 1, E, 'Db5'),
    at(b + 1, Q, 'D5'),
    // kalbimde tahta sahip ol
    at(b + 1, 2 * Q, 'B4'),
    at(b + 1, 2 * Q + E, 'B4'),
    at(b + 1, 3 * Q, 'C5'),
    at(b + 1, 3 * Q + E, 'D5'),
    at(b + 2, 0, 'E5'),
    at(b + 2, E, 'D5'),
    at(b + 2, Q, 'C5'),
    at(b + 2, Q + E, 'C5'),
    // senin gülen yüzüne kurban
    at(b + 2, 2 * Q, 'C5'),
    at(b + 2, 2 * Q + S, 'C5'),
    at(b + 2, 2 * Q + 2 * S, 'C5'),
    at(b + 2, 2 * Q + 3 * S, 'D5'),
    at(b + 2, 3 * Q, 'E5'),
    at(b + 2, 3 * Q + S, 'E5'),
    at(b + 2, 3 * Q + 2 * S, 'E5'),
    at(b + 2, 3 * Q + 3 * S, 'E5'),
    at(b + 3, 0, 'E5'),
    at(b + 3, E, 'Eb5'),
    // bu serseri kalbim
    at(b + 3, Q, 'E5'),
    at(b + 3, Q + E, 'A4'),
    at(b + 3, 2 * Q, 'B4'),
    at(b + 3, 2 * Q + E, 'C5'),
    at(b + 3, 3 * Q, 'F5'),
    at(b + 3, 3 * Q + S, 'F5'),
    at(b + 3, 3 * Q + 2 * S, 'E5'),
    at(b + 4, 0, 'D5'),
    at(b + 4, E, 'D5'),
    // Ama karar ver
    at(b + 4, 2 * Q, 'D5'),
    at(b + 4, 2 * Q + E, 'Db5'),
    at(b + 4, 3 * Q, 'D5'),
    at(b + 4, 3 * Q + E, 'E5'),
    at(b + 5, 0, 'D5'),
    at(b + 5, E, 'D5'),
    // tutamıyorum
    at(b + 5, Q, 'D5'),
    at(b + 5, Q + E, 'Db5'),
    at(b + 5, 2 * Q, 'D5'),
    at(b + 5, 2 * Q + E, 'E5'),
    at(b + 5, 3 * Q, 'E5'),
    // zamanı
    at(b + 6, 0, 'C5'),
    at(b + 6, Q, 'B4'),
    at(b + 6, 2 * Q, 'A4'),
    at(b + 6, 3 * Q, 'A4'),
  ];
}

const TUTAMIYORUM_MELODY: Ev[] = [
  ...intro(0),
  // First pass: İnadına… gel / Bu gidişin… gel
  ...verseA(3),
  ...verseB(7),
  // Written repeat of the verse couplet
  ...verseA(11),
  ...verseB(15),
  // Siyahını… küsmesen yeter
  ...verseC(19),
  // Title chorus
  ...chorus(24),
  // Chorus again for a fuller "tüm şarkı"
  ...chorus(31),
];

/**
 * Chord root for each half bar, in La minor. The verse is an Am chart: the
 * Do-Si motif and the La answers are all tonic, the Sol-La-Sol-Fa bar leans on
 * C, and the two bars built on Fa take F. The chorus hook is where it moves —
 * the Re blocks (with their Do# neighbour) take Dm, and the Si-Do-Re answer
 * takes G. The B that ends each intro cell is the E dominant.
 * Written on the keyboard and sounded an octave down, under a tune that sits
 * between Mi4 and Mi5.
 */
const HALF_BAR_ROOTS: [NoteId, NoteId][] = [
  // Intro motif
  ['A4', 'E4'], ['A4', 'G4'], ['A4', 'A4'], ['A4', 'E4'],
  // "İnadına yenilmeden…" ×2
  ['A4', 'A4'], ['C4', 'A4'], ['A4', 'A4'], ['A4', 'A4'],
  ['A4', 'A4'], ['C4', 'A4'], ['F4', 'F4'],
  ['A4', 'E4'], ['A4', 'A4'], ['C4', 'A4'], ['A4', 'A4'], ['A4', 'A4'],
  ['A4', 'A4'], ['C4', 'A4'], ['F4', 'F4'],
  // "kaybetme gel"
  ['A4', 'G4'], ['A4', 'A4'], ['A4', 'A4'], ['D4', 'G4'], ['A4', 'A4'],
  // Chorus title hook ×2
  ['A4', 'D4'], ['D4', 'G4'], ['A4', 'A4'], ['A4', 'F4'], ['D4', 'D4'],
  ['D4', 'A4'], ['A4', 'A4'],
  ['A4', 'D4'], ['D4', 'G4'], ['A4', 'A4'], ['A4', 'F4'], ['D4', 'D4'],
  ['D4', 'A4'], ['A4', 'A4'],
];

/** Root on beats 1 and 3 — a half-note pulse under the tune. */
const BASS: Ev[] = HALF_BAR_ROOTS.flatMap(([first, second], barIndex) =>
  [first, second].map((noteId, half) => ({
    noteId,
    atMs: barIndex * BAR + half * 2 * Q,
    durationMs: 2 * Q,
    role: 'accompaniment' as const,
    transpose: -12,
  })),
);

const TUTAMIYORUM_EVENTS: Ev[] = [...TUTAMIYORUM_MELODY, ...BASS].sort(
  (a, b) => a.atMs - b.atMs,
);

const LAST_MS = TUTAMIYORUM_MELODY[TUTAMIYORUM_MELODY.length - 1]?.atMs ?? 0;

// Partial ≈ first verse page (~50 notes): intro + "İnadına… kaybetme gel"
// Counted over the tune — the bass runs underneath the whole excerpt.
const PARTIAL_END_MS = 11 * BAR;
const verseNotes = TUTAMIYORUM_MELODY.filter((e) => e.atMs < PARTIAL_END_MS);
const partialNotes =
  verseNotes.length >= 50
    ? verseNotes.slice(0, 50)
    : TUTAMIYORUM_MELODY.slice(0, 50);

export const tutamiyorumZamaniSong: SongDefinition = {
  id: 'tutamiyorum-zamani',
  title: 'Tutamıyorum Zamanı',
  artist: 'Müslüm Gürses',
  descriptionKey: 'tutorial.songs.tutamiyorumZamani.description',
  previewDurationMs: Math.min(12000, LAST_MS + Q),
  events: TUTAMIYORUM_EVENTS,
  meter: { beatMs: Q, beatsPerBar: 4 },
  partialWindowMs: {
    startMs: partialNotes[0]?.atMs ?? 0,
    endMs: partialNotes[partialNotes.length - 1]?.atMs ?? LAST_MS,
  },
};
