import { e, note } from './songHelpers';
import type { GuitarSongEvent } from './types';

/** 72 BPM — slightly brisker than sheet 60 for tutorial flow. */
const BEAT = 833;
const BAR = BEAT * 4;

/**
 * Vocal contour “Mama take this badge…” over G–D–Am / G–D–C.
 * Mostly open G shape neighborhood.
 */
function knockinVerseAm(startMs: number): GuitarSongEvent[] {
  return [
    note('s3', 0, startMs + BEAT),
    note('s2', 0, startMs + BEAT * 1.5),
    note('s2', 1, startMs + BEAT * 2),
    note('s2', 3, startMs + BEAT * 3),
    note('s1', 3, startMs + BAR),
    note('s1', 0, startMs + BAR + BEAT),
    note('s2', 3, startMs + BAR + BEAT * 2),
    note('s2', 1, startMs + BAR + BEAT * 3),
    note('s2', 0, startMs + BAR * 2),
    note('s3', 2, startMs + BAR * 2 + BEAT),
    note('s3', 0, startMs + BAR * 2 + BEAT * 2),
    note('s2', 0, startMs + BAR * 2 + BEAT * 3),
    note('s2', 1, startMs + BAR * 3),
    note('s2', 0, startMs + BAR * 3 + BEAT * 2),
  ];
}

function knockinVerseC(startMs: number): GuitarSongEvent[] {
  return [
    note('s3', 0, startMs + BEAT),
    note('s2', 0, startMs + BEAT * 1.5),
    note('s2', 1, startMs + BEAT * 2),
    note('s2', 3, startMs + BEAT * 3),
    note('s1', 3, startMs + BAR),
    note('s1', 0, startMs + BAR + BEAT),
    note('s2', 3, startMs + BAR + BEAT * 2),
    note('s2', 1, startMs + BAR + BEAT * 3),
    note('s2', 1, startMs + BAR * 2),
    note('s2', 0, startMs + BAR * 2 + BEAT),
    note('s3', 0, startMs + BAR * 2 + BEAT * 2),
    note('s3', 2, startMs + BAR * 2 + BEAT * 3),
    note('s2', 1, startMs + BAR * 3),
    note('s1', 0, startMs + BAR * 3 + BEAT * 2),
  ];
}

/** “Knock, knock, knockin’…” refrain outline. */
function knockinRefrain(startMs: number): GuitarSongEvent[] {
  return [
    note('s1', 3, startMs),
    note('s1', 3, startMs + BEAT),
    note('s1', 3, startMs + BEAT * 2),
    note('s1', 0, startMs + BEAT * 3),
    note('s2', 3, startMs + BAR),
    note('s2', 1, startMs + BAR + BEAT),
    note('s2', 0, startMs + BAR + BEAT * 2),
    note('s3', 0, startMs + BAR + BEAT * 3),
    note('s2', 1, startMs + BAR * 2),
    note('s2', 0, startMs + BAR * 2 + BEAT * 2),
    note('s3', 0, startMs + BAR * 3),
    note('s2', 0, startMs + BAR * 3 + BEAT * 2),
  ];
}

/**
 * Knockin' on Heaven's Door — Bob Dylan.
 * Melody-first; sparse G/D/Am/C landmarks (not G5 walls).
 */
export const KNOCKIN_ON_HEAVENS_DOOR_EVENTS: GuitarSongEvent[] = [
  e('chord:G', 0),
  note('s3', 0, BEAT * 0.5),
  note('s2', 0, BEAT),
  note('s2', 1, BEAT * 1.5),
  note('s1', 3, BEAT * 2),
  e('chord:D', BAR),
  note('s1', 2, BAR + BEAT),
  note('s1', 0, BAR + BEAT * 2),
  e('chord:Am', BAR * 2),
  ...knockinVerseAm(BAR * 2),
  e('chord:G', BAR * 6),
  ...knockinVerseC(BAR * 6),
  e('chord:C', BAR * 10),
  ...knockinRefrain(BAR * 10),
  e('chord:G', BAR * 14),
  ...knockinRefrain(BAR * 14),
  note('s2', 1, BAR * 18),
  note('s3', 0, BAR * 18 + BEAT * 2),
];

/** Opening G–D gesture + start of Am verse. */
export const KNOCKIN_ON_HEAVENS_DOOR_PARTIAL_COUNT = 12;
