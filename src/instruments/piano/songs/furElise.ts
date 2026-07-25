import type { NoteId } from '../pianoNotes';
import type { SongDefinition, SongEvent } from './types';

// Beethoven — Für Elise, WoO 59. Pitches and rhythms follow the Mutopia
// Project's public-domain engraving of the Breitkopf & Härtel text (typeset by
// Stelios Samelis), not a simplified letter sheet.
//
// SOUNDING KEY IS A MINOR — Beethoven's own, untransposed. The right hand of
// this rondo page runs C4–E5 apart from a single note, so unlike most of the
// catalog it needs no shifting at all: the E5–D#5 oscillation sits exactly
// where he wrote it and the low C4–E4–A4 sixteenths keep their own octave.
//
// ONE NOTE IS DROPPED. The bridge back to the theme is a two-rung rocket on E
// passed between the hands: E4→E5, then E5→E6. E6 is an octave above this
// keyboard's ceiling and no transposition can hold it and the low C4 at once
// (they are 29 semitones apart), so the top rung is left out rather than
// folded down into the same register as the rung below it.
//
// Form: A – A – B, where the B block's own second half is the theme returning,
// and the piece's real last bar closes it.
// 3/8, eighth ≈ 420ms (Poco moto, quarter = 72).
const S = 210;
const E = 2 * S;
const BAR = 6 * S;
// The piece starts on the last two sixteenths of a pickup bar; putting the
// first note at zero means bar lines fall one eighth later.
const PICKUP = 4 * S;

type Ev = SongEvent;

function at(bar: number, pos: number): number {
  return bar * BAR + pos * S - PICKUP;
}

function n(bar: number, pos: number, noteId: NoteId, durationMs: number): Ev {
  return { noteId, atMs: at(bar, pos), durationMs };
}

/** Left hand — heard, never highlighted, sounded an octave below the keys. */
function lh(bar: number, pos: number, noteId: NoteId, durationMs: number): Ev {
  return {
    noteId,
    atMs: at(bar, pos),
    durationMs,
    role: 'accompaniment',
    transpose: -12,
  };
}

/**
 * The rocking arpeggio that is the piece's other half: A–E–A under the tonic
 * bars, E–E–G# under the dominant ones, three detached sixteenths and then
 * silence for the rest of the bar. Written high because the keyboard has no
 * room below; it sounds an octave down.
 */
function aArp(bar: number): Ev[] {
  return [lh(bar, 0, 'A4', S), lh(bar, 1, 'E5', S), lh(bar, 2, 'A5', S)];
}

function eArp(bar: number): Ev[] {
  return [lh(bar, 0, 'E4', S), lh(bar, 1, 'E5', S), lh(bar, 2, 'Ab5', S)];
}

/**
 * The theme: a two-sixteenth pickup and seven bars. The left hand is silent
 * for the opening bar and again when the phrase restarts — Beethoven lets the
 * tune stand alone there, and the arpeggio only answers it from bar 2.
 */
function themeA(b: number): Ev[] {
  return [
    // Pickup: E D#.
    n(b - 1, 4, 'E5', S),
    n(b - 1, 5, 'Eb5', S),

    // E D# E B D C
    n(b, 0, 'E5', S),
    n(b, 1, 'Eb5', S),
    n(b, 2, 'E5', S),
    n(b, 3, 'B4', S),
    n(b, 4, 'D5', S),
    n(b, 5, 'C5', S),

    // A (eighth, then a sixteenth of silence) | C E A
    n(b + 1, 0, 'A4', E),
    n(b + 1, 3, 'C4', S),
    n(b + 1, 4, 'E4', S),
    n(b + 1, 5, 'A4', S),

    // B (eighth) | E G# B
    n(b + 2, 0, 'B4', E),
    n(b + 2, 3, 'E4', S),
    n(b + 2, 4, 'Ab4', S),
    n(b + 2, 5, 'B4', S),

    // C (eighth) | E, then back up to the oscillation.
    n(b + 3, 0, 'C5', E),
    n(b + 3, 3, 'E4', S),
    n(b + 3, 4, 'E5', S),
    n(b + 3, 5, 'Eb5', S),

    n(b + 4, 0, 'E5', S),
    n(b + 4, 1, 'Eb5', S),
    n(b + 4, 2, 'E5', S),
    n(b + 4, 3, 'B4', S),
    n(b + 4, 4, 'D5', S),
    n(b + 4, 5, 'C5', S),

    n(b + 5, 0, 'A4', E),
    n(b + 5, 3, 'C4', S),
    n(b + 5, 4, 'E4', S),
    n(b + 5, 5, 'A4', S),

    // The answering bar: C B instead of G# B.
    n(b + 6, 0, 'B4', E),
    n(b + 6, 3, 'E4', S),
    n(b + 6, 4, 'C5', S),
    n(b + 6, 5, 'B4', S),

    ...aArp(b + 1),
    ...eArp(b + 2),
    ...aArp(b + 3),
    ...aArp(b + 5),
    ...eArp(b + 6),
  ];
}

/**
 * The C-major episode: a stepwise descent in dotted eighths, the hand-crossing
 * rocket on E, and then the theme again from bar 7 of the block.
 */
function sectionB(b: number): Ev[] {
  return [
    // E (dotted eighth) | G F E — the same shape a step lower each bar.
    n(b, 0, 'E5', 3 * S),
    n(b, 3, 'G4', S),
    n(b, 4, 'F5', S),
    n(b, 5, 'E5', S),

    n(b + 1, 0, 'D5', 3 * S),
    n(b + 1, 3, 'F4', S),
    n(b + 1, 4, 'E5', S),
    n(b + 1, 5, 'D5', S),

    n(b + 2, 0, 'C5', 3 * S),
    n(b + 2, 3, 'E4', S),
    n(b + 2, 4, 'D5', S),
    n(b + 2, 5, 'C5', S),

    // B (eighth), then the rocket: E4 up to E5. The next rung would be E6.
    n(b + 3, 0, 'B4', E),
    n(b + 3, 3, 'E4', S),
    n(b + 3, 4, 'E5', S),
    n(b + 4, 1, 'E5', S),
    n(b + 4, 5, 'Eb5', S),

    // The oscillation resumes, then the theme.
    n(b + 5, 0, 'E5', E),
    n(b + 5, 3, 'Eb5', S),
    n(b + 5, 4, 'E5', S),
    n(b + 5, 5, 'Eb5', S),

    // Left hand: the C and G roots of the descent, then the crossing bars,
    // which only double the tune and are left out.
    lh(b, 0, 'C4', S),
    lh(b, 1, 'G4', S),
    lh(b, 2, 'C5', S),
    lh(b + 1, 0, 'G4', S),
    lh(b + 1, 1, 'G5', S),
    lh(b + 1, 2, 'B5', S),
    ...aArp(b + 2),
    lh(b + 3, 0, 'E4', S),
    lh(b + 3, 1, 'E5', S),

    // Bars 7–13 of the block are the theme, minus its pickup.
    ...themeA(b + 6).filter((event) => event.atMs >= at(b + 6, 0)),
  ];
}

const EVENTS: Ev[] = [
  ...themeA(1),
  // First ending: the theme lands on a quarter-note A.
  n(8, 0, 'A4', 4 * S),
  ...aArp(8),

  ...themeA(9),
  // Second ending: A, a breath, then B C D lifts into the episode.
  n(16, 0, 'A4', E),
  n(16, 3, 'B4', S),
  n(16, 4, 'C5', S),
  n(16, 5, 'D5', S),
  ...aArp(16),

  ...sectionB(17),
  // Beethoven's last bar: one short A over the low octave.
  n(30, 0, 'A4', E),
  lh(30, 0, 'A4', E),
  lh(30, 0, 'A5', E),
].sort((a, b) => a.atMs - b.atMs);

const MELODY = EVENTS.filter((event) => event.role !== 'accompaniment');
const LAST_MS = MELODY[MELODY.length - 1]?.atMs ?? 0;

// The excerpt is the first statement of the theme.
const themeNotes = MELODY.filter((event) => event.atMs < at(8, 0));
const partialNotes = themeNotes.length > 0 ? themeNotes : MELODY.slice(0, 50);

export const furEliseSong: SongDefinition = {
  id: 'fur-elise',
  title: 'Für Elise',
  artist: 'Ludwig van Beethoven',
  descriptionKey: 'tutorial.songs.furElise.description',
  previewDurationMs: Math.min(12000, LAST_MS + E),
  events: EVENTS,
  meter: { beatMs: E, beatsPerBar: 3, barStartMs: E },
  partialWindowMs: {
    startMs: partialNotes[0]?.atMs ?? 0,
    endMs: partialNotes[partialNotes.length - 1]?.atMs ?? LAST_MS,
  },
};
