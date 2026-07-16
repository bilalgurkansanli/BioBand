import { e, note } from './songHelpers';
import type { GuitarSongEvent } from './types';

/** ~88 BPM — folk march. */
const BEAT = 682;
const BAR = BEAT * 4;

/**
 * “Çanakkale içinde…” — pickup A B B | C F# G E C | D B C D B | A
 */
function phraseA(startMs: number): GuitarSongEvent[] {
  return [
    note('s3', 2, startMs + BEAT),
    note('s2', 0, startMs + BEAT * 2),
    note('s2', 0, startMs + BEAT * 3),
    note('s2', 1, startMs + BAR),
    note('s1', 2, startMs + BAR + BEAT * 0.75),
    note('s1', 3, startMs + BAR + BEAT),
    note('s1', 0, startMs + BAR + BEAT * 2),
    note('s2', 1, startMs + BAR + BEAT * 3),
    note('s2', 3, startMs + BAR * 2),
    note('s2', 0, startMs + BAR * 2 + BEAT),
    note('s2', 1, startMs + BAR * 2 + BEAT * 2),
    note('s2', 3, startMs + BAR * 2 + BEAT * 2.5),
    note('s2', 0, startMs + BAR * 2 + BEAT * 3),
    note('s3', 2, startMs + BAR * 3),
  ];
}

/**
 * “Ölmeden mezara koydular beni…” — C’s then chromatic color on B string.
 */
function phraseB(startMs: number): GuitarSongEvent[] {
  return [
    note('s2', 1, startMs + BEAT),
    note('s2', 1, startMs + BEAT * 2),
    note('s2', 1, startMs + BEAT * 3),
    note('s2', 3, startMs + BAR),
    note('s2', 4, startMs + BAR + BEAT),
    note('s2', 3, startMs + BAR + BEAT * 1.5),
    note('s2', 1, startMs + BAR + BEAT * 2),
    note('s2', 0, startMs + BAR + BEAT * 2.5),
    note('s2', 1, startMs + BAR + BEAT * 3),
    note('s2', 0, startMs + BAR * 2),
    note('s2', 1, startMs + BAR * 2 + BEAT * 0.5),
    note('s2', 3, startMs + BAR * 2 + BEAT),
    note('s2', 4, startMs + BAR * 2 + BEAT * 2),
    note('s2', 3, startMs + BAR * 2 + BEAT * 2.5),
    note('s2', 1, startMs + BAR * 2 + BEAT * 3),
    note('s2', 0, startMs + BAR * 2 + BEAT * 3.5),
  ];
}

/**
 * “of gençliğim eyvah” — Am hold + C–D–Am close.
 */
function phraseClose(startMs: number): GuitarSongEvent[] {
  return [
    note('s3', 2, startMs),
    note('s2', 1, startMs + BEAT * 2),
    note('s2', 0, startMs + BEAT * 2.5),
    note('s2', 1, startMs + BEAT * 3),
    note('s2', 3, startMs + BEAT * 3.5),
    note('s2', 1, startMs + BAR),
    note('s2', 1, startMs + BAR + BEAT * 0.5),
    note('s2', 0, startMs + BAR + BEAT),
    note('s2', 3, startMs + BAR + BEAT * 2),
    note('s2', 0, startMs + BAR + BEAT * 2.5),
    note('s2', 0, startMs + BAR + BEAT * 3),
    note('s3', 2, startMs + BAR + BEAT * 3.5),
    note('s3', 2, startMs + BAR * 2),
  ];
}

/**
 * Çanakkale Türküsü — traditional.
 * Melody-first from the TAB; sparse Am/C landmarks.
 */
export const CANAKKALE_TURKUSU_EVENTS: GuitarSongEvent[] = [
  e('chord:Am', 0),
  ...phraseA(0),
  e('chord:C', BAR * 4),
  ...phraseB(BAR * 4),
  e('chord:Am', BAR * 7),
  ...phraseClose(BAR * 7),
  e('chord:Am', BAR * 10),
  ...phraseA(BAR * 10),
];

/** Opening Am + phrase A. */
export const CANAKKALE_TURKUSU_PARTIAL_COUNT = 15;
