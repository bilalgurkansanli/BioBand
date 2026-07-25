import type { SongMeter } from '../../piano/songs/types';
import { bed, note } from './songHelpers';
import type { GuitarSongEvent } from './types';

/**
 * ~86 dotted-quarter pulses/min — 6/8 felt in two.
 * PULSE = dotted quarter; BEAT = eighth.
 */
const BEAT = 233;
const PULSE = BEAT * 3;
const BAR = PULSE * 2;

/** Intro tease — Gm / Dm neighborhood from the TAB. */
function introTease(startMs: number): GuitarSongEvent[] {
  return [
    note('s2', 3, startMs),
    note('s1', 1, startMs + BEAT * 1.5),
    note('s1', 3, startMs + PULSE),
    note('s1', 5, startMs + PULSE + BEAT * 1.5),
    note('s1', 3, startMs + BAR),
    note('s2', 3, startMs + BAR + BEAT * 1.5),
  ];
}

/**
 * Verse vocal — “Ah ne zormuş bitsin demek…”
 * Dm / A color on frets 0–5.
 */
function verseAh(startMs: number): GuitarSongEvent[] {
  return [
    note('s2', 3, startMs + BEAT),
    note('s1', 1, startMs + BEAT * 2),
    note('s1', 0, startMs + BEAT * 3),
    note('s2', 0, startMs + PULSE * 2),
    note('s2', 2, startMs + PULSE * 2 + BEAT),
    note('s2', 3, startMs + PULSE * 3),
    // Answer phrase lives in bars 3–4 (BAR = 2 pulses, so base is BAR * 2).
    note('s2', 3, startMs + BAR * 2),
    note('s1', 1, startMs + BAR * 2 + BEAT),
    note('s1', 0, startMs + BAR * 2 + BEAT * 2),
    note('s2', 0, startMs + BAR * 2 + PULSE),
    note('s2', 2, startMs + BAR * 2 + PULSE + BEAT),
    note('s1', 0, startMs + BAR * 2 + PULSE * 2),
  ];
}

/**
 * “Dudaklarını öpmemek…” — Gm then Dm.
 */
function verseDudak(startMs: number): GuitarSongEvent[] {
  return [
    note('s1', 3, startMs),
    note('s1', 5, startMs + BEAT * 2),
    note('s1', 6, startMs + PULSE),
    note('s1', 5, startMs + PULSE + BEAT * 2),
    note('s1', 3, startMs + BAR),
    note('s1', 1, startMs + BAR + BEAT * 2),
    note('s1', 0, startMs + BAR + PULSE),
    note('s2', 3, startMs + BAR + PULSE + BEAT * 2),
  ];
}

/**
 * Chorus kanca — “Değmesin ellerimiz…” (high e frets 5–8).
 */
function chorusDegmesin(startMs: number): GuitarSongEvent[] {
  return [
    note('s1', 8, startMs),
    note('s1', 6, startMs + BEAT),
    note('s1', 6, startMs + BEAT * 2),
    note('s1', 6, startMs + BEAT * 3),
    note('s1', 6, startMs + PULSE * 2),
    note('s1', 6, startMs + PULSE * 2 + BEAT),
    note('s1', 6, startMs + PULSE * 2 + BEAT * 2),
    // Second statement in bars 3–4 (BAR = 2 pulses, so base is BAR * 2).
    note('s1', 8, startMs + BAR * 2),
    note('s1', 6, startMs + BAR * 2 + BEAT),
    note('s1', 6, startMs + BAR * 2 + BEAT * 2),
    note('s1', 5, startMs + BAR * 2 + PULSE),
    note('s1', 6, startMs + BAR * 2 + PULSE + BEAT),
    note('s1', 5, startMs + BAR * 3),
    note('s1', 5, startMs + BAR * 3 + PULSE),
  ];
}

/** Bridge Dm–F–C–Gm outline (melody). */
function bridgeLoop(startMs: number): GuitarSongEvent[] {
  return [
    note('s1', 5, startMs),
    note('s1', 5, startMs + BEAT * 2),
    note('s1', 3, startMs + PULSE),
    note('s2', 6, startMs + PULSE + BEAT * 2),
    note('s1', 5, startMs + BAR),
    note('s1', 5, startMs + BAR + BEAT),
    note('s1', 5, startMs + BAR + BEAT * 2),
    note('s1', 3, startMs + BAR + PULSE),
    note('s1', 5, startMs + BAR + PULSE + BEAT * 2),
    note('s2', 3, startMs + BAR * 2),
    note('s2', 3, startMs + BAR * 2 + BEAT * 2),
    note('s2', 3, startMs + BAR * 2 + PULSE),
    note('s1', 6, startMs + BAR * 3),
    note('s1', 6, startMs + BAR * 3 + BEAT * 2),
    note('s1', 5, startMs + BAR * 3 + PULSE),
    note('s1', 3, startMs + BAR * 3 + PULSE + BEAT * 2),
  ];
}

/**
 * Değmesin Ellerimiz — Model.
 * Melody-first 6/8; sparse Dm/Gm/A landmarks.
 */
export const DEGMESIN_ELLERIMIZ_EVENTS: GuitarSongEvent[] = [
  ...introTease(0),
  ...introTease(BAR * 2),
  bed('chord:Dm', BAR * 4),
  ...verseAh(BAR * 4),
  bed('chord:Gm', BAR * 8),
  ...verseDudak(BAR * 8),
  bed('chord:A', BAR * 12),
  ...verseAh(BAR * 12),
  bed('chord:Gm', BAR * 16),
  ...chorusDegmesin(BAR * 16),
  bed('chord:Dm', BAR * 20),
  ...bridgeLoop(BAR * 20),
  bed('chord:C', BAR * 24),
  note('s2', 3, BAR * 24 + BEAT),
  note('s2', 1, BAR * 24 + BEAT * 2),
  note('s2', 0, BAR * 24 + BEAT * 3),
  note('s3', 3, BAR * 25),
  note('s2', 1, BAR * 26),
  bed('chord:Dm', BAR * 27),
  note('s2', 3, BAR * 27),
  note('s2', 1, BAR * 27 + BEAT * 2),
  note('s2', 0, BAR * 28),
];

/** 6/8 — BEAT is the eighth, so the bar carries six. */
export const DEGMESIN_ELLERIMIZ_METER: SongMeter = {
  beatMs: BEAT,
  beatsPerBar: 6,
};

/** Two intro teases. */
export const DEGMESIN_ELLERIMIZ_PARTIAL_COUNT = 12;
