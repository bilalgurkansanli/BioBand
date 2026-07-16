import { e, note } from './songHelpers';
import type { GuitarSongEvent } from './types';

/** ~100 BPM — 6/8 felt as two pulses; BEAT = eighth. */
const BEAT = 300;
const BAR = BEAT * 6;

/**
 * Iconic Am pirate motif (Musa Çetiner TAB neighborhood):
 * A G A A | A C B C  (G / B strings)
 */
function pirateHook(startMs: number): GuitarSongEvent[] {
  return [
    note('s3', 2, startMs),
    note('s3', 0, startMs + BEAT),
    note('s3', 2, startMs + BEAT * 2),
    note('s3', 2, startMs + BEAT * 3),
    note('s3', 2, startMs + BEAT * 4),
    note('s2', 1, startMs + BEAT * 5),
    note('s2', 0, startMs + BAR),
    note('s2', 1, startMs + BAR + BEAT),
  ];
}

/** Answer phrase: A E A | G F E (high e / B). */
function pirateAnswer(startMs: number): GuitarSongEvent[] {
  return [
    note('s2', 0, startMs),
    note('s1', 0, startMs + BEAT * 2),
    note('s2', 0, startMs + BEAT * 4),
    note('s1', 3, startMs + BAR),
    note('s1', 1, startMs + BAR + BEAT * 2),
    note('s1', 0, startMs + BAR + BEAT * 4),
  ];
}

/** Rising drive: A C E | A (open Am shape lead). */
function pirateRise(startMs: number): GuitarSongEvent[] {
  return [
    note('s3', 2, startMs),
    note('s2', 1, startMs + BEAT * 2),
    note('s1', 0, startMs + BEAT * 4),
    note('s1', 5, startMs + BAR),
    note('s1', 3, startMs + BAR + BEAT * 2),
    note('s1', 0, startMs + BAR + BEAT * 4),
  ];
}

/**
 * Karayip Korsanları (He’s a Pirate) — Hans Zimmer / Klaus Badelt.
 * Melody-first; sparse Am/C/G landmarks only.
 */
export const KARAYIP_KORSANLARI_EVENTS: GuitarSongEvent[] = [
  ...pirateHook(0),
  ...pirateHook(BAR * 2),
  ...pirateAnswer(BAR * 4),
  ...pirateHook(BAR * 6),
  e('chord:Am', BAR * 8),
  ...pirateRise(BAR * 8 + BEAT),
  e('chord:C', BAR * 10),
  ...pirateAnswer(BAR * 10 + BEAT),
  e('chord:G', BAR * 12),
  ...pirateHook(BAR * 12 + BEAT),
  e('chord:Am', BAR * 14),
  ...pirateHook(BAR * 14 + BEAT),
  // Closing punch — staccato A’s then resolve
  note('s3', 2, BAR * 16),
  note('s3', 2, BAR * 16 + BEAT * 2),
  note('s3', 2, BAR * 16 + BEAT * 4),
  note('s2', 0, BAR * 17),
  note('s3', 2, BAR * 17 + BEAT * 3),
];

/** Two hook statements (recognizable open). */
export const KARAYIP_KORSANLARI_PARTIAL_COUNT = 16;
