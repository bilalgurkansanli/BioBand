import { e, note } from './songHelpers';
import type { GuitarSongEvent } from './types';

/**
 * Romance Anónimo (İspanyol Romansı) — 3/4, ~100 BPM.
 * The most famous classical-guitar melody; E-minor section only.
 */
const BEAT = 600;
const BAR = BEAT * 3;

/**
 * Main statement (7 bars), top voice per beat:
 * B B B | C B A | G G G | A G F# | E E E | F# E D# | E(hold)
 */
function romanceStatement(startMs: number): GuitarSongEvent[] {
  return [
    note('s1', 7, startMs),
    note('s1', 7, startMs + BEAT),
    note('s1', 7, startMs + BEAT * 2),
    note('s1', 8, startMs + BAR),
    note('s1', 7, startMs + BAR + BEAT),
    note('s1', 5, startMs + BAR + BEAT * 2),
    note('s1', 3, startMs + BAR * 2),
    note('s1', 3, startMs + BAR * 2 + BEAT),
    note('s1', 3, startMs + BAR * 2 + BEAT * 2),
    note('s1', 5, startMs + BAR * 3),
    note('s1', 3, startMs + BAR * 3 + BEAT),
    note('s1', 2, startMs + BAR * 3 + BEAT * 2),
    note('s1', 0, startMs + BAR * 4),
    note('s1', 0, startMs + BAR * 4 + BEAT),
    note('s1', 0, startMs + BAR * 4 + BEAT * 2),
    note('s1', 2, startMs + BAR * 5),
    note('s1', 0, startMs + BAR * 5 + BEAT),
    note('s2', 4, startMs + BAR * 5 + BEAT * 2),
    note('s1', 0, startMs + BAR * 6),
  ];
}

/** B7 → Em closing gesture. */
function romanceCadence(startMs: number): GuitarSongEvent[] {
  return [
    note('s1', 2, startMs + BEAT),
    note('s2', 4, startMs + BEAT * 2),
    note('s2', 0, startMs + BAR),
    note('s1', 0, startMs + BAR + BEAT * 2),
  ];
}

export const ISPANYOL_ROMANSI_EVENTS: GuitarSongEvent[] = [
  e('chord:Em', 0),
  ...romanceStatement(BEAT),
  e('chord:Em', BAR * 8),
  ...romanceStatement(BAR * 8 + BEAT),
  e('chord:B7', BAR * 16),
  ...romanceCadence(BAR * 16),
  e('chord:Em', BAR * 18),
];

/** Chord + first four bars of the theme. */
export const ISPANYOL_ROMANSI_PARTIAL_COUNT = 13;
