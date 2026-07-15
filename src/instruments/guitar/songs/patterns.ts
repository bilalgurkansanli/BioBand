import type { GuitarSongEvent } from './types';

function e(soundId: string, atMs: number): GuitarSongEvent {
  return { soundId, atMs };
}

/** Open-string warm-up: low E → high e. */
export const OPEN_STRINGS_EVENTS: GuitarSongEvent[] = [
  e('s6:f0', 0),
  e('s5:f0', 500),
  e('s4:f0', 1000),
  e('s3:f0', 1500),
  e('s2:f0', 2000),
  e('s1:f0', 2500),
  e('s1:f0', 3000),
  e('s2:f0', 3500),
  e('s3:f0', 4000),
  e('s4:f0', 4500),
  e('s5:f0', 5000),
  e('s6:f0', 5500),
];

/** Classic power-chord style riff on low E (Smoke-like). */
export const POWER_RIFF_EVENTS: GuitarSongEvent[] = [
  e('s6:f3', 0),
  e('s6:f6', 400),
  e('s6:f8', 800),
  e('s6:f3', 1400),
  e('s6:f6', 1800),
  e('s6:f9', 2200),
  e('s6:f8', 2600),
  e('s6:f3', 3200),
  e('s6:f6', 3600),
  e('s6:f8', 4000),
  e('s6:f3', 4600),
  e('s6:f6', 5000),
  e('s6:f9', 5400),
  e('s6:f8', 5800),
];

/** Campfire chords: Em → G → C → D. */
export const CAMPFIRE_CHORDS_EVENTS: GuitarSongEvent[] = [
  e('chord:Em', 0),
  e('chord:Em', 800),
  e('chord:G', 1600),
  e('chord:G', 2400),
  e('chord:C', 3200),
  e('chord:C', 4000),
  e('chord:D', 4800),
  e('chord:D', 5600),
  e('chord:Em', 6400),
  e('chord:G', 7200),
  e('chord:C', 8000),
  e('chord:D', 8800),
];

/** Single-string groove on A (Seven-Nation-ish). */
export const GROOVE_A_EVENTS: GuitarSongEvent[] = [
  e('s5:f7', 0),
  e('s5:f7', 450),
  e('s5:f10', 900),
  e('s5:f7', 1350),
  e('s5:f5', 1800),
  e('s5:f3', 2475),
  e('s5:f2', 2925),
  e('s5:f0', 3600),
  e('s5:f7', 4500),
  e('s5:f7', 4950),
  e('s5:f10', 5400),
  e('s5:f7', 5850),
  e('s5:f5', 6300),
  e('s5:f3', 6975),
  e('s5:f2', 7425),
  e('s5:f0', 8100),
];

/** Am → G → C → Em ballad progression. */
export const BALLAD_CHORDS_EVENTS: GuitarSongEvent[] = [
  e('chord:Am', 0),
  e('chord:Am', 1000),
  e('chord:G', 2000),
  e('chord:G', 3000),
  e('chord:C', 4000),
  e('chord:C', 5000),
  e('chord:Em', 6000),
  e('chord:Em', 7000),
  e('chord:Am', 8000),
  e('chord:G', 9000),
  e('chord:C', 10000),
  e('chord:Em', 11000),
  e('chord:Am', 12000),
];

/** Mixed lead + chord hits. */
export const LEAD_AND_CHORDS_EVENTS: GuitarSongEvent[] = [
  e('chord:E', 0),
  e('s1:f0', 600),
  e('s1:f2', 900),
  e('s1:f4', 1200),
  e('chord:Am', 1800),
  e('s2:f0', 2400),
  e('s2:f2', 2700),
  e('s2:f3', 3000),
  e('chord:D', 3600),
  e('s3:f2', 4200),
  e('s3:f4', 4500),
  e('s3:f6', 4800),
  e('chord:E', 5400),
  e('s4:f2', 6000),
  e('s5:f2', 6300),
  e('s6:f0', 6600),
  e('chord:E', 7200),
  e('chord:Am', 8000),
  e('chord:D', 8800),
  e('chord:E', 9600),
];

/** Fast alternate fretting drill. */
export const FRET_SPRINT_EVENTS: GuitarSongEvent[] = [
  e('s4:f0', 0),
  e('s4:f2', 250),
  e('s4:f3', 500),
  e('s4:f5', 750),
  e('s4:f7', 1000),
  e('s4:f5', 1250),
  e('s4:f3', 1500),
  e('s4:f2', 1750),
  e('s4:f0', 2000),
  e('s3:f0', 2250),
  e('s3:f2', 2500),
  e('s3:f4', 2750),
  e('s3:f5', 3000),
  e('s3:f7', 3250),
  e('s3:f5', 3500),
  e('s3:f4', 3750),
  e('s3:f2', 4000),
  e('s3:f0', 4250),
  e('s2:f0', 4500),
  e('s2:f1', 4750),
  e('s2:f3', 5000),
  e('s2:f5', 5250),
  e('s2:f3', 5500),
  e('s2:f1', 5750),
  e('s2:f0', 6000),
];
