import type { SongMeter } from '../../piano/songs/types';
import type { ViolinSongEvent } from './types';

// A bowed note lasts exactly as long as the bow travels. Without a written
// stroke length every note comes out the same, so a held phrase ending and a
// walking scale step are indistinguishable — each exercise below states its
// own strokes.

function e(soundId: string, atMs: number, durationMs: number): ViolinSongEvent {
  return { soundId, atMs, durationMs };
}

/** Open strings G → E, then back down. Whole bows on a 500ms pulse. */
const OPEN_BEAT = 500;
/** Full bow, stopped just short of the next so each string speaks alone. */
const OPEN_BOW = 440;

export const OPEN_STRINGS_EVENTS: ViolinSongEvent[] = [
  e('v4:0', 0, OPEN_BOW),
  e('v3:0', OPEN_BEAT, OPEN_BOW),
  e('v2:0', OPEN_BEAT * 2, OPEN_BOW),
  e('v1:0', OPEN_BEAT * 3, OPEN_BOW),
  e('v1:0', OPEN_BEAT * 4, OPEN_BOW),
  e('v2:0', OPEN_BEAT * 5, OPEN_BOW),
  e('v3:0', OPEN_BEAT * 6, OPEN_BOW),
  e('v4:0', OPEN_BEAT * 7, OPEN_BEAT * 3),
];

export const OPEN_STRINGS_METER: SongMeter = {
  beatMs: OPEN_BEAT,
  beatsPerBar: 4,
};

/** G-string scale fragment (positions 0–4): détaché up, held at the top. */
const SCALE_BEAT = 400;
/** Short of the step, so each finger change is heard as a new stroke. */
const SCALE_STROKE = 300;
/** The top note is where the exercise turns — a held half, not another step. */
const SCALE_APEX = SCALE_BEAT * 2;

export const G_SCALE_EVENTS: ViolinSongEvent[] = [
  e('v4:0', 0, SCALE_STROKE),
  e('v4:1', SCALE_BEAT, SCALE_STROKE),
  e('v4:2', SCALE_BEAT * 2, SCALE_STROKE),
  e('v4:3', SCALE_BEAT * 3, SCALE_STROKE),
  e('v4:4', SCALE_BEAT * 4, SCALE_APEX),
  e('v4:3', SCALE_BEAT * 6, SCALE_STROKE),
  e('v4:2', SCALE_BEAT * 7, SCALE_STROKE),
  e('v4:1', SCALE_BEAT * 8, SCALE_STROKE),
  e('v4:0', SCALE_BEAT * 9, SCALE_BEAT * 3),
];

export const G_SCALE_METER: SongMeter = { beatMs: SCALE_BEAT, beatsPerBar: 4 };

/**
 * Twinkle-like motif on G / D / A.
 *
 * The tune is six quarters answered by a half — two bars of 4/4, not thirteen
 * evenly spaced notes. Spacing every onset alike is what flattens the phrase:
 * the landing note has to outlast the ones that lead to it.
 */
const TWINKLE_Q = 450;
const TWINKLE_H = TWINKLE_Q * 2;
/** Quarters are détaché; the two landing notes get their full written value. */
const TWINKLE_STROKE = 400;

export const TWINKLE_MOTIF_EVENTS: ViolinSongEvent[] = [
  e('v4:5', 0, TWINKLE_STROKE),
  e('v4:5', TWINKLE_Q, TWINKLE_STROKE),
  e('v3:0', TWINKLE_Q * 2, TWINKLE_STROKE),
  e('v3:0', TWINKLE_Q * 3, TWINKLE_STROKE),
  e('v2:0', TWINKLE_Q * 4, TWINKLE_STROKE),
  e('v2:0', TWINKLE_Q * 5, TWINKLE_STROKE),
  e('v4:5', TWINKLE_Q * 6, TWINKLE_H),
  e('v4:5', TWINKLE_Q * 8, TWINKLE_STROKE),
  e('v3:0', TWINKLE_Q * 9, TWINKLE_STROKE),
  e('v3:0', TWINKLE_Q * 10, TWINKLE_STROKE),
  e('v2:0', TWINKLE_Q * 11, TWINKLE_STROKE),
  e('v2:0', TWINKLE_Q * 12, TWINKLE_STROKE),
  e('v4:5', TWINKLE_Q * 13, TWINKLE_H * 2),
];

export const TWINKLE_MOTIF_METER: SongMeter = {
  beatMs: TWINKLE_Q,
  beatsPerBar: 4,
};

/** Cross-string arpeggio practice: crisp strokes, held at the turn. */
const CROSS_BEAT = 400;
const CROSS_STROKE = 340;
/** The top string is the turn of the arpeggio — held for a full half. */
const CROSS_APEX = CROSS_BEAT * 2;

export const CROSS_STRING_EVENTS: ViolinSongEvent[] = [
  e('v4:0', 0, CROSS_STROKE),
  e('v4:4', CROSS_BEAT, CROSS_STROKE),
  e('v3:0', CROSS_BEAT * 2, CROSS_STROKE),
  e('v3:5', CROSS_BEAT * 3, CROSS_STROKE),
  e('v2:0', CROSS_BEAT * 4, CROSS_STROKE),
  e('v2:3', CROSS_BEAT * 5, CROSS_STROKE),
  e('v1:0', CROSS_BEAT * 6, CROSS_APEX),
  e('v2:3', CROSS_BEAT * 8, CROSS_STROKE),
  e('v2:0', CROSS_BEAT * 9, CROSS_STROKE),
  e('v3:5', CROSS_BEAT * 10, CROSS_STROKE),
  e('v3:0', CROSS_BEAT * 11, CROSS_STROKE),
  e('v4:4', CROSS_BEAT * 12, CROSS_STROKE),
  e('v4:0', CROSS_BEAT * 13, CROSS_BEAT * 3),
];

export const CROSS_STRING_METER: SongMeter = {
  beatMs: CROSS_BEAT,
  beatsPerBar: 4,
};

/**
 * Mixed warm-up: scale steps, an arpeggio run, then open strings home.
 *
 * Deliberately out of time — the run and the return are twice the speed of the
 * steps around them, so no meter is claimed for it.
 */
const WARMUP_STEP = 360;
const WARMUP_RUN = 180;
const WARMUP_HELD = 540;

export const MIXED_WARMUP_EVENTS: ViolinSongEvent[] = [
  e('v4:0', 0, WARMUP_STEP),
  e('v4:2', 400, WARMUP_STEP),
  e('v4:4', 800, WARMUP_STEP),
  e('v3:0', 1200, WARMUP_STEP),
  e('v3:2', 1600, WARMUP_HELD),
  e('v4:0', 2200, WARMUP_RUN),
  e('v4:4', 2400, WARMUP_RUN),
  e('v3:0', 2600, WARMUP_RUN),
  e('v3:5', 2800, WARMUP_STEP),
  e('v2:0', 3200, WARMUP_STEP),
  e('v2:2', 3600, WARMUP_STEP),
  e('v1:0', 4000, WARMUP_HELD),
  e('v2:0', 4600, WARMUP_RUN),
  e('v3:0', 4800, WARMUP_RUN),
  e('v4:0', 5000, 1600),
];
