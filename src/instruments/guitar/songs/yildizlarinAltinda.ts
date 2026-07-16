import { e, note } from './songHelpers';
import type { GuitarSongEvent } from './types';

/** ~84 BPM — classic Turkish ballad. */
const BEAT = 714;
const BAR = BEAT * 4;

/**
 * “Benim gönlüm sarhoştur…” — Am phrase (G / B / e).
 * Contour: A B C D | E D C B | A …
 */
function verseA(startMs: number): GuitarSongEvent[] {
  return [
    note('s3', 2, startMs + BEAT),
    note('s2', 0, startMs + BEAT * 1.5),
    note('s2', 1, startMs + BEAT * 2),
    note('s2', 3, startMs + BEAT * 2.5),
    note('s1', 0, startMs + BEAT * 3),
    note('s2', 3, startMs + BAR),
    note('s2', 1, startMs + BAR + BEAT * 0.5),
    note('s2', 0, startMs + BAR + BEAT),
    note('s3', 2, startMs + BAR + BEAT * 1.5),
    // “yıldızların altında”
    note('s2', 3, startMs + BAR * 2),
    note('s2', 1, startMs + BAR * 2 + BEAT * 0.5),
    note('s2', 0, startMs + BAR * 2 + BEAT),
    note('s3', 2, startMs + BAR * 2 + BEAT * 1.5),
    note('s3', 0, startMs + BAR * 2 + BEAT * 2),
    note('s3', 2, startMs + BAR * 3),
    note('s2', 0, startMs + BAR * 3 + BEAT),
  ];
}

/**
 * “Sevişmek ah ne hoştur…” — Dm → Am → E → Am color.
 */
function verseB(startMs: number): GuitarSongEvent[] {
  return [
    note('s2', 3, startMs + BEAT),
    note('s1', 1, startMs + BEAT * 2),
    note('s1', 0, startMs + BEAT * 3),
    note('s2', 0, startMs + BAR),
    note('s2', 1, startMs + BAR + BEAT),
    note('s2', 0, startMs + BAR + BEAT * 2),
    // E color — “yıldızların altında”
    note('s1', 0, startMs + BAR * 2),
    note('s2', 0, startMs + BAR * 2 + BEAT),
    note('s2', 1, startMs + BAR * 2 + BEAT * 2),
    note('s3', 1, startMs + BAR * 2 + BEAT * 3),
    note('s3', 2, startMs + BAR * 3),
    note('s2', 0, startMs + BAR * 3 + BEAT * 2),
  ];
}

/**
 * “Yanmam gönlüm yansa da…” — higher Am answer.
 */
function bridge(startMs: number): GuitarSongEvent[] {
  return [
    note('s1', 0, startMs + BEAT),
    note('s1', 1, startMs + BEAT * 2),
    note('s1', 3, startMs + BEAT * 3),
    note('s1', 5, startMs + BAR),
    note('s1', 3, startMs + BAR + BEAT),
    note('s1', 1, startMs + BAR + BEAT * 2),
    note('s1', 0, startMs + BAR + BEAT * 3),
    note('s2', 3, startMs + BAR * 2),
    note('s2', 1, startMs + BAR * 2 + BEAT),
    note('s2', 0, startMs + BAR * 2 + BEAT * 2),
    note('s3', 2, startMs + BAR * 3),
    note('s2', 0, startMs + BAR * 3 + BEAT * 2),
  ];
}

/**
 * Yıldızların Altında — Kaptanzâde Ali Rıza Bey.
 * Melody-first Am ballad; sparse Am/E landmarks.
 */
export const YILDIZLARIN_ALTINDA_EVENTS: GuitarSongEvent[] = [
  e('chord:Am', 0),
  ...verseA(0),
  e('chord:Dm', BAR * 4),
  ...verseB(BAR * 4),
  e('chord:Am', BAR * 8),
  ...bridge(BAR * 8),
  e('chord:E', BAR * 12),
  ...verseB(BAR * 12),
  e('chord:Am', BAR * 16),
  ...verseA(BAR * 16),
];

/** First verse A (with opening Am). */
export const YILDIZLARIN_ALTINDA_PARTIAL_COUNT = 17;
