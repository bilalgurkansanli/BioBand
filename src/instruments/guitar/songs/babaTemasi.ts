import type { SongMeter } from '../../piano/songs/types';
import { e, note } from './songHelpers';
import type { GuitarSongEvent } from './types';

/**
 * The Godfather theme (Baba) — Nino Rota. 3/4 waltz, Am.
 * Solo-trumpet melody on the top two strings.
 */
const BEAT = 620;
const BAR = BEAT * 3;

/** Main phrase: E–A–C | B–A–C–A–B–A | F–G–E(hold). */
function godfatherPhrase(startMs: number): GuitarSongEvent[] {
  return [
    note('s1', 0, startMs),
    note('s1', 5, startMs + BEAT),
    note('s1', 8, startMs + BEAT * 2),
    note('s1', 7, startMs + BEAT * 2.5),
    note('s1', 5, startMs + BEAT * 3),
    note('s1', 8, startMs + BEAT * 4),
    note('s1', 5, startMs + BEAT * 4.5),
    note('s1', 7, startMs + BEAT * 5),
    note('s1', 5, startMs + BEAT * 6),
    note('s1', 1, startMs + BEAT * 7),
    note('s1', 3, startMs + BEAT * 8),
    note('s1', 0, startMs + BEAT * 9),
  ];
}

/** Second phrase — same climb, then the settling descent to A. */
function godfatherAnswer(startMs: number): GuitarSongEvent[] {
  return [
    note('s1', 0, startMs),
    note('s1', 5, startMs + BEAT),
    note('s1', 8, startMs + BEAT * 2),
    note('s1', 7, startMs + BEAT * 2.5),
    note('s1', 5, startMs + BEAT * 3),
    note('s1', 8, startMs + BEAT * 4),
    note('s1', 5, startMs + BEAT * 4.5),
    note('s1', 7, startMs + BEAT * 5),
    note('s1', 5, startMs + BEAT * 6),
    note('s1', 3, startMs + BEAT * 7),
    note('s1', 0, startMs + BEAT * 8),
    note('s2', 3, startMs + BEAT * 8.5),
    note('s2', 1, startMs + BEAT * 9),
    note('s2', 0, startMs + BEAT * 10),
    note('s3', 2, startMs + BEAT * 11),
  ];
}

export const BABA_TEMASI_EVENTS: GuitarSongEvent[] = [
  e('chord:Am', 0),
  ...godfatherPhrase(BEAT),
  e('chord:Dm', BAR * 4),
  ...godfatherPhrase(BAR * 4 + BEAT),
  e('chord:E', BAR * 8),
  ...godfatherAnswer(BAR * 8 + BEAT),
  e('chord:Am', BAR * 13),
  note('s3', 2, BAR * 13 + BEAT),
];

/** 3/4 waltz — BEAT is the quarter. */
export const BABA_TEMASI_METER: SongMeter = { beatMs: BEAT, beatsPerBar: 3 };

/** Chord + first full phrase. */
export const BABA_TEMASI_PARTIAL_COUNT = 13;
