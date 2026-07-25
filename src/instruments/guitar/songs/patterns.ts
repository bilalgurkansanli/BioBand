import type { SongMeter } from '../../piano/songs/types';
import type { GuitarSongEvent } from './types';

function e(
  soundId: string,
  atMs: number,
  durationMs?: number,
): GuitarSongEvent {
  return durationMs === undefined
    ? { soundId, atMs }
    : { soundId, atMs, durationMs };
}

/**
 * Open-string warm-up: low E → high e. Nothing frets a string here, so each one
 * is left ringing over the next rather than damped at the following pluck.
 */
const OPEN_BEAT = 500;
const OPEN_RING = 1400;

export const OPEN_STRINGS_EVENTS: GuitarSongEvent[] = [
  e('s6:f0', 0, OPEN_RING),
  e('s5:f0', OPEN_BEAT, OPEN_RING),
  e('s4:f0', OPEN_BEAT * 2, OPEN_RING),
  e('s3:f0', OPEN_BEAT * 3, OPEN_RING),
  e('s2:f0', OPEN_BEAT * 4, OPEN_RING),
  e('s1:f0', OPEN_BEAT * 5, OPEN_RING),
  e('s1:f0', OPEN_BEAT * 6, OPEN_RING),
  e('s2:f0', OPEN_BEAT * 7, OPEN_RING),
  e('s3:f0', OPEN_BEAT * 8, OPEN_RING),
  e('s4:f0', OPEN_BEAT * 9, OPEN_RING),
  e('s5:f0', OPEN_BEAT * 10, OPEN_RING),
  e('s6:f0', OPEN_BEAT * 11, OPEN_RING * 2),
];

export const OPEN_STRINGS_METER: SongMeter = {
  beatMs: OPEN_BEAT,
  beatsPerBar: 4,
};

/**
 * Classic power-chord style riff on low E (Smoke-like single notes).
 * The riff is the gaps as much as the notes: each one is stopped short so the
 * rests are heard instead of being filled by the previous note ringing on.
 */
const RIFF_BEAT = 400;
const RIFF_STAB = 260;

export const POWER_RIFF_EVENTS: GuitarSongEvent[] = [
  e('s6:f3', 0, RIFF_STAB),
  e('s6:f6', 400, RIFF_STAB),
  e('s6:f8', 800, RIFF_STAB),
  e('s6:f3', 1400, RIFF_STAB),
  e('s6:f6', 1800, RIFF_STAB),
  e('s6:f9', 2200, RIFF_STAB),
  e('s6:f8', 2600, RIFF_STAB),
  e('s6:f3', 3200, RIFF_STAB),
  e('s6:f6', 3600, RIFF_STAB),
  e('s6:f8', 4000, RIFF_STAB),
  e('s6:f3', 4600, RIFF_STAB),
  e('s6:f6', 5000, RIFF_STAB),
  e('s6:f9', 5400, RIFF_STAB),
  e('s6:f8', 5800, RIFF_BEAT * 2),
];

/** BEAT is the eighth; the riff restarts every eight of them. */
export const POWER_RIFF_METER: SongMeter = {
  beatMs: RIFF_BEAT,
  beatsPerBar: 8,
};

/** Rock shapes: E5 / A5 power, then F & Bm barre. */
export const POWER_BARRE_EVENTS: GuitarSongEvent[] = [
  e('chord:E5', 0),
  e('chord:E5', 550),
  e('chord:A5', 1100),
  e('chord:A5', 1650),
  e('chord:E5', 2200),
  e('chord:A5', 2750),
  e('chord:E5', 3300),
  e('chord:A5', 3850),
  e('chord:F', 4600),
  e('chord:F', 5400),
  e('chord:Bm', 6200),
  e('chord:Bm', 7000),
  e('chord:E5', 7800),
  e('chord:A5', 8400),
  e('chord:E5', 9000),
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

/** One strum per beat, two beats per chord. */
export const CAMPFIRE_CHORDS_METER: SongMeter = { beatMs: 800, beatsPerBar: 4 };

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

/** Quarter-note groove; the eighth-note pushes fall between the beats. */
export const GROOVE_A_METER: SongMeter = { beatMs: 450, beatsPerBar: 4 };

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

/** One strum per bar-length beat. */
export const BALLAD_CHORDS_METER: SongMeter = { beatMs: 1000, beatsPerBar: 4 };

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
  // Closing chords, one every two beats. They used to sit 800ms apart, which
  // is not a subdivision of this 600ms beat, so the drill drifted off its own
  // grid exactly where it should feel most settled.
  e('chord:E', 7200),
  e('chord:Am', 8400),
  e('chord:D', 9600),
  e('chord:E', 10800),
];

/** 3/4 — chord on the downbeat, lead notes filling the bar. */
export const LEAD_AND_CHORDS_METER: SongMeter = { beatMs: 600, beatsPerBar: 3 };

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

/** Sixteenth-note drill counted four to the bar. */
export const FRET_SPRINT_METER: SongMeter = { beatMs: 250, beatsPerBar: 4 };
