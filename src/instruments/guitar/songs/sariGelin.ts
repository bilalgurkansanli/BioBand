import { e, note } from './songHelpers';
import type { GuitarSongEvent } from './types';

/**
 * Sarı Gelin — anonymous folk song. A-minor (hüseyni) approximation,
 * gentle ~65 BPM feel.
 */
const BEAT = 560;
const BAR = BEAT * 4;

/** "Erzurum çarşı pazar…" — the rising opening line. */
function openingLine(startMs: number): GuitarSongEvent[] {
  return [
    note('s3', 2, startMs),
    note('s3', 2, startMs + BEAT * 0.5),
    note('s2', 0, startMs + BEAT),
    note('s2', 1, startMs + BEAT * 2),
    note('s2', 1, startMs + BEAT * 3),
    note('s2', 0, startMs + BAR),
    note('s3', 2, startMs + BAR + BEAT),
    note('s2', 0, startMs + BAR + BEAT * 2),
    note('s2', 1, startMs + BAR + BEAT * 3),
    note('s2', 0, startMs + BAR * 2),
    note('s3', 2, startMs + BAR * 2 + BEAT),
    note('s3', 0, startMs + BAR * 2 + BEAT * 2),
    note('s3', 2, startMs + BAR * 3),
  ];
}

/** "Leylim aman, aman…" — the high answer settling back down. */
function leylimLine(startMs: number): GuitarSongEvent[] {
  return [
    note('s1', 0, startMs),
    note('s1', 0, startMs + BEAT),
    note('s2', 3, startMs + BEAT * 2),
    note('s2', 1, startMs + BEAT * 3),
    note('s2', 3, startMs + BAR),
    note('s2', 1, startMs + BAR + BEAT),
    note('s2', 0, startMs + BAR + BEAT * 2),
    note('s2', 1, startMs + BAR + BEAT * 3),
    note('s2', 0, startMs + BAR * 2),
    note('s3', 2, startMs + BAR * 2 + BEAT),
    note('s3', 0, startMs + BAR * 2 + BEAT * 2),
    note('s3', 2, startMs + BAR * 3),
  ];
}

/** "Sarı gelin…" cadence line. */
function sariGelinCadence(startMs: number): GuitarSongEvent[] {
  return [
    note('s2', 1, startMs),
    note('s2', 1, startMs + BEAT),
    note('s2', 0, startMs + BEAT * 2),
    note('s3', 2, startMs + BEAT * 3),
    note('s2', 0, startMs + BAR),
    note('s3', 2, startMs + BAR + BEAT),
    note('s3', 0, startMs + BAR + BEAT * 2),
    note('s3', 2, startMs + BAR * 2),
  ];
}

export const SARI_GELIN_EVENTS: GuitarSongEvent[] = [
  e('chord:Am', 0),
  ...openingLine(BEAT),
  e('chord:G', BAR * 4),
  ...openingLine(BAR * 4 + BEAT),
  e('chord:Am', BAR * 8),
  ...leylimLine(BAR * 8 + BEAT),
  e('chord:G', BAR * 12),
  ...leylimLine(BAR * 12 + BEAT),
  e('chord:Am', BAR * 16),
  ...sariGelinCadence(BAR * 16 + BEAT),
  e('chord:Am', BAR * 19),
  note('s3', 2, BAR * 19 + BEAT),
];

/** Chord + the opening line. */
export const SARI_GELIN_PARTIAL_COUNT = 10;
