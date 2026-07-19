import type { ViolinSongEvent } from './types';

function e(soundId: string, atMs: number): ViolinSongEvent {
  return { soundId, atMs };
}

/** Open strings G → E, then back down. */
export const OPEN_STRINGS_EVENTS: ViolinSongEvent[] = [
  e('v4:0', 0),
  e('v3:0', 500),
  e('v2:0', 1000),
  e('v1:0', 1500),
  e('v1:0', 2000),
  e('v2:0', 2500),
  e('v3:0', 3000),
  e('v4:0', 3500),
];

/** G-string scale fragment (positions 0–4). */
export const G_SCALE_EVENTS: ViolinSongEvent[] = [
  e('v4:0', 0),
  e('v4:1', 400),
  e('v4:2', 800),
  e('v4:3', 1200),
  e('v4:4', 1600),
  e('v4:3', 2100),
  e('v4:2', 2500),
  e('v4:1', 2900),
  e('v4:0', 3300),
];

/** Twinkle-like motif on G / D / A. */
export const TWINKLE_MOTIF_EVENTS: ViolinSongEvent[] = [
  e('v4:5', 0),
  e('v4:5', 450),
  e('v3:0', 900),
  e('v3:0', 1350),
  e('v2:0', 1800),
  e('v2:0', 2250),
  e('v4:5', 2700),
  e('v4:5', 3300),
  e('v3:0', 3750),
  e('v3:0', 4200),
  e('v2:0', 4650),
  e('v2:0', 5100),
  e('v4:5', 5550),
];

/** Cross-string arpeggio practice. */
export const CROSS_STRING_EVENTS: ViolinSongEvent[] = [
  e('v4:0', 0),
  e('v4:4', 400),
  e('v3:0', 800),
  e('v3:5', 1200),
  e('v2:0', 1600),
  e('v2:3', 2000),
  e('v1:0', 2400),
  e('v2:3', 2900),
  e('v2:0', 3300),
  e('v3:5', 3700),
  e('v3:0', 4100),
  e('v4:4', 4500),
  e('v4:0', 4900),
];

/** Mixed warm-up: scale steps, an arpeggio run, then open strings home. */
export const MIXED_WARMUP_EVENTS: ViolinSongEvent[] = [
  e('v4:0', 0),
  e('v4:2', 400),
  e('v4:4', 800),
  e('v3:0', 1200),
  e('v3:2', 1600),
  e('v4:0', 2200),
  e('v4:4', 2400),
  e('v3:0', 2600),
  e('v3:5', 2800),
  e('v2:0', 3200),
  e('v2:2', 3600),
  e('v1:0', 4000),
  e('v2:0', 4600),
  e('v3:0', 4800),
  e('v4:0', 5000),
];
