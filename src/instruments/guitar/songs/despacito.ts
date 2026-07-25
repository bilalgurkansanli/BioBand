import type { SongMeter } from '../../piano/songs/types';
import { bed, note } from './songHelpers';
import type { GuitarSongEvent } from './types';

/** ~89 BPM — Despacito. */
const BEAT = 674;
const BAR = BEAT * 4;

/** Intro lead in Bm territory (A / D / G / B). */
function despacitoHook(startMs: number): GuitarSongEvent[] {
  return [
    note('s5', 2, startMs),
    note('s4', 4, startMs + BEAT),
    note('s3', 4, startMs + BEAT * 1.5),
    note('s2', 3, startMs + BEAT * 2),
    note('s2', 0, startMs + BEAT * 2.5),
    note('s2', 3, startMs + BEAT * 3),
    note('s3', 2, startMs + BEAT * 3.5),
  ];
}

/**
 * Verse / chorus vocal-ish contour over Bm–G–D–A colors.
 * Stays on frets 0–7 for tutorial play.
 */
function despacitoVerse(startMs: number): GuitarSongEvent[] {
  return [
    // Bm
    note('s2', 3, startMs + BEAT),
    note('s2', 0, startMs + BEAT * 2),
    note('s3', 4, startMs + BEAT * 3),
    note('s2', 3, startMs + BAR),
    note('s2', 0, startMs + BAR + BEAT),
    note('s3', 2, startMs + BAR + BEAT * 2),
    // G
    note('s1', 3, startMs + BAR * 2 + BEAT),
    note('s1', 0, startMs + BAR * 2 + BEAT * 2),
    note('s2', 3, startMs + BAR * 2 + BEAT * 3),
    note('s1', 3, startMs + BAR * 3),
    note('s1', 0, startMs + BAR * 3 + BEAT * 2),
    // D
    note('s1', 2, startMs + BAR * 4 + BEAT),
    note('s1', 0, startMs + BAR * 4 + BEAT * 2),
    note('s2', 3, startMs + BAR * 4 + BEAT * 3),
    note('s1', 2, startMs + BAR * 5),
    note('s2', 3, startMs + BAR * 5 + BEAT * 2),
    // A
    note('s1', 0, startMs + BAR * 6 + BEAT),
    note('s2', 2, startMs + BAR * 6 + BEAT * 2),
    note('s2', 0, startMs + BAR * 6 + BEAT * 3),
    note('s1', 0, startMs + BAR * 7),
    note('s2', 2, startMs + BAR * 7 + BEAT * 2),
  ];
}

/** Short pre-chorus climb. */
function despacitoClimb(startMs: number): GuitarSongEvent[] {
  return [
    note('s2', 0, startMs),
    note('s2', 2, startMs + BEAT),
    note('s2', 3, startMs + BEAT * 2),
    note('s1', 0, startMs + BEAT * 3),
    note('s1', 2, startMs + BAR),
    note('s1', 3, startMs + BAR + BEAT),
    note('s1', 5, startMs + BAR + BEAT * 2),
    note('s1', 3, startMs + BAR + BEAT * 3),
  ];
}

/**
 * Despacito — Luis Fonsi / Daddy Yankee.
 * Melody-first; sparse Bm/G/D/A landmarks.
 */
export const DESPACITO_EVENTS: GuitarSongEvent[] = [
  ...despacitoHook(0),
  ...despacitoHook(BAR * 2),
  bed('chord:Bm', BAR * 4),
  ...despacitoVerse(BAR * 4),
  bed('chord:G', BAR * 12),
  ...despacitoClimb(BAR * 12),
  bed('chord:D', BAR * 14),
  ...despacitoHook(BAR * 14),
  bed('chord:A', BAR * 16),
  ...despacitoVerse(BAR * 16),
  note('s5', 2, BAR * 24),
];

/** 4/4 — BEAT is the quarter. */
export const DESPACITO_METER: SongMeter = { beatMs: BEAT, beatsPerBar: 4 };

/** Two intro hooks. */
export const DESPACITO_PARTIAL_COUNT = 14;
