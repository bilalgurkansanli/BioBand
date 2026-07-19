import { e, note } from './songHelpers';
import type { GuitarSongEvent } from './types';

/**
 * Stairway to Heaven — Led Zeppelin. Am, ~72 BPM.
 * Single-note reduction of the fingerpicked intro (rising arpeggio with
 * the chromatic descending bass line implied), then the first vocal phrase.
 */
const BEAT = 420;
const BAR = BEAT * 8;

/** The famous intro — one pass over the descending Am–G#°–C/G–D/F#–F bars. */
function introLine(startMs: number): GuitarSongEvent[] {
  return [
    // Am — rising A–C–E–A
    note('s3', 2, startMs),
    note('s2', 1, startMs + BEAT),
    note('s1', 0, startMs + BEAT * 2),
    note('s1', 5, startMs + BEAT * 3),
    // G# bass — B answers over E/C
    note('s1', 7, startMs + BAR),
    note('s1', 0, startMs + BAR + BEAT),
    note('s2', 1, startMs + BAR + BEAT * 2),
    note('s1', 7, startMs + BAR + BEAT * 3),
    // G bass — C answers
    note('s1', 8, startMs + BAR * 2),
    note('s1', 0, startMs + BAR * 2 + BEAT),
    note('s2', 1, startMs + BAR * 2 + BEAT * 2),
    note('s1', 8, startMs + BAR * 2 + BEAT * 3),
    // F# bass — D/F# color
    note('s1', 2, startMs + BAR * 3),
    note('s2', 3, startMs + BAR * 3 + BEAT),
    note('s3', 2, startMs + BAR * 3 + BEAT * 2),
    note('s1', 2, startMs + BAR * 3 + BEAT * 3),
    // F — F answers, then the E cadence back home
    note('s1', 1, startMs + BAR * 4),
    note('s2', 1, startMs + BAR * 4 + BEAT),
    note('s3', 2, startMs + BAR * 4 + BEAT * 2),
    note('s1', 1, startMs + BAR * 4 + BEAT * 3),
    note('s1', 0, startMs + BAR * 5),
    note('s2', 0, startMs + BAR * 5 + BEAT),
    note('s3', 1, startMs + BAR * 5 + BEAT * 2),
    note('s4', 2, startMs + BAR * 5 + BEAT * 3),
  ];
}

/** "There's a lady who's sure all that glitters is gold…" */
function vocalPhrase(startMs: number): GuitarSongEvent[] {
  return [
    note('s1', 0, startMs),
    note('s1', 0, startMs + BEAT),
    note('s2', 1, startMs + BEAT * 2),
    note('s2', 0, startMs + BEAT * 3),
    note('s3', 2, startMs + BEAT * 4),
    note('s2', 0, startMs + BEAT * 5),
    note('s2', 1, startMs + BEAT * 6),
    note('s3', 2, startMs + BAR),
    // "…and she's buying a stairway to heaven"
    note('s3', 2, startMs + BAR + BEAT * 2),
    note('s2', 0, startMs + BAR + BEAT * 3),
    note('s2', 1, startMs + BAR + BEAT * 4),
    note('s2', 1, startMs + BAR + BEAT * 5),
    note('s2', 0, startMs + BAR * 2),
    note('s3', 2, startMs + BAR * 2 + BEAT),
    note('s3', 0, startMs + BAR * 2 + BEAT * 2),
    note('s3', 2, startMs + BAR * 2 + BEAT * 4),
  ];
}

export const STAIRWAY_TO_HEAVEN_EVENTS: GuitarSongEvent[] = [
  e('chord:Am', 0),
  ...introLine(BEAT),
  e('chord:Dfs', BAR * 6 + BEAT),
  ...introLine(BAR * 6 + BEAT * 2),
  e('chord:Am', BAR * 13),
  ...vocalPhrase(BAR * 13 + BEAT),
  e('chord:F', BAR * 16),
  ...vocalPhrase(BAR * 16 + BEAT),
  e('chord:Am', BAR * 19),
  note('s3', 2, BAR * 19 + BEAT),
];

/** Chord + the first intro pass through the D/F# bar. */
export const STAIRWAY_TO_HEAVEN_PARTIAL_COUNT = 17;
