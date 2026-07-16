import { e, note } from './songHelpers';
import type { GuitarSongEvent } from './types';

/** ~86 BPM — 3/4 waltz. */
const BEAT = 700;
const BAR = BEAT * 3;

/** Opening: D E F | G (B / high-e). */
function phraseOpen(startMs: number): GuitarSongEvent[] {
  return [
    note('s2', 3, startMs),
    note('s1', 0, startMs + BEAT),
    note('s1', 1, startMs + BEAT * 2),
    note('s1', 3, startMs + BAR),
  ];
}

/** Repeat open gesture into Em hold. */
function phraseOpenHold(startMs: number): GuitarSongEvent[] {
  return [
    ...phraseOpen(startMs),
    note('s1', 0, startMs + BAR * 2),
    note('s1', 0, startMs + BAR * 2 + BEAT * 2),
  ];
}

/** Am descent: A G F E D. */
function phraseDescent(startMs: number): GuitarSongEvent[] {
  return [
    note('s1', 5, startMs),
    note('s1', 3, startMs + BEAT * 0.5),
    note('s1', 1, startMs + BEAT),
    note('s1', 0, startMs + BEAT * 1.5),
    note('s2', 3, startMs + BEAT * 2),
  ];
}

/** G–A–B walk then F run into Em. */
function phraseTurn(startMs: number): GuitarSongEvent[] {
  return [
    note('s1', 3, startMs),
    note('s1', 5, startMs + BEAT),
    note('s1', 7, startMs + BEAT * 2),
    note('s1', 3, startMs + BAR),
    note('s1', 5, startMs + BAR + BEAT * 0.5),
    note('s1', 3, startMs + BAR + BEAT),
    note('s1', 1, startMs + BAR + BEAT * 1.5),
    note('s1', 0, startMs + BAR + BEAT * 2),
    note('s2', 3, startMs + BAR + BEAT * 2.5),
    note('s1', 0, startMs + BAR * 2),
  ];
}

/** Verse “Fikrimin ince gülü…” — D E F | E | D E F | E. */
function verseTheme(startMs: number): GuitarSongEvent[] {
  return [
    note('s2', 3, startMs),
    note('s1', 0, startMs + BEAT),
    note('s1', 1, startMs + BEAT * 2),
    note('s1', 0, startMs + BAR),
    note('s1', 0, startMs + BAR + BEAT * 2),
    note('s2', 3, startMs + BAR * 2),
    note('s1', 0, startMs + BAR * 2 + BEAT),
    note('s1', 1, startMs + BAR * 2 + BEAT * 2),
    note('s1', 0, startMs + BAR * 3),
  ];
}

/** “Kalbimin şen bülbülü” — Dm F G C colors. */
function verseClose(startMs: number): GuitarSongEvent[] {
  return [
    note('s2', 3, startMs),
    note('s1', 0, startMs + BEAT),
    note('s1', 1, startMs + BEAT * 2),
    note('s1', 1, startMs + BAR),
    note('s1', 1, startMs + BAR + BEAT),
    note('s1', 0, startMs + BAR + BEAT * 2),
    note('s1', 3, startMs + BAR * 2),
    note('s1', 1, startMs + BAR * 2 + BEAT),
    note('s1', 0, startMs + BAR * 2 + BEAT * 2),
    note('s2', 1, startMs + BAR * 3),
  ];
}

/**
 * Fikrimin İnce Gülü — Muallim İsmail Hakkı Bey.
 * Melody-first 3/4 waltz from the TAB.
 */
export const FIKRIMIN_INCE_GULU_EVENTS: GuitarSongEvent[] = [
  ...phraseOpenHold(0),
  ...phraseOpenHold(BAR * 4),
  e('chord:Am', BAR * 8),
  ...phraseDescent(BAR * 8),
  e('chord:G', BAR * 9),
  ...phraseTurn(BAR * 9),
  e('chord:Dm', BAR * 12),
  ...verseTheme(BAR * 12),
  e('chord:F', BAR * 16),
  ...verseClose(BAR * 16),
  e('chord:Am', BAR * 20),
  ...phraseDescent(BAR * 20),
  note('s1', 0, BAR * 22),
];

/** Opening waltz gestures (two open phrases). */
export const FIKRIMIN_INCE_GULU_PARTIAL_COUNT = 12;
