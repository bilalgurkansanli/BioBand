import { e, note } from './songHelpers';
import type { GuitarSongEvent } from './types';

/**
 * Yesterday — The Beatles. Transposed to G major for the open position.
 * C#/D# notes are the F#m7–B7 (V of Em) color from the original changes.
 */
const BEAT = 600;
const BAR = BEAT * 4;

/** "Yesterday, all my troubles seemed so far away" (4 bars). */
function verseLine1(startMs: number): GuitarSongEvent[] {
  return [
    note('s3', 2, startMs),
    note('s3', 0, startMs + BEAT * 0.5),
    note('s3', 0, startMs + BEAT),
    note('s2', 0, startMs + BAR),
    note('s2', 2, startMs + BAR + BEAT * 0.5),
    // D# — the B7 (V of Em) color from the original changes.
    note('s2', 4, startMs + BAR + BEAT),
    note('s1', 0, startMs + BAR + BEAT * 1.5),
    note('s1', 2, startMs + BAR + BEAT * 2),
    note('s1', 3, startMs + BAR + BEAT * 2.5),
    note('s1', 2, startMs + BAR + BEAT * 3),
    note('s1', 0, startMs + BAR * 2),
    note('s1', 0, startMs + BAR * 2 + BEAT * 2),
  ];
}

/** "Now it looks as though they're here to stay" (3 bars). */
function verseLine2(startMs: number): GuitarSongEvent[] {
  return [
    note('s1', 0, startMs),
    note('s1', 0, startMs + BEAT * 0.5),
    note('s2', 3, startMs + BEAT),
    note('s2', 1, startMs + BEAT * 1.5),
    note('s2', 0, startMs + BEAT * 2),
    note('s3', 2, startMs + BEAT * 2.5),
    note('s3', 0, startMs + BEAT * 3),
    note('s3', 0, startMs + BAR),
  ];
}

/** "Oh, I believe in yesterday" (3 bars, settles on G). */
function verseLine3(startMs: number): GuitarSongEvent[] {
  return [
    note('s3', 0, startMs),
    note('s2', 0, startMs + BEAT),
    note('s2', 1, startMs + BEAT * 1.5),
    note('s2', 0, startMs + BEAT * 2),
    note('s3', 2, startMs + BEAT * 3),
    note('s3', 0, startMs + BAR),
    note('s3', 2, startMs + BAR + BEAT),
    note('s3', 0, startMs + BAR + BEAT * 2),
  ];
}

const VERSE_MS = BAR * 10;

function fullVerse(startMs: number): GuitarSongEvent[] {
  return [
    e('chord:G', startMs),
    ...verseLine1(startMs + BEAT),
    e('chord:B7', startMs + BAR * 3),
    ...verseLine2(startMs + BAR * 3 + BEAT),
    e('chord:C', startMs + BAR * 6),
    ...verseLine3(startMs + BAR * 6 + BEAT),
    e('chord:G', startMs + BAR * 9),
  ];
}

export const YESTERDAY_EVENTS: GuitarSongEvent[] = [
  ...fullVerse(0),
  ...fullVerse(VERSE_MS),
  e('chord:Em', VERSE_MS * 2),
  note('s3', 2, VERSE_MS * 2 + BEAT),
  note('s3', 0, VERSE_MS * 2 + BEAT * 2),
  e('chord:G', VERSE_MS * 2 + BAR),
  note('s3', 0, VERSE_MS * 2 + BAR + BEAT),
];

/** First "Yesterday…" line with its chords. */
export const YESTERDAY_PARTIAL_COUNT = 13;
