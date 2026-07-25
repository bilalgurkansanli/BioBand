import type { SongMeter } from '../../piano/songs/types';
import { bed, note } from './songHelpers';
import type { GuitarSongEvent } from './types';

/** ~80 BPM — playable tutorial pace. */
const BEAT = 750;
const BAR = BEAT * 4;

/**
 * Iconic lead hook — all pairs on the B string (sheet: 7–8 | 5–7 | 3–5 | 2–3–2),
 * closing on D-string F# (D/F# harmony): F#–G | E–F# | D–E | C#–D–C# | F#.
 */
function zombieHook(startMs: number): GuitarSongEvent[] {
  return [
    note('s2', 7, startMs),
    note('s2', 8, startMs + BEAT * 0.5),
    note('s2', 5, startMs + BEAT),
    note('s2', 7, startMs + BEAT * 1.5),
    note('s2', 3, startMs + BEAT * 2),
    note('s2', 5, startMs + BEAT * 2.5),
    note('s2', 2, startMs + BEAT * 3),
    note('s2', 3, startMs + BEAT * 3.5),
    note('s2', 2, startMs + BAR),
    note('s4', 4, startMs + BAR + BEAT),
  ];
}

/**
 * Verse vocal contour — “Another head hangs lowly…”
 * Em / C / G / D neighborhood on G–B–e.
 */
function zombieVerse(startMs: number): GuitarSongEvent[] {
  return [
    // Em bar
    note('s3', 4, startMs + BEAT),
    note('s1', 0, startMs + BEAT * 2),
    note('s2', 3, startMs + BEAT * 2.5),
    note('s2', 0, startMs + BEAT * 3),
    // C bar
    note('s2', 3, startMs + BAR),
    note('s2', 3, startMs + BAR + BEAT),
    note('s2', 1, startMs + BAR + BEAT * 2),
    note('s2', 0, startMs + BAR + BEAT * 3),
    // G bar
    note('s3', 2, startMs + BAR * 2),
    note('s2', 1, startMs + BAR * 2 + BEAT),
    note('s2', 1, startMs + BAR * 2 + BEAT * 2),
    note('s2', 0, startMs + BAR * 2 + BEAT * 3),
    // D/F# bar
    note('s3', 2, startMs + BAR * 3),
    note('s3', 0, startMs + BAR * 3 + BEAT),
    note('s3', 2, startMs + BAR * 3 + BEAT * 2),
    note('s4', 4, startMs + BAR * 3 + BEAT * 3),
  ];
}

/** Chorus cry — “In your head…” rising then drop. */
function zombieChorus(startMs: number): GuitarSongEvent[] {
  return [
    note('s1', 0, startMs),
    note('s1', 3, startMs + BEAT),
    note('s1', 5, startMs + BEAT * 2),
    note('s1', 7, startMs + BEAT * 3),
    note('s1', 8, startMs + BAR),
    note('s1', 7, startMs + BAR + BEAT),
    note('s1', 5, startMs + BAR + BEAT * 2),
    note('s1', 3, startMs + BAR + BEAT * 3),
    note('s1', 0, startMs + BAR * 2),
    note('s2', 0, startMs + BAR * 2 + BEAT * 2),
    note('s3', 2, startMs + BAR * 3),
    note('s3', 0, startMs + BAR * 3 + BEAT * 2),
  ];
}

/**
 * Zombie — The Cranberries / Dolores O’Riordan.
 * Melody-first; one chord landmarker per phrase.
 */
export const ZOMBIE_EVENTS: GuitarSongEvent[] = [
  ...zombieHook(0),
  ...zombieHook(BAR * 2),
  bed('chord:Em', BAR * 4),
  ...zombieVerse(BAR * 4),
  bed('chord:C', BAR * 8),
  ...zombieVerse(BAR * 8),
  bed('chord:Em', BAR * 12),
  ...zombieChorus(BAR * 12),
  bed('chord:G', BAR * 16),
  ...zombieHook(BAR * 16),
  bed('chord:Dfs', BAR * 18),
  ...zombieHook(BAR * 18),
];

/** 4/4 — BEAT is the quarter. */
export const ZOMBIE_METER: SongMeter = { beatMs: BEAT, beatsPerBar: 4 };

/** Two hook statements. */
export const ZOMBIE_PARTIAL_COUNT = 20;
