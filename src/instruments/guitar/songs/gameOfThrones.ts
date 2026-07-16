import type { GuitarSongEvent } from './types';

function e(soundId: string, atMs: number): GuitarSongEvent {
  return { soundId, atMs };
}

/**
 * Game of Thrones theme (Musa Çetiner / Cm arrangement).
 * Time feel: 6/4 — `BEAT` = one quarter note.
 * ~92 BPM keeps the motif playable in guided mode.
 */
const BEAT = 652;
const BAR = BEAT * 6;

/** Iconic Cm motif: G–C–Eb–F–G–C (high e / B strings). */
function cmMotif(startMs: number): GuitarSongEvent[] {
  return [
    e('s1:f3', startMs), // G (half)
    e('s2:f1', startMs + BEAT * 2), // C (quarter)
    e('s2:f4', startMs + BEAT * 3), // Eb (8th)
    e('s1:f1', startMs + BEAT * 3.5), // F (8th)
    e('s1:f3', startMs + BEAT * 4), // G (quarter)
    e('s2:f1', startMs + BEAT * 5), // C (quarter)
  ];
}

/** Same rhythm with E♮ (open e) instead of Eb — C-major color bars. */
function cMajorMotif(startMs: number): GuitarSongEvent[] {
  return [
    e('s1:f3', startMs),
    e('s2:f1', startMs + BEAT * 2),
    e('s1:f0', startMs + BEAT * 3), // E
    e('s1:f1', startMs + BEAT * 3.5), // F
    e('s1:f3', startMs + BEAT * 4),
    e('s2:f1', startMs + BEAT * 5),
  ];
}

/**
 * Main theme A (after intro): held tone + answering motif,
 * then Gm / Bb / Fm color answers from the sheet.
 */
function themeA(startMs: number): GuitarSongEvent[] {
  return [
    // Cm — long G, then motif
    e('s1:f3', startMs),
    ...cmMotif(startMs + BAR),

    // Gm — long D, then short answer
    e('s2:f3', startMs + BAR * 2),
    e('s2:f3', startMs + BAR * 3),
    e('s2:f1', startMs + BAR * 3 + BEAT * 2),
    e('s2:f3', startMs + BAR * 3 + BEAT * 3),
    e('s1:f1', startMs + BAR * 3 + BEAT * 4),
    e('s2:f3', startMs + BAR * 3 + BEAT * 5),

    // Bb — long F
    e('s1:f1', startMs + BAR * 4),
    e('s1:f1', startMs + BAR * 5),
    e('s2:f1', startMs + BAR * 5 + BEAT * 2),
    e('s1:f1', startMs + BAR * 5 + BEAT * 3),
    e('s1:f3', startMs + BAR * 5 + BEAT * 4),
    e('s1:f1', startMs + BAR * 5 + BEAT * 5),

    // Fm — long C + descending run (sheet: 4–3–1–1)
    e('s2:f1', startMs + BAR * 6),
    e('s2:f4', startMs + BAR * 7),
    e('s2:f3', startMs + BAR * 7 + BEAT),
    e('s3:f1', startMs + BAR * 7 + BEAT * 2),
    e('s2:f1', startMs + BAR * 7 + BEAT * 3),
    e('s3:f1', startMs + BAR * 7 + BEAT * 4),
    e('s2:f1', startMs + BAR * 7 + BEAT * 5),
  ];
}

export const GAME_OF_THRONES_EVENTS: GuitarSongEvent[] = [
  // Intro — Cm motif twice, then C-major color twice
  ...cmMotif(0),
  ...cmMotif(BAR),
  ...cMajorMotif(BAR * 2),
  ...cMajorMotif(BAR * 3),

  // Theme A
  ...themeA(BAR * 4),

  // Closing Cm sustain (sheet ending gesture)
  e('s2:f1', BAR * 12),
  e('s1:f3', BAR * 12 + BEAT * 3),
  e('s2:f1', BAR * 13),
];

/** Intro only (4 bars of the famous motif). */
export const GAME_OF_THRONES_PARTIAL_COUNT = 24;
