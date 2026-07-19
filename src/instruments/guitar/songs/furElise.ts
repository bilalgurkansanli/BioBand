import { e, note } from './songHelpers';
import type { GuitarSongEvent } from './types';

/**
 * Für Elise — Beethoven. Am, the famous A section.
 * `STEP` = one sixteenth of the poco moto pulse; high frets 10–12 make
 * this the upper-position workout of the catalog.
 */
const STEP = 300;

/**
 * One statement: E–D#–E–D#–E–B–D–C | A … C–E–A | B … E–G#–B | C … E.
 * `startMs` is the first E5; returns events over 23 steps.
 */
function elisePhrase(startMs: number): GuitarSongEvent[] {
  return [
    note('s1', 12, startMs),
    note('s1', 11, startMs + STEP),
    note('s1', 12, startMs + STEP * 2),
    note('s1', 11, startMs + STEP * 3),
    note('s1', 12, startMs + STEP * 4),
    note('s1', 7, startMs + STEP * 5),
    note('s1', 10, startMs + STEP * 6),
    note('s1', 8, startMs + STEP * 7),
    note('s1', 5, startMs + STEP * 8),
    note('s2', 1, startMs + STEP * 10),
    note('s1', 0, startMs + STEP * 11),
    note('s1', 5, startMs + STEP * 12),
    note('s1', 7, startMs + STEP * 14),
    note('s1', 0, startMs + STEP * 16),
    note('s1', 4, startMs + STEP * 17),
    note('s1', 7, startMs + STEP * 18),
    note('s1', 8, startMs + STEP * 20),
    note('s1', 0, startMs + STEP * 22),
  ];
}

/** Closing turn — B–C | B–A(hold). */
function eliseEnding(startMs: number): GuitarSongEvent[] {
  return [
    note('s1', 7, startMs),
    note('s1', 8, startMs + STEP * 2),
    note('s1', 7, startMs + STEP * 4),
    note('s1', 5, startMs + STEP * 6),
  ];
}

const PHRASE_STEPS = 23;

export const FUR_ELISE_EVENTS: GuitarSongEvent[] = [
  ...elisePhrase(0),
  e('chord:Am', STEP * (PHRASE_STEPS + 1)),
  ...elisePhrase(STEP * (PHRASE_STEPS + 2)),
  e('chord:E', STEP * (PHRASE_STEPS * 2 + 3)),
  ...elisePhrase(STEP * (PHRASE_STEPS * 2 + 4)),
  e('chord:Am', STEP * (PHRASE_STEPS * 3 + 5)),
  ...eliseEnding(STEP * (PHRASE_STEPS * 3 + 6)),
];

/** First statement through the A landing. */
export const FUR_ELISE_PARTIAL_COUNT = 12;
