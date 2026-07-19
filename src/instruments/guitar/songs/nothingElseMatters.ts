import { e, note } from './songHelpers';
import type { GuitarSongEvent } from './types';

/**
 * Nothing Else Matters — Metallica. 6/8, slow.
 * `BEAT` = one eighth; the intro is the iconic open-string Em arpeggio.
 */
const BEAT = 340;
const BAR = BEAT * 6;

/** Signature bar: E2 → G3 → B3 → E4 → B3 → G3, all open strings. */
function introArpeggio(startMs: number): GuitarSongEvent[] {
  return [
    note('s6', 0, startMs),
    note('s3', 0, startMs + BEAT),
    note('s2', 0, startMs + BEAT * 2),
    note('s1', 0, startMs + BEAT * 3),
    note('s2', 0, startMs + BEAT * 4),
    note('s3', 0, startMs + BEAT * 5),
  ];
}

/** Picked answer over the low E — descending B-string line. */
function introAnswer(startMs: number): GuitarSongEvent[] {
  return [
    note('s6', 0, startMs),
    note('s2', 3, startMs + BEAT),
    note('s2', 1, startMs + BEAT * 2),
    note('s2', 0, startMs + BEAT * 3),
    note('s3', 2, startMs + BEAT * 4),
    note('s3', 0, startMs + BEAT * 5),
    note('s6', 0, startMs + BAR),
    note('s3', 2, startMs + BAR + BEAT * 2),
    note('s2', 0, startMs + BAR + BEAT * 4),
  ];
}

/** "So close, no matter how far…" vocal contour (2 bars). */
function verseLine1(startMs: number): GuitarSongEvent[] {
  return [
    note('s2', 0, startMs),
    note('s2', 0, startMs + BEAT),
    note('s2', 0, startMs + BEAT * 2),
    note('s2', 0, startMs + BEAT * 3),
    note('s2', 3, startMs + BEAT * 4),
    note('s2', 1, startMs + BEAT * 5),
    note('s2', 0, startMs + BAR),
  ];
}

/** "Couldn't be much more from the heart…" (2 bars). */
function verseLine2(startMs: number): GuitarSongEvent[] {
  return [
    note('s2', 0, startMs),
    note('s2', 0, startMs + BEAT),
    note('s2', 0, startMs + BEAT * 2),
    note('s2', 1, startMs + BEAT * 3),
    note('s2', 0, startMs + BEAT * 4),
    note('s3', 2, startMs + BEAT * 5),
    note('s3', 0, startMs + BAR),
    note('s3', 2, startMs + BAR + BEAT * 2),
  ];
}

/** "Forever trusting who we are…" (2 bars). */
function verseLine3(startMs: number): GuitarSongEvent[] {
  return [
    note('s3', 0, startMs),
    note('s3', 2, startMs + BEAT),
    note('s2', 0, startMs + BEAT * 2),
    note('s2', 0, startMs + BEAT * 3),
    note('s3', 2, startMs + BEAT * 4),
    note('s3', 0, startMs + BEAT * 5),
    note('s3', 2, startMs + BAR),
  ];
}

/** "And nothing else matters" — settling to low E. */
function titleCadence(startMs: number): GuitarSongEvent[] {
  return [
    note('s2', 0, startMs),
    note('s3', 2, startMs + BEAT),
    note('s3', 0, startMs + BEAT * 2),
    note('s4', 4, startMs + BEAT * 3),
    note('s4', 2, startMs + BEAT * 4),
    note('s6', 0, startMs + BAR),
  ];
}

export const NOTHING_ELSE_MATTERS_EVENTS: GuitarSongEvent[] = [
  ...introArpeggio(0),
  ...introArpeggio(BAR),
  ...introAnswer(BAR * 2),
  e('chord:Em', BAR * 4),
  ...verseLine1(BAR * 4 + BEAT),
  e('chord:D', BAR * 6),
  ...verseLine2(BAR * 6 + BEAT),
  e('chord:C', BAR * 8),
  ...verseLine3(BAR * 8 + BEAT),
  e('chord:Em', BAR * 10),
  ...titleCadence(BAR * 10 + BEAT),
  ...introArpeggio(BAR * 12),
  note('s6', 0, BAR * 13),
];

/** Two intro arpeggio bars. */
export const NOTHING_ELSE_MATTERS_PARTIAL_COUNT = 12;
