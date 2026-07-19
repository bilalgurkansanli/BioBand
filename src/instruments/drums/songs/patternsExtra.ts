import type { DrumSongEvent } from './types';
import type { DrumSoundId } from '../drumsSounds';

/**
 * Second batch of tutorial charts — iconic, instantly recognizable grooves.
 * Same conventions as patterns.ts: 12-bar arcs, real chart tempos, events
 * sorted by time, closing crash on the final downbeat.
 */

function hit(padId: DrumSoundId, atMs: number): DrumSongEvent {
  return { padId, atMs };
}

function sortEvents(events: DrumSongEvent[]): DrumSongEvent[] {
  return events.sort((a, b) => a.atMs - b.atMs || a.padId.localeCompare(b.padId));
}

type EighthOpts = {
  crashOnOne?: boolean;
  /** 8th indices (0-7) played as open hat instead of closed. */
  openEighths?: number[];
};

/** Straight 8th hats for one bar; optional crash on 1 / open-hat colors. */
function eighthHats(
  events: DrumSongEvent[],
  barStart: number,
  q: number,
  opts?: EighthOpts,
): void {
  const open = new Set(opts?.openEighths ?? []);
  for (let i = 0; i < 8; i++) {
    const t = barStart + i * (q / 2);
    if (opts?.crashOnOne && i === 0) {
      events.push(hit('crash', t));
    } else if (open.has(i)) {
      events.push(hit('hihatOpen', t));
    } else {
      events.push(hit('hihatClosed', t));
    }
  }
}

/** Snare on 2 and 4. */
function backbeat(events: DrumSongEvent[], barStart: number, q: number): void {
  events.push(hit('snare', barStart + q));
  events.push(hit('snare', barStart + q * 3));
}

/** Closing crash + kick on the downbeat after the last bar. */
function closeOut(events: DrumSongEvent[], atMs: number): void {
  events.push(hit('crash', atMs));
  events.push(hit('kick', atMs));
}

/**
 * In the Air Tonight (Phil Collins) — ♩ = 95.
 * Sparse intro pulse, THE tom fill, then the full groove.
 */
const AIR_Q = 60000 / 95;

function airIntroBar(events: DrumSongEvent[], barStart: number): void {
  eighthHats(events, barStart, AIR_Q);
  events.push(hit('kick', barStart));
}

/** The legendary fill: 16th toms from the & of 2, high → low. */
function airFillBar(events: DrumSongEvent[], barStart: number): void {
  const s = AIR_Q / 4;
  events.push(hit('kick', barStart));
  events.push(hit('tomHi', barStart + AIR_Q * 1.5));
  events.push(hit('tomHi', barStart + AIR_Q * 1.5 + s));
  events.push(hit('tomMid', barStart + AIR_Q * 2));
  events.push(hit('tomMid', barStart + AIR_Q * 2 + s));
  events.push(hit('tomMid', barStart + AIR_Q * 2.5));
  events.push(hit('tomLow', barStart + AIR_Q * 3));
  events.push(hit('tomLow', barStart + AIR_Q * 3 + s));
  events.push(hit('tomLow', barStart + AIR_Q * 3.5));
  events.push(hit('tomLow', barStart + AIR_Q * 3.5 + s));
}

function airGrooveBar(
  events: DrumSongEvent[],
  barStart: number,
  opts?: EighthOpts,
): void {
  eighthHats(events, barStart, AIR_Q, opts);
  events.push(hit('kick', barStart));
  events.push(hit('kick', barStart + AIR_Q * 2));
  backbeat(events, barStart, AIR_Q);
}

export const IN_THE_AIR_TONIGHT_EVENTS: DrumSongEvent[] = (() => {
  const events: DrumSongEvent[] = [];
  const bar = (n: number) => n * AIR_Q * 4;

  airIntroBar(events, bar(0));
  airIntroBar(events, bar(1));
  airFillBar(events, bar(2));

  airGrooveBar(events, bar(3), { crashOnOne: true });
  airGrooveBar(events, bar(4));
  airGrooveBar(events, bar(5));
  airGrooveBar(events, bar(6));
  airGrooveBar(events, bar(7), { crashOnOne: true });
  airGrooveBar(events, bar(8));
  airGrooveBar(events, bar(9));
  airGrooveBar(events, bar(10));

  airFillBar(events, bar(11));
  closeOut(events, bar(12));
  return sortEvents(events);
})();

/**
 * Back in Black (AC/DC) — ♩ = 94. Phil Rudd's rock pocket:
 * hats 8ths, snare 2+4, kick on 1 and 3 (driving bars add the & of 3).
 */
const BIB_Q = 60000 / 94;

function bibGrooveBar(
  events: DrumSongEvent[],
  barStart: number,
  opts?: EighthOpts & { drive?: boolean },
): void {
  eighthHats(events, barStart, BIB_Q, opts);
  events.push(hit('kick', barStart));
  events.push(hit('kick', barStart + BIB_Q * 2));
  if (opts?.drive) {
    events.push(hit('kick', barStart + BIB_Q * 2.5));
  }
  backbeat(events, barStart, BIB_Q);
}

function bibFillBar(events: DrumSongEvent[], barStart: number): void {
  events.push(hit('kick', barStart));
  events.push(hit('snare', barStart + BIB_Q));
  events.push(hit('snare', barStart + BIB_Q * 2));
  events.push(hit('snare', barStart + BIB_Q * 2.5));
  events.push(hit('tomHi', barStart + BIB_Q * 3));
  events.push(hit('tomMid', barStart + BIB_Q * 3.5));
}

export const BACK_IN_BLACK_EVENTS: DrumSongEvent[] = (() => {
  const events: DrumSongEvent[] = [];
  const bar = (n: number) => n * BIB_Q * 4;

  bibGrooveBar(events, bar(0));
  bibGrooveBar(events, bar(1));
  bibGrooveBar(events, bar(2));
  bibGrooveBar(events, bar(3));

  bibGrooveBar(events, bar(4), { drive: true });
  bibGrooveBar(events, bar(5), { drive: true });
  bibGrooveBar(events, bar(6), { drive: true });
  bibGrooveBar(events, bar(7), { drive: true });

  bibGrooveBar(events, bar(8), { crashOnOne: true, drive: true });
  bibGrooveBar(events, bar(9), { crashOnOne: true, drive: true });
  bibGrooveBar(events, bar(10), { drive: true });

  bibFillBar(events, bar(11));
  closeOut(events, bar(12));
  return sortEvents(events);
})();

/**
 * Another One Bites the Dust (Queen) — ♩ = 110.
 * Intro = the bass riff on the kick; groove keeps the pushed & of 1.
 */
const AOBTD_Q = 60000 / 110;

/** Bass riff rhythm on the kick drum: 1, &1, 2 … 3, &3, 4. */
function aobtdRiffBar(events: DrumSongEvent[], barStart: number): void {
  events.push(hit('kick', barStart));
  events.push(hit('kick', barStart + AOBTD_Q * 0.5));
  events.push(hit('kick', barStart + AOBTD_Q));
  events.push(hit('kick', barStart + AOBTD_Q * 2));
  events.push(hit('kick', barStart + AOBTD_Q * 2.5));
  events.push(hit('kick', barStart + AOBTD_Q * 3));
}

function aobtdGrooveBar(
  events: DrumSongEvent[],
  barStart: number,
  opts?: EighthOpts,
): void {
  eighthHats(events, barStart, AOBTD_Q, opts);
  events.push(hit('kick', barStart));
  events.push(hit('kick', barStart + AOBTD_Q * 0.5));
  events.push(hit('kick', barStart + AOBTD_Q * 2));
  backbeat(events, barStart, AOBTD_Q);
}

export const ANOTHER_ONE_BITES_THE_DUST_EVENTS: DrumSongEvent[] = (() => {
  const events: DrumSongEvent[] = [];
  const bar = (n: number) => n * AOBTD_Q * 4;

  aobtdRiffBar(events, bar(0));
  aobtdRiffBar(events, bar(1));

  aobtdGrooveBar(events, bar(2));
  aobtdGrooveBar(events, bar(3));
  aobtdGrooveBar(events, bar(4));
  aobtdGrooveBar(events, bar(5));
  aobtdGrooveBar(events, bar(6), { crashOnOne: true });
  aobtdGrooveBar(events, bar(7));
  aobtdGrooveBar(events, bar(8), { crashOnOne: true });
  aobtdGrooveBar(events, bar(9));
  aobtdGrooveBar(events, bar(10));

  aobtdRiffBar(events, bar(11));
  closeOut(events, bar(12));
  return sortEvents(events);
})();

/**
 * When the Levee Breaks (Led Zeppelin) — ♩ = 71.
 * Bonham's swagger: boom-BAP, boom-boom-BAP under heavy 8th hats.
 */
const LEVEE_Q = 60000 / 71;

function leveeGrooveBar(
  events: DrumSongEvent[],
  barStart: number,
  opts?: EighthOpts,
): void {
  eighthHats(events, barStart, LEVEE_Q, opts);
  events.push(hit('kick', barStart));
  events.push(hit('kick', barStart + LEVEE_Q * 2));
  events.push(hit('kick', barStart + LEVEE_Q * 2.5));
  backbeat(events, barStart, LEVEE_Q);
}

function leveeFillBar(events: DrumSongEvent[], barStart: number): void {
  events.push(hit('kick', barStart));
  events.push(hit('snare', barStart + LEVEE_Q));
  events.push(hit('tomLow', barStart + LEVEE_Q * 2));
  events.push(hit('tomLow', barStart + LEVEE_Q * 2.5));
  events.push(hit('snare', barStart + LEVEE_Q * 3));
  events.push(hit('tomLow', barStart + LEVEE_Q * 3.5));
}

export const WHEN_THE_LEVEE_BREAKS_EVENTS: DrumSongEvent[] = (() => {
  const events: DrumSongEvent[] = [];
  const bar = (n: number) => n * LEVEE_Q * 4;

  leveeGrooveBar(events, bar(0));
  leveeGrooveBar(events, bar(1));
  leveeGrooveBar(events, bar(2));
  leveeGrooveBar(events, bar(3));
  leveeGrooveBar(events, bar(4), { openEighths: [7] });
  leveeGrooveBar(events, bar(5));
  leveeGrooveBar(events, bar(6));
  leveeGrooveBar(events, bar(7), { openEighths: [7] });
  leveeGrooveBar(events, bar(8), { crashOnOne: true });
  leveeGrooveBar(events, bar(9));
  leveeGrooveBar(events, bar(10));

  leveeFillBar(events, bar(11));
  closeOut(events, bar(12));
  return sortEvents(events);
})();

/**
 * Superstition (Stevie Wonder) — ♩ = 101.
 * Funk pocket: pushed kick (1, &1, 3), snare 2+4 with the & of 4 push.
 */
const SUPER_Q = 60000 / 101;

function superGrooveBar(
  events: DrumSongEvent[],
  barStart: number,
  opts?: EighthOpts & { push?: boolean },
): void {
  eighthHats(events, barStart, SUPER_Q, opts);
  events.push(hit('kick', barStart));
  events.push(hit('kick', barStart + SUPER_Q * 0.5));
  events.push(hit('kick', barStart + SUPER_Q * 2));
  backbeat(events, barStart, SUPER_Q);
  if (opts?.push) {
    events.push(hit('snare', barStart + SUPER_Q * 3.5));
  }
}

function superFillBar(events: DrumSongEvent[], barStart: number): void {
  const s = SUPER_Q / 4;
  events.push(hit('kick', barStart));
  events.push(hit('snare', barStart + SUPER_Q));
  events.push(hit('snare', barStart + SUPER_Q * 2));
  events.push(hit('snare', barStart + SUPER_Q * 2 + s));
  events.push(hit('tomHi', barStart + SUPER_Q * 2.5));
  events.push(hit('tomMid', barStart + SUPER_Q * 3));
  events.push(hit('tomLow', barStart + SUPER_Q * 3.5));
}

export const SUPERSTITION_EVENTS: DrumSongEvent[] = (() => {
  const events: DrumSongEvent[] = [];
  const bar = (n: number) => n * SUPER_Q * 4;

  superGrooveBar(events, bar(0));
  superGrooveBar(events, bar(1), { push: true });
  superGrooveBar(events, bar(2));
  superGrooveBar(events, bar(3), { push: true });
  superGrooveBar(events, bar(4));
  superGrooveBar(events, bar(5), { push: true });
  superGrooveBar(events, bar(6), { crashOnOne: true });
  superGrooveBar(events, bar(7), { push: true });
  superGrooveBar(events, bar(8), { crashOnOne: true });
  superGrooveBar(events, bar(9), { push: true });
  superGrooveBar(events, bar(10));

  superFillBar(events, bar(11));
  closeOut(events, bar(12));
  return sortEvents(events);
})();

/**
 * Wipe Out (The Surfaris) — ♩ = 158.
 * THE drum solo song: snare roll-in, surf drive, descending tom solos.
 */
const WIPE_Q = 60000 / 158;

/** Opening snare roll (8ths at this tempo are already quick). */
function wipeRollBar(events: DrumSongEvent[], barStart: number): void {
  for (let i = 0; i < 8; i++) {
    events.push(hit('snare', barStart + i * (WIPE_Q / 2)));
  }
  events.push(hit('kick', barStart));
  events.push(hit('kick', barStart + WIPE_Q * 2));
}

function wipeGrooveBar(
  events: DrumSongEvent[],
  barStart: number,
  opts?: EighthOpts,
): void {
  eighthHats(events, barStart, WIPE_Q, opts);
  events.push(hit('kick', barStart));
  events.push(hit('kick', barStart + WIPE_Q * 2));
  backbeat(events, barStart, WIPE_Q);
}

/** Solo bar: 8th toms cascading high → low over kick quarters. */
function wipeTomBar(events: DrumSongEvent[], barStart: number): void {
  events.push(hit('tomHi', barStart));
  events.push(hit('tomHi', barStart + WIPE_Q * 0.5));
  events.push(hit('tomMid', barStart + WIPE_Q));
  events.push(hit('tomMid', barStart + WIPE_Q * 1.5));
  events.push(hit('tomLow', barStart + WIPE_Q * 2));
  events.push(hit('tomLow', barStart + WIPE_Q * 2.5));
  events.push(hit('snare', barStart + WIPE_Q * 3));
  events.push(hit('snare', barStart + WIPE_Q * 3.5));
  events.push(hit('kick', barStart));
  events.push(hit('kick', barStart + WIPE_Q * 2));
}

export const WIPE_OUT_EVENTS: DrumSongEvent[] = (() => {
  const events: DrumSongEvent[] = [];
  const bar = (n: number) => n * WIPE_Q * 4;

  wipeRollBar(events, bar(0));

  wipeGrooveBar(events, bar(1));
  wipeGrooveBar(events, bar(2));
  wipeGrooveBar(events, bar(3));
  wipeGrooveBar(events, bar(4));

  wipeTomBar(events, bar(5));
  wipeTomBar(events, bar(6));

  wipeGrooveBar(events, bar(7), { crashOnOne: true });
  wipeGrooveBar(events, bar(8));

  wipeTomBar(events, bar(9));

  wipeGrooveBar(events, bar(10), { crashOnOne: true });
  wipeRollBar(events, bar(11));
  closeOut(events, bar(12));
  return sortEvents(events);
})();

/**
 * Walk This Way (Aerosmith) — ♩ = 108.
 * Joey Kramer's opening break: pushed kick (1, &1, 3) under 8th hats.
 */
const WTW_Q = 60000 / 108;

function wtwGrooveBar(
  events: DrumSongEvent[],
  barStart: number,
  opts?: EighthOpts,
): void {
  eighthHats(events, barStart, WTW_Q, opts);
  events.push(hit('kick', barStart));
  events.push(hit('kick', barStart + WTW_Q * 0.5));
  events.push(hit('kick', barStart + WTW_Q * 2));
  backbeat(events, barStart, WTW_Q);
}

function wtwFillBar(events: DrumSongEvent[], barStart: number): void {
  events.push(hit('kick', barStart));
  events.push(hit('snare', barStart + WTW_Q));
  events.push(hit('snare', barStart + WTW_Q * 1.5));
  events.push(hit('tomHi', barStart + WTW_Q * 2));
  events.push(hit('tomHi', barStart + WTW_Q * 2.5));
  events.push(hit('tomMid', barStart + WTW_Q * 3));
  events.push(hit('tomLow', barStart + WTW_Q * 3.5));
}

export const WALK_THIS_WAY_EVENTS: DrumSongEvent[] = (() => {
  const events: DrumSongEvent[] = [];
  const bar = (n: number) => n * WTW_Q * 4;

  wtwGrooveBar(events, bar(0));
  wtwGrooveBar(events, bar(1), { openEighths: [7] });
  wtwGrooveBar(events, bar(2));
  wtwGrooveBar(events, bar(3), { openEighths: [7] });
  wtwGrooveBar(events, bar(4));
  wtwGrooveBar(events, bar(5));
  wtwGrooveBar(events, bar(6), { crashOnOne: true });
  wtwGrooveBar(events, bar(7));
  wtwGrooveBar(events, bar(8), { crashOnOne: true });
  wtwGrooveBar(events, bar(9));
  wtwGrooveBar(events, bar(10));

  wtwFillBar(events, bar(11));
  closeOut(events, bar(12));
  return sortEvents(events);
})();

/**
 * Stayin' Alive (Bee Gees) — ♩ = 104.
 * Disco heartbeat: four-on-the-floor, open hats on every &, snare 2+4.
 */
const SA_Q = 60000 / 104;

function saDiscoBar(
  events: DrumSongEvent[],
  barStart: number,
  opts?: EighthOpts,
): void {
  eighthHats(events, barStart, SA_Q, {
    crashOnOne: opts?.crashOnOne,
    openEighths: [1, 3, 5, 7],
  });
  for (let beat = 0; beat < 4; beat++) {
    events.push(hit('kick', barStart + beat * SA_Q));
  }
  backbeat(events, barStart, SA_Q);
}

export const STAYIN_ALIVE_EVENTS: DrumSongEvent[] = (() => {
  const events: DrumSongEvent[] = [];
  const bar = (n: number) => n * SA_Q * 4;

  for (let n = 0; n < 11; n++) {
    saDiscoBar(events, bar(n), { crashOnOne: n === 4 || n === 8 });
  }

  // Turnaround: keep the floor thumping under a snare build.
  const last = bar(11);
  for (let beat = 0; beat < 4; beat++) {
    events.push(hit('kick', last + beat * SA_Q));
  }
  events.push(hit('snare', last + SA_Q));
  events.push(hit('snare', last + SA_Q * 2.5));
  events.push(hit('snare', last + SA_Q * 3));
  events.push(hit('snare', last + SA_Q * 3.5));
  closeOut(events, bar(12));
  return sortEvents(events);
})();

/**
 * Uptown Funk (Mark Ronson ft. Bruno Mars) — ♩ = 115.
 * Tight funk: kick 1 and & of 3, snare 2+4, open hat on the & of 4.
 */
const UF_Q = 60000 / 115;

function ufGrooveBar(
  events: DrumSongEvent[],
  barStart: number,
  opts?: EighthOpts,
): void {
  eighthHats(events, barStart, UF_Q, {
    crashOnOne: opts?.crashOnOne,
    openEighths: [7],
  });
  events.push(hit('kick', barStart));
  events.push(hit('kick', barStart + UF_Q * 2.5));
  backbeat(events, barStart, UF_Q);
}

function ufFillBar(events: DrumSongEvent[], barStart: number): void {
  events.push(hit('kick', barStart));
  events.push(hit('snare', barStart + UF_Q));
  events.push(hit('snare', barStart + UF_Q * 2));
  events.push(hit('snare', barStart + UF_Q * 2.5));
  events.push(hit('snare', barStart + UF_Q * 3));
  events.push(hit('snare', barStart + UF_Q * 3.5));
}

export const UPTOWN_FUNK_EVENTS: DrumSongEvent[] = (() => {
  const events: DrumSongEvent[] = [];
  const bar = (n: number) => n * UF_Q * 4;

  ufGrooveBar(events, bar(0));
  ufGrooveBar(events, bar(1));
  ufGrooveBar(events, bar(2));
  ufGrooveBar(events, bar(3));
  ufGrooveBar(events, bar(4), { crashOnOne: true });
  ufGrooveBar(events, bar(5));
  ufGrooveBar(events, bar(6));
  ufGrooveBar(events, bar(7));
  ufGrooveBar(events, bar(8), { crashOnOne: true });
  ufGrooveBar(events, bar(9));
  ufGrooveBar(events, bar(10));

  ufFillBar(events, bar(11));
  closeOut(events, bar(12));
  return sortEvents(events);
})();

/**
 * Dönence (Barış Manço) — ♩ = 110.
 * Anatolian disco-funk: four-on-the-floor with open-hat offbeats and the
 * signature descending tom breaks between sections.
 */
const DON_Q = 60000 / 110;

function donDiscoBar(
  events: DrumSongEvent[],
  barStart: number,
  opts?: EighthOpts,
): void {
  eighthHats(events, barStart, DON_Q, {
    crashOnOne: opts?.crashOnOne,
    openEighths: [1, 3, 5, 7],
  });
  for (let beat = 0; beat < 4; beat++) {
    events.push(hit('kick', barStart + beat * DON_Q));
  }
  backbeat(events, barStart, DON_Q);
}

/** Signature break: toms tumble high → low over a steady kick. */
function donTomBreakBar(events: DrumSongEvent[], barStart: number): void {
  events.push(hit('kick', barStart));
  events.push(hit('kick', barStart + DON_Q * 2));
  events.push(hit('tomHi', barStart));
  events.push(hit('tomHi', barStart + DON_Q * 0.5));
  events.push(hit('tomMid', barStart + DON_Q));
  events.push(hit('tomMid', barStart + DON_Q * 1.5));
  events.push(hit('tomLow', barStart + DON_Q * 2));
  events.push(hit('tomLow', barStart + DON_Q * 2.5));
  events.push(hit('snare', barStart + DON_Q * 3));
  events.push(hit('tomLow', barStart + DON_Q * 3.5));
}

export const DONENCE_EVENTS: DrumSongEvent[] = (() => {
  const events: DrumSongEvent[] = [];
  const bar = (n: number) => n * DON_Q * 4;

  donDiscoBar(events, bar(0));
  donDiscoBar(events, bar(1));
  donDiscoBar(events, bar(2));
  donTomBreakBar(events, bar(3));

  donDiscoBar(events, bar(4), { crashOnOne: true });
  donDiscoBar(events, bar(5));
  donDiscoBar(events, bar(6));
  donTomBreakBar(events, bar(7));

  donDiscoBar(events, bar(8), { crashOnOne: true });
  donDiscoBar(events, bar(9));
  donDiscoBar(events, bar(10));

  donTomBreakBar(events, bar(11));
  closeOut(events, bar(12));
  return sortEvents(events);
})();
