import { e, note } from './songHelpers';
import type { GuitarSongEvent } from './types';

/**
 * Hotel California — Eagles. Bm, ~75 BPM feel.
 * Verse vocal contour over the famous descending progression
 * (Bm–F#–A–E–G–D–Em–F#); no F#-major chord preset, so landmarks
 * only mark Bm / A / G / Em bars. A# notes are the F#-major color.
 */
const BEAT = 600;
const BAR = BEAT * 4;

/** "On a dark desert highway, cool wind in my hair…" (bars 1–4). */
function verseFirstHalf(startMs: number): GuitarSongEvent[] {
  return [
    // Bm — "on a dark desert highway"
    note('s2', 3, startMs),
    note('s2', 3, startMs + BEAT * 0.5),
    note('s2', 3, startMs + BEAT),
    note('s2', 3, startMs + BEAT * 1.5),
    note('s2', 2, startMs + BEAT * 2),
    note('s2', 0, startMs + BEAT * 3),
    // F# — "cool wind in my hair"
    note('s2', 2, startMs + BAR),
    note('s2', 2, startMs + BAR + BEAT),
    note('s2', 2, startMs + BAR + BEAT * 1.5),
    note('s3', 3, startMs + BAR + BEAT * 2),
    // A — "warm smell of colitas"
    note('s2', 2, startMs + BAR * 2),
    note('s2', 2, startMs + BAR * 2 + BEAT * 0.5),
    note('s2', 2, startMs + BAR * 2 + BEAT),
    note('s2', 2, startMs + BAR * 2 + BEAT * 1.5),
    note('s2', 0, startMs + BAR * 2 + BEAT * 2),
    note('s3', 2, startMs + BAR * 2 + BEAT * 3),
    // E — "rising up through the air"
    note('s2', 0, startMs + BAR * 3),
    note('s2', 0, startMs + BAR * 3 + BEAT),
    note('s2', 0, startMs + BAR * 3 + BEAT * 1.5),
    note('s3', 1, startMs + BAR * 3 + BEAT * 2),
    note('s4', 2, startMs + BAR * 3 + BEAT * 2.5),
  ];
}

/** "Up ahead in the distance… I had to stop for the night" (bars 5–8). */
function verseSecondHalf(startMs: number): GuitarSongEvent[] {
  return [
    // G — "up ahead in the distance"
    note('s2', 0, startMs),
    note('s2', 0, startMs + BEAT * 0.5),
    note('s2', 0, startMs + BEAT),
    note('s2', 0, startMs + BEAT * 1.5),
    note('s3', 2, startMs + BEAT * 2),
    note('s3', 0, startMs + BEAT * 3),
    // D — "I saw a shimmering light"
    note('s3', 2, startMs + BAR),
    note('s3', 2, startMs + BAR + BEAT),
    note('s3', 2, startMs + BAR + BEAT * 1.5),
    note('s4', 4, startMs + BAR + BEAT * 2),
    note('s4', 0, startMs + BAR + BEAT * 3),
    // Em — "my head grew heavy and my sight grew dim"
    note('s3', 0, startMs + BAR * 2),
    note('s3', 0, startMs + BAR * 2 + BEAT * 0.5),
    note('s3', 0, startMs + BAR * 2 + BEAT),
    note('s3', 0, startMs + BAR * 2 + BEAT * 1.5),
    note('s4', 4, startMs + BAR * 2 + BEAT * 2),
    note('s4', 2, startMs + BAR * 2 + BEAT * 3),
    // F# — "I had to stop for the night"
    note('s2', 2, startMs + BAR * 3),
    note('s2', 2, startMs + BAR * 3 + BEAT),
    note('s3', 3, startMs + BAR * 3 + BEAT * 2),
    note('s4', 4, startMs + BAR * 3 + BEAT * 3),
  ];
}

/** Chorus — "Welcome to the Hotel California" (2 bars). */
function chorusLine1(startMs: number): GuitarSongEvent[] {
  return [
    note('s2', 3, startMs),
    note('s2', 3, startMs + BEAT * 0.5),
    note('s2', 3, startMs + BEAT),
    note('s2', 3, startMs + BEAT * 1.5),
    note('s1', 0, startMs + BEAT * 2),
    note('s2', 3, startMs + BEAT * 3),
    note('s2', 2, startMs + BAR),
    note('s2', 0, startMs + BAR + BEAT * 2),
  ];
}

/** "Such a lovely place, such a lovely face" (2 bars). */
function chorusLine2(startMs: number): GuitarSongEvent[] {
  return [
    note('s2', 0, startMs),
    note('s2', 2, startMs + BEAT * 0.5),
    note('s2', 3, startMs + BEAT),
    note('s2', 2, startMs + BEAT * 2),
    note('s2', 0, startMs + BEAT * 3),
    note('s3', 2, startMs + BAR),
    note('s2', 0, startMs + BAR + BEAT * 2),
  ];
}

export const HOTEL_CALIFORNIA_EVENTS: GuitarSongEvent[] = [
  e('chord:Bm', 0),
  ...verseFirstHalf(BEAT),
  e('chord:G', BAR * 4),
  ...verseSecondHalf(BAR * 4 + BEAT),
  e('chord:G', BAR * 9),
  ...chorusLine1(BAR * 9 + BEAT),
  e('chord:Em', BAR * 11),
  ...chorusLine2(BAR * 11 + BEAT),
  e('chord:G', BAR * 13),
  ...chorusLine1(BAR * 13 + BEAT),
  e('chord:Bm', BAR * 15),
  ...chorusLine2(BAR * 15 + BEAT),
  note('s5', 2, BAR * 17),
];

/** Chord + first Bm/F# lines. */
export const HOTEL_CALIFORNIA_PARTIAL_COUNT = 11;
