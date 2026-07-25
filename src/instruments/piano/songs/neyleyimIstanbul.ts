import type { NoteId } from '../pianoNotes';
import type { SongDefinition, SongEvent } from './types';

// Murat Dalkılıç — "Neyleyim İstanbul'u" (Oytun Karanacak)
// Musa Çetiner / kolaynota.com — full melody (intro + verse + chorus).
// Solfege → C (Lab→Ab4, Sib→Bb4). Quarter ≈ 480ms (~125bpm).
const Q = 480;
const E = Q / 2;
const S = Q / 4;
const BAR = 4 * Q;

type Ev = SongEvent;

function phrase(
  startMs: number,
  noteIds: NoteId[],
  spanMs: number = BAR,
): Ev[] {
  if (noteIds.length === 0) {
    return [];
  }
  if (noteIds.length === 1) {
    return [{ noteId: noteIds[0], atMs: startMs }];
  }
  const step = spanMs / noteIds.length;
  return noteIds.map((noteId, i) => ({
    noteId,
    atMs: Math.round(startMs + i * step),
  }));
}

function timed(startMs: number, notes: [NoteId, number][]): Ev[] {
  return notes.map(([noteId, offset]) => ({
    noteId,
    atMs: startMs + offset,
  }));
}

/**
 * Snap every onset to the nearest sixteenth.
 *
 * `phrase()` spreads N notes evenly over a bar, so a nine-note line steps in
 * 213ms — a grid that exists in no meter. Over half this chart used to land
 * between the beats, which is not heard as syncopation but as the tune being
 * slightly out of tune with itself. Pitches and order are untouched; each note
 * moves to the nearest real subdivision, and notes written together stay
 * together.
 */
function snapToGrid(): (event: Ev) => Ev {
  let previous = -Infinity;
  return (event) => {
    const snapped = Math.max(previous, Math.round(event.atMs / S) * S);
    previous = snapped;
    return { ...event, atMs: snapped };
  };
}

const NEYLEYIM_MELODY: Ev[] = [
  // ── Intro (bar 1 rest; melody bars 2–5) ──
  ...timed(BAR, [
    ['A4', 0],
    ['B4', S],
    ['A4', 2 * S],
    ['E5', E],
    ['D5', E + E],
    ['C5', E + 2 * E],
    ['B4', E + 3 * E],
    ['A4', E + 3 * E + S],
    ['G4', BAR - S],
  ]),
  ...timed(2 * BAR, [
    ['G4', 0],
    ['A4', S],
    ['G4', 2 * S],
    ['D5', E],
    ['C5', E + E],
    ['B4', E + 2 * E],
    ['A4', E + 3 * E],
    ['G4', E + 3 * E + S],
    ['F4', 2 * Q],
    ['E4', 2 * Q + S],
    ['F4', 2 * Q + 2 * S],
    ['F4', 3 * Q],
    ['E4', 3 * Q + S],
    ['F4', 3 * Q + 2 * S],
    ['E4', 3 * Q + 3 * S],
    ['F4', BAR - 3 * S],
    ['G4', BAR - 2 * S],
    ['A4', BAR - S],
  ]),
  ...timed(3 * BAR, [
    ['G4', 0],
    ['D5', Q],
    ['E5', Q + S],
    ['E5', Q + 2 * S],
    ['D5', Q + 3 * S],
    ['C5', 2 * Q],
    ['B4', 2 * Q + S],
    ['A4', 2 * Q + 2 * S],
    ['B4', 2 * Q + 3 * S],
    ['C5', 3 * Q],
  ]),
  ...timed(4 * BAR, [
    ['G4', 0],
    ['A4', S],
    ['F4', 2 * S],
    ['G4', 3 * S],
    ['E4', Q],
    ['F4', Q + S],
    ['D4', Q + 2 * S],
    ['E4', Q + 3 * S],
    ['C4', 2 * Q],
    ['G4', 3 * Q],
  ]),

  // ── "Son sözüm kalmadı söyleyecek sana" ──
  ...phrase(5 * BAR, [
    'G4',
    'G4',
    'A4',
    'A4',
    'G4',
    'F4',
    'E4',
    'E4',
    'F4',
  ]),
  ...phrase(6 * BAR, [
    'G4',
    'F4',
    'G4',
    'G4',
    'C5',
    'D5',
    'E5',
    'F5',
    'G5',
  ]),

  // "Sadece birkaç küçük sitem"
  ...phrase(7 * BAR, [
    'F5',
    'F5',
    'F5',
    'F5',
    'F5',
    'F5',
    'A5',
    'A5',
    'A5',
  ]),
  ...phrase(8 * BAR, [
    'B5',
    'A5',
    'G5',
    'G5',
    'A5',
    'B5',
    'A5',
    'G5',
    'F5',
    'E5',
    'F5',
  ]),

  // "Belki onlarda eriyip gidecek"
  ...phrase(9 * BAR, [
    'G5',
    'G5',
    'G5',
    'A5',
    'G5',
    'F5',
    'E5',
    'E5',
    'F5',
  ]),
  ...phrase(10 * BAR, [
    'A5',
    'G5',
    'A5',
    'C5',
    'B4',
    'C5',
    'D5',
    'F5',
    'E5',
    'D5',
    'C5',
  ]),

  // "Mutlu olduğunu bilsem"
  ...phrase(11 * BAR, [
    'B4',
    'G4',
    'G4',
    'A4',
    'G4',
    'F4',
    'E4',
    'D4',
  ]),
  ...phrase(12 * BAR, ['E4', 'C4'], 2 * Q),

  // "Göz görmeyince gönül katlanır derler"
  ...phrase(13 * BAR, ['G4', 'G4', 'A4', 'G4', 'E4', 'E4', 'F4']),
  ...phrase(14 * BAR, ['G4', 'F4', 'G4', 'A4', 'A4', 'G4']),

  // "Ondan biraz uzak olsam yeter"
  ...phrase(15 * BAR, [
    'F4',
    'F4',
    'F4',
    'F4',
    'F4',
    'F4',
    'E4',
    'D4',
    'F4',
  ]),
  ...phrase(16 * BAR, ['G4'], Q),

  // "Ama hiç yalnız bırakmaz anılar"
  ...phrase(17 * BAR, [
    'Ab4',
    'Ab4',
    'Ab4',
    'Bb4',
    'Ab4',
    'C5',
    'C5',
    'D5',
  ]),
  ...phrase(18 * BAR, ['G4', 'F4', 'G4', 'E4', 'E4']),

  // "Çünkü en çok mesafeyi severler"
  ...phrase(19 * BAR, [
    'D4',
    'D4',
    'D4',
    'A4',
    'G4',
    'G4',
    'D4',
    'E4',
    'C4',
  ]),

  // Scale run into bridge
  ...phrase(20 * BAR, ['C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4', 'C5']),

  // "Ben birkaç parça anıyla sarhoş oldum bugün"
  ...phrase(21 * BAR, ['A4', 'E5', 'D5', 'C5', 'C5', 'B4', 'A4']),
  ...phrase(22 * BAR, ['A4', 'F4', 'E4', 'D4', 'C4', 'B4']),

  // "Ve mutluluğum kaldı dağlar ardında"
  ...phrase(23 * BAR, ['B4', 'G4', 'F4', 'F4', 'E4', 'D4']),
  ...phrase(24 * BAR, [
    'E4',
    'D4',
    'C4',
    'B4',
    'C5',
    'B4',
    'C5',
    'C5',
    'B4',
    'C5',
  ]),

  // "Çünkü yoksun yanımda"
  ...phrase(25 * BAR, ['A4', 'A4', 'E4', 'D4', 'C4', 'B4']),
  ...phrase(26 * BAR, ['G4', 'D4', 'C4', 'C4', 'B4', 'A4']),

  // ── Chorus — "Neyleyim İstanbul'u sonbaharda" ──
  ...phrase(27 * BAR, ['F4', 'F4'], 2 * Q),
  ...phrase(27 * BAR + 2 * Q, ['B4', 'B4', 'B4', 'C5'], 2 * Q),
  ...phrase(28 * BAR, [
    'C5',
    'B4',
    'C5',
    'B4',
    'C5',
    'B4',
    'C5',
    'F4',
    'E4',
    'D4',
    'C4',
    'B4',
  ]),
  ...phrase(29 * BAR, ['A4', 'A4', 'A4', 'E4', 'D4', 'C4', 'B4']),
  ...phrase(30 * BAR, ['G4', 'D4', 'C4', 'C4', 'B4', 'A4', 'F4', 'F4']),
  ...phrase(31 * BAR, ['G4', 'B4', 'B4', 'B4', 'C5'], 2 * Q),
  // Stable sort: a few dense intro figures interleave in time; play-along
  // modes step the array in order, so it must match the audible timeline.
]
  .sort((a, b) => a.atMs - b.atMs)
  .map(snapToGrid())
  .sort((a, b) => a.atMs - b.atMs);

/**
 * Chord root for each half bar, read off the notes each half actually dwells
 * on. The chart is written round Do, so the diatonic C/Dm/Em/F/G/Am cover
 * everything except «Ama hiç yalnız bırakmaz anılar» — the one phrase built on
 * Lab and Sib, which is the borrowed Fa minor and takes F.
 * The first bar is a rest and is left silent; the bass enters with the tune.
 * Written on the keyboard and sounded an octave down, under a melody that
 * climbs to Si5.
 */
const HALF_BAR_ROOTS: [NoteId, NoteId][] = [
  // Intro (bars 2–5)
  ['A4', 'G4'], ['G4', 'F4'], ['G4', 'A4'], ['C4', 'C4'],
  // "Son sözüm kalmadı…" / "Sadece birkaç küçük sitem"
  ['C4', 'C4'], ['C4', 'C4'], ['F4', 'F4'], ['G4', 'F4'],
  // "Belki onlarda eriyip gidecek" / "Mutlu olduğunu bilsem"
  ['C4', 'C4'], ['A4', 'D4'], ['G4', 'C4'], ['C4', 'C4'],
  // "Göz görmeyince…" / "Ondan biraz uzak olsam yeter"
  ['C4', 'C4'], ['C4', 'A4'], ['F4', 'D4'], ['G4', 'G4'],
  // "Ama hiç yalnız bırakmaz anılar" — the borrowed Fm bar
  ['F4', 'F4'], ['C4', 'C4'],
  // "Çünkü en çok mesafeyi severler" + scale into the bridge
  ['D4', 'C4'], ['C4', 'G4'],
  // Bridge
  ['A4', 'A4'], ['F4', 'G4'], ['G4', 'D4'], ['C4', 'C4'],
  ['A4', 'G4'], ['C4', 'A4'],
  // Chorus — "Neyleyim İstanbul'u sonbaharda"
  ['F4', 'G4'], ['C4', 'C4'], ['A4', 'G4'], ['C4', 'F4'], ['G4', 'C4'],
];

/** Root on beats 1 and 3, from bar 2 on — bar 1 is the chart's opening rest. */
const BASS: Ev[] = HALF_BAR_ROOTS.flatMap(([first, second], i) =>
  [first, second].map((noteId, half) => ({
    noteId,
    atMs: (i + 1) * BAR + half * 2 * Q,
    durationMs: 2 * Q,
    role: 'accompaniment' as const,
    transpose: -12,
  })),
);

const NEYLEYIM_EVENTS: Ev[] = [...NEYLEYIM_MELODY, ...BASS].sort(
  (a, b) => a.atMs - b.atMs,
);

const LAST_MS = NEYLEYIM_MELODY[NEYLEYIM_MELODY.length - 1]?.atMs ?? 0;

// Partial ≈ "Çünkü yoksun yanımda / Neyleyim İstanbul'u…" (~50 notes)
// Counted over the tune — the bass runs underneath the whole excerpt.
const PARTIAL_START_MS = 25 * BAR;
const partialNotes = NEYLEYIM_MELODY.filter((e) => e.atMs >= PARTIAL_START_MS);

export const neyleyimIstanbulSong: SongDefinition = {
  id: 'neyleyim-istanbul',
  title: "Neyleyim İstanbul'u",
  artist: 'Murat Dalkılıç',
  descriptionKey: 'tutorial.songs.neyleyimIstanbul.description',
  previewDurationMs: Math.min(12000, LAST_MS + Q),
  events: NEYLEYIM_EVENTS,
  meter: { beatMs: Q, beatsPerBar: 4 },
  partialWindowMs: {
    startMs: partialNotes[0].atMs,
    endMs: partialNotes[partialNotes.length - 1].atMs,
  },
};
