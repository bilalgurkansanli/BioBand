import type { NoteId } from '../pianoNotes';
import type { SongDefinition, SongEvent } from './types';

// Mozart — Rondo alla Turca (Türk Marşı), K.331 third movement.
// Pitches and rhythms follow the Mutopia Project's public-domain engraving
// (typeset by Rune Zedeler and Chris Sawer), not a simplified letter sheet.
//
// SOUNDING KEY IS E MINOR — a fourth below Mozart's A minor. The theme climbs
// to C6 in its fourth bar and the coda reaches E6, while this keyboard stops
// at B5. At concert pitch that peak has to be folded back an octave, which is
// what flattens the theme's rise into a monotone and makes the tune stop
// sounding like itself. Moving the whole piece down one fourth keeps every
// interval, every octave leap and the true ending intact; only the absolute
// key differs, and a fourth is the smallest shift that fits the coda too.
//
// Form: A – B – A – coda (the real Alla Turca ending, not an invented cadence).
// Quarter ≈ 440ms, 2/4.
const Q = 440;
const E = Q / 2;
const S = Q / 4;
const BAR = 2 * Q;

type Ev = SongEvent;

function n(bar: number, offset: number, noteId: NoteId, durationMs: number): Ev {
  return { noteId, atMs: bar * BAR + offset, durationMs };
}

/** Left hand — heard, never highlighted, sounded an octave below the keys. */
function lh(bar: number, offset: number, noteId: NoteId, durationMs: number): Ev {
  return {
    noteId,
    atMs: bar * BAR + offset,
    durationMs,
    role: 'accompaniment',
    transpose: -12,
  };
}

/**
 * The A theme: one pickup beat plus eight bars.
 *
 * The shape is a three-step climb — F#-E-D#-E → G, then B → C, then the same
 * turn an OCTAVE UP landing on G5. That upper-octave bar is the whole point of
 * the melody; kept in the lower octave the theme never lifts off.
 */
function themeA(startBar: number): Ev[] {
  const b = startBar;
  const out: Ev[] = [
    // Pickup on beat 2 of the previous bar: F# E D# E.
    n(b - 1, Q, 'Gb4', S),
    n(b - 1, Q + S, 'E4', S),
    n(b - 1, Q + 2 * S, 'Eb4', S),
    n(b - 1, Q + 3 * S, 'E4', S),

    // G (eighth + rest) | A G F# G
    n(b, 0, 'G4', E),
    n(b, Q, 'A4', S),
    n(b, Q + S, 'G4', S),
    n(b, Q + 2 * S, 'Gb4', S),
    n(b, Q + 3 * S, 'G4', S),

    // B (eighth + rest) | C B A# B
    n(b + 1, 0, 'B4', E),
    n(b + 1, Q, 'C5', S),
    n(b + 1, Q + S, 'B4', S),
    n(b + 1, Q + 2 * S, 'Bb4', S),
    n(b + 1, Q + 3 * S, 'B4', S),

    // The octave lift: F# E D# E, twice.
    n(b + 2, 0, 'Gb5', S),
    n(b + 2, S, 'E5', S),
    n(b + 2, 2 * S, 'Eb5', S),
    n(b + 2, 3 * S, 'E5', S),
    n(b + 2, Q, 'Gb5', S),
    n(b + 2, Q + S, 'E5', S),
    n(b + 2, Q + 2 * S, 'Eb5', S),
    n(b + 2, Q + 3 * S, 'E5', S),

    // G (accented quarter) | E G
    n(b + 3, 0, 'G5', Q),
    n(b + 3, Q, 'E5', E),
    n(b + 3, Q + E, 'G5', E),
  ];

  // Three bars of F# E D E over the dominant, the last turning to C#.
  const turns: NoteId[][] = [
    ['Gb5', 'E5', 'D5', 'E5'],
    ['Gb5', 'E5', 'D5', 'E5'],
    ['Gb5', 'E5', 'D5', 'Db5'],
  ];
  turns.forEach((bar, i) => {
    bar.forEach((noteId, j) => {
      out.push(n(b + 4 + i, j * E, noteId, E));
    });
  });

  // Cadence.
  out.push(n(b + 7, 0, 'B4', Q));

  // Left hand: staccato chords on every eighth — the march tread the piece is
  // named for. Bars 1–4 sit on E minor, bars 5–7 on the B dominant.
  const tonicBars = [b, b + 1, b + 2, b + 3];
  for (const bar of tonicBars) {
    out.push(lh(bar, 0, 'E5', E));
    for (const beat of [E, Q, Q + E]) {
      out.push(lh(bar, beat, 'G5', E));
      out.push(lh(bar, beat, 'B5', E));
    }
  }
  for (const bar of [b + 4, b + 5]) {
    out.push(lh(bar, 0, 'B4', E));
    for (const beat of [E, Q, Q + E]) {
      out.push(lh(bar, beat, 'Gb5', E));
      out.push(lh(bar, beat, 'B5', E));
    }
  }
  out.push(lh(b + 6, 0, 'B4', E));
  out.push(lh(b + 6, E, 'Gb5', E));
  out.push(lh(b + 6, E, 'B5', E));
  out.push(lh(b + 6, Q, 'Gb5', E));
  out.push(lh(b + 6, Q + E, 'Gb5', E));
  out.push(lh(b + 7, 0, 'B4', Q));

  return out;
}

/**
 * B section. Enters on a two-eighth pickup so the sixteenth run lands inside
 * the bar and the answering note falls on a downbeat.
 */
function sectionB(startBar: number): Ev[] {
  const b = startBar;
  const out: Ev[] = [];

  /** One phrase: [pickup pair], then run bar, then the note it resolves to. */
  const phrase = (
    bar: number,
    pickup: [NoteId, NoteId],
    held: NoteId,
    run: [NoteId, NoteId, NoteId, NoteId],
    landing: NoteId,
  ): void => {
    out.push(n(bar - 1, Q, pickup[0], E));
    out.push(n(bar - 1, Q + E, pickup[1], E));
    out.push(n(bar, 0, held, E));
    out.push(n(bar, E, held, E));
    run.forEach((noteId, i) => {
      out.push(n(bar, Q + i * S, noteId, S));
    });
    out.push(n(bar + 1, 0, landing, Q));
  };

  phrase(b, ['B4', 'C5'], 'D5', ['E5', 'D5', 'C5', 'B4'], 'A4');
  phrase(b + 2, ['B4', 'C5'], 'D5', ['E5', 'D5', 'C5', 'B4'], 'A4');
  // Second half sits a step lower and cadences on B.
  phrase(b + 4, ['G4', 'A4'], 'B4', ['C5', 'B4', 'A4', 'G4'], 'G4');
  phrase(b + 6, ['G4', 'A4'], 'B4', ['C5', 'B4', 'A4', 'G4'], 'Gb4');

  // Left hand keeps the tread going underneath.
  for (let i = 0; i < 8; i++) {
    const bar = b + i;
    const root: NoteId = i < 4 ? 'E5' : 'B4';
    const upper: NoteId = i < 4 ? 'G5' : 'Gb5';
    out.push(lh(bar, 0, root, E));
    for (const beat of [E, Q, Q + E]) {
      out.push(lh(bar, beat, upper, E));
      out.push(lh(bar, beat, 'B5', E));
    }
  }

  return out;
}

/**
 * The real coda: the repeated G# figure, the turn, then the A-major march —
 * here E major — that actually ends the piece.
 */
function coda(startBar: number): Ev[] {
  const b = startBar;
  const out: Ev[] = [];

  // E, then the hammered G# that opens the coda.
  out.push(n(b, 0, 'E5', Q));
  out.push(n(b, Q, 'Ab5', Q * 0.75));
  out.push(n(b, Q + Q * 0.75, 'Ab5', S));
  out.push(n(b + 1, 0, 'Ab5', 2 * Q));

  // A–G#–F#–G# turn, twice, then the held A.
  const turn: NoteId[] = ['A5', 'Ab5', 'Gb5', 'Ab5'];
  turn.forEach((noteId, i) => out.push(n(b + 2, i * S, noteId, S)));
  turn.forEach((noteId, i) => out.push(n(b + 2, Q + i * S, noteId, S)));
  out.push(n(b + 3, 0, 'A5', 2 * Q));

  // Four detached G#s, then the F#–B step that sets up the march.
  for (let i = 0; i < 4; i++) {
    out.push(n(b + 4, i * E, 'Ab5', E));
  }
  out.push(n(b + 5, 0, 'Gb5', Q + E));
  out.push(n(b + 5, Q + E, 'B5', E));

  // The march. Root on the long beat, the octave answer on the short one.
  const march: [NoteId, number][] = [
    ['Ab5', 0],
    ['B5', 1],
    ['Ab5', 2],
    ['B5', 3],
  ];
  march.forEach(([answer, i]) => {
    const bar = b + 6 + i;
    out.push(n(bar, 0, 'E5', Q + E));
    out.push(n(bar, Q + E, answer, E));
    out.push(lh(bar, 0, 'E5', Q + E));
    out.push(lh(bar, 0, 'B5', Q + E));
  });

  // Final cadence. Mozart stamps it out as full chords; one key at a time is
  // what this keyboard teaches, so it is spelled as the chord's own notes in
  // sequence and the last one is left ringing.
  out.push(n(b + 10, 0, 'B5', E));
  out.push(n(b + 10, E, 'Ab5', E));
  out.push(n(b + 10, Q, 'E5', E));
  out.push(n(b + 10, Q + E, 'B5', E));
  out.push(n(b + 11, 0, 'E5', 3 * Q));
  out.push(lh(b + 10, 0, 'E5', 2 * Q));
  out.push(lh(b + 11, 0, 'E5', 3 * Q));

  return out;
}

const EVENTS: Ev[] = [
  ...themeA(1),
  ...themeA(9),
  ...sectionB(18),
  ...themeA(27),
  ...coda(35),
].sort((a, b) => a.atMs - b.atMs);

const MELODY = EVENTS.filter((event) => event.role !== 'accompaniment');
const LAST_MS = MELODY[MELODY.length - 1]?.atMs ?? 0;

// The excerpt is the first statement of the theme.
const themeNotes = MELODY.filter((event) => event.atMs < 9 * BAR);
const partialNotes = themeNotes.length > 0 ? themeNotes : MELODY.slice(0, 50);

export const turkMarsiSong: SongDefinition = {
  id: 'turk-marsi',
  title: 'Türk Marşı',
  artist: 'Wolfgang Amadeus Mozart',
  descriptionKey: 'tutorial.songs.turkMarsi.description',
  previewDurationMs: Math.min(12000, LAST_MS + Q),
  events: EVENTS,
  meter: { beatMs: Q, beatsPerBar: 2 },
  partialWindowMs: {
    startMs: partialNotes[0]?.atMs ?? 0,
    endMs: partialNotes[partialNotes.length - 1]?.atMs ?? LAST_MS,
  },
};
