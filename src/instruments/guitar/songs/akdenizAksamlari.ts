import type { SongMeter } from '../../piano/songs/types';
import { bed, note } from './songHelpers';
import type { GuitarSongEvent } from './types';

/** ~96 BPM — mid-tempo classic. */
const BEAT = 625;
const BAR = BEAT * 4;

/** Opening B-string hook from the sheet. */
function openingHook(startMs: number): GuitarSongEvent[] {
  return [
    note('s2', 0, startMs),
    note('s2', 1, startMs + BEAT * 0.5),
    note('s2', 3, startMs + BEAT),
    note('s2', 0, startMs + BEAT * 1.5),
    note('s2', 1, startMs + BEAT * 2),
    note('s2', 0, startMs + BEAT * 2.5),
    note('s3', 2, startMs + BEAT * 3),
    note('s2', 0, startMs + BEAT * 3.5),
  ];
}

/**
 * Andalusian melodic outline Am → G → F → E
 * (descending A–G–F–E on B / high-e).
 */
function andalusianLine(startMs: number): GuitarSongEvent[] {
  return [
    // Am
    note('s2', 0, startMs),
    note('s2', 1, startMs + BEAT),
    note('s2', 3, startMs + BEAT * 2),
    note('s1', 0, startMs + BEAT * 3),
    // G
    note('s1', 3, startMs + BAR),
    note('s1', 1, startMs + BAR + BEAT),
    note('s1', 0, startMs + BAR + BEAT * 2),
    note('s2', 3, startMs + BAR + BEAT * 3),
    // F
    note('s1', 1, startMs + BAR * 2),
    note('s1', 0, startMs + BAR * 2 + BEAT),
    note('s2', 3, startMs + BAR * 2 + BEAT * 2),
    note('s2', 1, startMs + BAR * 2 + BEAT * 3),
    // E
    note('s1', 0, startMs + BAR * 3),
    note('s2', 0, startMs + BAR * 3 + BEAT),
    note('s3', 1, startMs + BAR * 3 + BEAT * 2),
    note('s3', 2, startMs + BAR * 3 + BEAT * 3),
  ];
}

/** Verse bounce Am–G–Am–G then F–E. */
function verseBounce(startMs: number): GuitarSongEvent[] {
  return [
    note('s2', 0, startMs),
    note('s2', 1, startMs + BEAT),
    note('s2', 0, startMs + BEAT * 2),
    note('s3', 2, startMs + BEAT * 3),
    note('s1', 3, startMs + BAR),
    note('s1', 0, startMs + BAR + BEAT),
    note('s2', 3, startMs + BAR + BEAT * 2),
    note('s2', 0, startMs + BAR + BEAT * 3),
    note('s2', 0, startMs + BAR * 2),
    note('s2', 1, startMs + BAR * 2 + BEAT),
    note('s2', 3, startMs + BAR * 2 + BEAT * 2),
    note('s2', 0, startMs + BAR * 2 + BEAT * 3),
    note('s1', 3, startMs + BAR * 3),
    note('s1', 1, startMs + BAR * 3 + BEAT),
    note('s1', 0, startMs + BAR * 3 + BEAT * 2),
    note('s2', 0, startMs + BAR * 3 + BEAT * 3),
    note('s1', 1, startMs + BAR * 4),
    note('s1', 0, startMs + BAR * 4 + BEAT * 2),
    note('s2', 3, startMs + BAR * 5),
    note('s2', 1, startMs + BAR * 5 + BEAT * 2),
    note('s1', 0, startMs + BAR * 6),
    note('s2', 0, startMs + BAR * 6 + BEAT * 2),
    note('s3', 1, startMs + BAR * 7),
    note('s3', 2, startMs + BAR * 7 + BEAT * 2),
  ];
}

/**
 * Akdeniz Akşamları — Grup Merdiven.
 * Melody-first Andalusian feel; sparse Am/E landmarks.
 */
export const AKDENIZ_AKSAMLARI_EVENTS: GuitarSongEvent[] = [
  ...openingHook(0),
  ...openingHook(BAR),
  bed('chord:Am', BAR * 2),
  ...verseBounce(BAR * 2),
  bed('chord:Am', BAR * 10),
  ...andalusianLine(BAR * 10),
  bed('chord:Am', BAR * 14),
  ...andalusianLine(BAR * 14),
  bed('chord:E', BAR * 18),
  ...openingHook(BAR * 18),
  note('s2', 0, BAR * 19),
];

/** 4/4 — BEAT is the quarter. */
export const AKDENIZ_AKSAMLARI_METER: SongMeter = {
  beatMs: BEAT,
  beatsPerBar: 4,
};

/** Two opening hooks. */
export const AKDENIZ_AKSAMLARI_PARTIAL_COUNT = 16;
