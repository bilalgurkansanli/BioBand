import type { SongMeter } from '../../piano/songs/types';
import { e, note } from './songHelpers';
import type { GuitarSongEvent } from './types';

/**
 * My Heart Will Go On (Titanic) — Céline Dion.
 * Transposed to G major for the open position; ~96 BPM ballad.
 */
const BEAT = 620;
const BAR = BEAT * 4;

/** Verse — "Every night in my dreams, I see you, I feel you" (4 bars). */
function verseLine1(startMs: number): GuitarSongEvent[] {
  return [
    note('s2', 0, startMs),
    note('s3', 2, startMs + BEAT * 0.5),
    note('s3', 0, startMs + BEAT),
    note('s3', 2, startMs + BEAT * 1.5),
    note('s2', 0, startMs + BEAT * 2),
    note('s2', 0, startMs + BAR),
    note('s2', 1, startMs + BAR + BEAT * 0.5),
    note('s2', 0, startMs + BAR + BEAT),
    note('s3', 2, startMs + BAR * 2),
    note('s2', 0, startMs + BAR * 2 + BEAT * 0.5),
    note('s3', 2, startMs + BAR * 2 + BEAT),
    note('s3', 0, startMs + BAR * 3),
  ];
}

/** Verse answer — "That is how I know you go on" (4 bars). */
function verseLine2(startMs: number): GuitarSongEvent[] {
  return [
    note('s2', 0, startMs),
    note('s3', 2, startMs + BEAT * 0.5),
    note('s3', 0, startMs + BEAT),
    note('s3', 2, startMs + BEAT * 1.5),
    note('s2', 0, startMs + BEAT * 2),
    note('s2', 1, startMs + BAR),
    note('s2', 0, startMs + BAR + BEAT),
    note('s3', 2, startMs + BAR + BEAT * 2),
    note('s3', 2, startMs + BAR * 2),
    note('s3', 0, startMs + BAR * 2 + BEAT * 2),
  ];
}

/** Chorus — "Near, far, wherever you are" (4 bars). */
function chorusLine1(startMs: number): GuitarSongEvent[] {
  return [
    note('s2', 3, startMs),
    note('s1', 0, startMs + BAR),
    note('s2', 3, startMs + BAR * 2),
    note('s2', 1, startMs + BAR * 2 + BEAT),
    note('s2', 0, startMs + BAR * 2 + BEAT * 1.5),
    note('s2', 1, startMs + BAR * 2 + BEAT * 2),
    note('s2', 3, startMs + BAR * 3),
  ];
}

/** "I believe that the heart does go on" (4 bars, settles home). */
function chorusLine2(startMs: number): GuitarSongEvent[] {
  return [
    note('s2', 3, startMs),
    note('s1', 0, startMs + BEAT),
    note('s2', 3, startMs + BEAT * 2),
    note('s2', 1, startMs + BEAT * 3),
    note('s2', 0, startMs + BAR),
    note('s2', 1, startMs + BAR + BEAT),
    note('s2', 3, startMs + BAR + BEAT * 2),
    note('s2', 1, startMs + BAR * 2),
    note('s2', 0, startMs + BAR * 2 + BEAT),
    note('s3', 2, startMs + BAR * 2 + BEAT * 2),
    note('s3', 0, startMs + BAR * 3),
  ];
}

export const MY_HEART_WILL_GO_ON_EVENTS: GuitarSongEvent[] = [
  e('chord:G', 0),
  ...verseLine1(BEAT),
  e('chord:D', BAR * 4),
  ...verseLine2(BAR * 4 + BEAT),
  e('chord:Em', BAR * 8),
  ...verseLine1(BAR * 8 + BEAT),
  e('chord:C', BAR * 12),
  ...verseLine2(BAR * 12 + BEAT),
  e('chord:G', BAR * 16),
  ...chorusLine1(BAR * 16 + BEAT),
  e('chord:D', BAR * 20),
  ...chorusLine2(BAR * 20 + BEAT),
  e('chord:C', BAR * 24),
  ...chorusLine1(BAR * 24 + BEAT),
  e('chord:G', BAR * 28),
  note('s3', 0, BAR * 28 + BEAT),
];

/** 4/4; every phrase enters a beat late, so the bar starts there. */
export const MY_HEART_WILL_GO_ON_METER: SongMeter = {
  beatMs: BEAT,
  beatsPerBar: 4,
  barStartMs: BEAT,
};

/** Chord + first verse line. */
export const MY_HEART_WILL_GO_ON_PARTIAL_COUNT = 13;
