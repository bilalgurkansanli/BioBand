import { e, note } from './songHelpers';
import type { GuitarSongEvent } from './types';

/** ~86 BPM — Ayla Dikmen ballad. */
const BEAT = 698;
const BAR = BEAT * 4;

/** Intro pickup into the theme (G / B / e). */
function introLead(startMs: number): GuitarSongEvent[] {
  return [
    note('s3', 2, startMs),
    note('s2', 0, startMs + BEAT * 0.5),
    note('s2', 1, startMs + BEAT),
    note('s2', 3, startMs + BEAT * 1.5),
    note('s1', 0, startMs + BEAT * 2),
    note('s1', 1, startMs + BEAT * 2.5),
    note('s2', 3, startMs + BEAT * 3),
    note('s2', 1, startMs + BEAT * 3.5),
  ];
}

/** “Sevilirken…” Am–Dm–E–Am contour. */
function verseSevilirken(startMs: number): GuitarSongEvent[] {
  return [
    note('s2', 0, startMs),
    note('s2', 1, startMs + BEAT),
    note('s2', 3, startMs + BEAT * 2),
    note('s1', 0, startMs + BEAT * 3),
    note('s2', 3, startMs + BAR),
    note('s1', 1, startMs + BAR + BEAT),
    note('s1', 0, startMs + BAR + BEAT * 2),
    note('s2', 0, startMs + BAR + BEAT * 3),
    note('s1', 0, startMs + BAR * 2),
    note('s2', 0, startMs + BAR * 2 + BEAT),
    note('s3', 1, startMs + BAR * 2 + BEAT * 2),
    note('s3', 2, startMs + BAR * 2 + BEAT * 3),
    note('s2', 0, startMs + BAR * 3),
    note('s2', 1, startMs + BAR * 3 + BEAT * 2),
  ];
}

/** “Anlamazdın…” — B7 / E color then Am. */
function chorusAnlamazdin(startMs: number): GuitarSongEvent[] {
  return [
    note('s1', 2, startMs),
    note('s1', 0, startMs + BEAT),
    note('s2', 0, startMs + BEAT * 2),
    note('s2', 3, startMs + BEAT * 3),
    note('s1', 0, startMs + BAR),
    note('s2', 0, startMs + BAR + BEAT),
    note('s3', 1, startMs + BAR + BEAT * 2),
    note('s2', 0, startMs + BAR + BEAT * 3),
    note('s2', 0, startMs + BAR * 2),
    note('s2', 1, startMs + BAR * 2 + BEAT),
    note('s2', 3, startMs + BAR * 2 + BEAT * 2),
    note('s1', 0, startMs + BAR * 2 + BEAT * 3),
    note('s2', 0, startMs + BAR * 3),
    note('s3', 2, startMs + BAR * 3 + BEAT * 2),
  ];
}

/** Bridge “Dilerim ki…” — Am Dm G C walk. */
function bridgeDilerim(startMs: number): GuitarSongEvent[] {
  return [
    note('s2', 0, startMs),
    note('s2', 1, startMs + BEAT * 2),
    note('s2', 3, startMs + BAR),
    note('s1', 1, startMs + BAR + BEAT * 2),
    note('s1', 3, startMs + BAR * 2),
    note('s1', 0, startMs + BAR * 2 + BEAT * 2),
    note('s2', 1, startMs + BAR * 3),
    note('s1', 0, startMs + BAR * 3 + BEAT * 2),
    note('s1', 1, startMs + BAR * 4),
    note('s2', 3, startMs + BAR * 4 + BEAT * 2),
    note('s1', 0, startMs + BAR * 5),
    note('s2', 0, startMs + BAR * 5 + BEAT * 2),
    note('s3', 1, startMs + BAR * 6),
    note('s3', 2, startMs + BAR * 6 + BEAT * 2),
    note('s2', 0, startMs + BAR * 7),
  ];
}

/**
 * Anlamazdın — Ayla Dikmen.
 * Melody-first; sparse Am/E landmarks.
 */
export const ANLAMAZDIN_EVENTS: GuitarSongEvent[] = [
  ...introLead(0),
  ...introLead(BAR),
  e('chord:Am', BAR * 2),
  ...verseSevilirken(BAR * 2),
  e('chord:B7', BAR * 6),
  ...chorusAnlamazdin(BAR * 6),
  e('chord:Am', BAR * 10),
  ...bridgeDilerim(BAR * 10),
  e('chord:E', BAR * 18),
  ...chorusAnlamazdin(BAR * 18),
  note('s2', 0, BAR * 22),
];

/** Two intro lead statements. */
export const ANLAMAZDIN_PARTIAL_COUNT = 16;
