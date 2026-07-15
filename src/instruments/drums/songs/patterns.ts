import type { DrumSongEvent } from './types';
import type { DrumSoundId } from '../drumsSounds';

/** Quarter note at 120 BPM. */
const Q = 500;

function hit(padId: DrumSoundId, atMs: number): DrumSongEvent {
  return { padId, atMs };
}

/** Classic rock: kick 1+3, snare 2+4, closed hat 8ths — 2 bars. */
export const BASIC_ROCK_EVENTS: DrumSongEvent[] = (() => {
  const events: DrumSongEvent[] = [];
  for (let bar = 0; bar < 2; bar++) {
    const o = bar * Q * 4;
    for (let i = 0; i < 8; i++) {
      events.push(hit('hihatClosed', o + i * (Q / 2)));
    }
    events.push(hit('kick', o));
    events.push(hit('snare', o + Q));
    events.push(hit('kick', o + Q * 2));
    events.push(hit('snare', o + Q * 3));
  }
  return events.sort((a, b) => a.atMs - b.atMs || a.padId.localeCompare(b.padId));
})();

/** Four-on-the-floor kick + snare backbeat + open hat on offbeats — 2 bars. */
export const DISCO_FLOOR_EVENTS: DrumSongEvent[] = (() => {
  const events: DrumSongEvent[] = [];
  for (let bar = 0; bar < 2; bar++) {
    const o = bar * Q * 4;
    for (let beat = 0; beat < 4; beat++) {
      events.push(hit('kick', o + beat * Q));
    }
    events.push(hit('snare', o + Q));
    events.push(hit('snare', o + Q * 3));
    events.push(hit('hihatOpen', o + Q / 2));
    events.push(hit('hihatOpen', o + Q + Q / 2));
    events.push(hit('hihatOpen', o + Q * 2 + Q / 2));
    events.push(hit('hihatOpen', o + Q * 3 + Q / 2));
  }
  return events.sort((a, b) => a.atMs - b.atMs || a.padId.localeCompare(b.padId));
})();

/** Descending tom fill into crash — 1 bar. */
export const TOM_FILL_EVENTS: DrumSongEvent[] = [
  hit('tomHi', 0),
  hit('tomHi', Q / 2),
  hit('tomMid', Q),
  hit('tomMid', Q + Q / 2),
  hit('tomLow', Q * 2),
  hit('tomLow', Q * 2 + Q / 2),
  hit('snare', Q * 3),
  hit('kick', Q * 3),
  hit('crash', Q * 4),
  hit('kick', Q * 4),
];

/** Simple samba-ish: kick + side stick feel with hats — 2 bars. */
export const SIMPLE_SAMBA_EVENTS: DrumSongEvent[] = (() => {
  const events: DrumSongEvent[] = [];
  for (let bar = 0; bar < 2; bar++) {
    const o = bar * Q * 4;
    events.push(hit('kick', o));
    events.push(hit('hihatClosed', o));
    events.push(hit('hihatClosed', o + Q / 2));
    events.push(hit('snare', o + Q * 0.75));
    events.push(hit('kick', o + Q));
    events.push(hit('hihatClosed', o + Q));
    events.push(hit('hihatOpen', o + Q * 1.5));
    events.push(hit('snare', o + Q * 2));
    events.push(hit('hihatClosed', o + Q * 2));
    events.push(hit('kick', o + Q * 2.5));
    events.push(hit('hihatClosed', o + Q * 2.5));
    events.push(hit('snare', o + Q * 3));
    events.push(hit('hihatClosed', o + Q * 3));
    events.push(hit('ride', o + Q * 3.5));
  }
  return events.sort((a, b) => a.atMs - b.atMs || a.padId.localeCompare(b.padId));
})();

/** Slow practice groove: kick + snare only — 2 bars. */
export const KICK_SNARE_EVENTS: DrumSongEvent[] = (() => {
  const events: DrumSongEvent[] = [];
  for (let bar = 0; bar < 2; bar++) {
    const o = bar * Q * 4;
    events.push(hit('kick', o));
    events.push(hit('snare', o + Q));
    events.push(hit('kick', o + Q * 2));
    events.push(hit('kick', o + Q * 2.5));
    events.push(hit('snare', o + Q * 3));
  }
  return events;
})();

/** Cymbal accents with ride pattern — 2 bars. */
export const RIDE_GROOVE_EVENTS: DrumSongEvent[] = (() => {
  const events: DrumSongEvent[] = [];
  for (let bar = 0; bar < 2; bar++) {
    const o = bar * Q * 4;
    for (let i = 0; i < 8; i++) {
      events.push(hit('ride', o + i * (Q / 2)));
    }
    events.push(hit('kick', o));
    events.push(hit('snare', o + Q));
    events.push(hit('kick', o + Q * 2));
    events.push(hit('kick', o + Q * 2.5));
    events.push(hit('snare', o + Q * 3));
    if (bar === 1) {
      events.push(hit('crash', o + Q * 4));
    }
  }
  return events.sort((a, b) => a.atMs - b.atMs || a.padId.localeCompare(b.padId));
})();

/**
 * Enter Sandman (Metallica) — main groove + crash turns + fill.
 * Chart tempo ♩ = 123; hats = 8ths, snare on 2+4, kick on 1 and & of 2.
 * Excerpt maps to online sheet mm. 9–20 (3× groove phrase + fill).
 */
const SANDMAN_Q = 60000 / 123;

function sandmanGrooveBar(
  events: DrumSongEvent[],
  barStart: number,
  opts?: { crashAtEighths?: number[] },
): void {
  const crashSet = new Set(opts?.crashAtEighths ?? []);
  for (let i = 0; i < 8; i++) {
    const t = barStart + i * (SANDMAN_Q / 2);
    if (crashSet.has(i)) {
      events.push(hit('crash', t));
    } else {
      events.push(hit('hihatClosed', t));
    }
  }
  events.push(hit('kick', barStart));
  events.push(hit('snare', barStart + SANDMAN_Q));
  events.push(hit('kick', barStart + SANDMAN_Q + SANDMAN_Q / 2));
  events.push(hit('snare', barStart + SANDMAN_Q * 3));
}

function sandmanFillBar(events: DrumSongEvent[], barStart: number): void {
  const s = SANDMAN_Q / 4;
  // Beats 1–2: 16th snare/kick run (sheet mm. 20).
  for (let i = 0; i < 8; i++) {
    const t = barStart + i * s;
    events.push(hit(i % 2 === 0 ? 'snare' : 'kick', t));
  }
  // & of 3 and & of 4: accented crashes.
  events.push(hit('crash', barStart + SANDMAN_Q * 2.5));
  events.push(hit('kick', barStart + SANDMAN_Q * 2.5));
  events.push(hit('crash', barStart + SANDMAN_Q * 3.5));
  events.push(hit('kick', barStart + SANDMAN_Q * 3.5));
}

export const ENTER_SANDMAN_EVENTS: DrumSongEvent[] = (() => {
  const events: DrumSongEvent[] = [];
  const bar = (n: number) => n * SANDMAN_Q * 4;

  // mm. 9–11 — main groove
  sandmanGrooveBar(events, bar(0));
  sandmanGrooveBar(events, bar(1));
  sandmanGrooveBar(events, bar(2));
  // mm. 12 — groove, crash on last 8th of beat 4
  sandmanGrooveBar(events, bar(3), { crashAtEighths: [7] });

  // mm. 13–15
  sandmanGrooveBar(events, bar(4));
  sandmanGrooveBar(events, bar(5));
  sandmanGrooveBar(events, bar(6));
  // mm. 16 — crashes on & of 3 and & of 4
  sandmanGrooveBar(events, bar(7), { crashAtEighths: [5, 7] });

  // mm. 17–19
  sandmanGrooveBar(events, bar(8));
  sandmanGrooveBar(events, bar(9));
  sandmanGrooveBar(events, bar(10));
  // mm. 20 — fill
  sandmanFillBar(events, bar(11));

  return events.sort((a, b) => a.atMs - b.atMs || a.padId.localeCompare(b.padId));
})();

/**
 * Billie Jean (Michael Jackson) — Ndugu Chancler groove.
 * Chart tempo ♩ = 117 (Brandon Toews / Thriller transcription).
 * Kick on 1+3, snare on 2+4, closed-hat 8ths; chorus crash hits + end fill.
 */
const BILLIE_Q = 60000 / 117;

function billieJeanGrooveBar(
  events: DrumSongEvent[],
  barStart: number,
  opts?: { crashOnOne?: boolean },
): void {
  for (let i = 0; i < 8; i++) {
    const t = barStart + i * (BILLIE_Q / 2);
    if (opts?.crashOnOne && i === 0) {
      events.push(hit('crash', t));
    } else {
      events.push(hit('hihatClosed', t));
    }
  }
  events.push(hit('kick', barStart));
  events.push(hit('snare', barStart + BILLIE_Q));
  events.push(hit('kick', barStart + BILLIE_Q * 2));
  events.push(hit('snare', barStart + BILLIE_Q * 3));
}

function billieJeanFillBar(events: DrumSongEvent[], barStart: number): void {
  // Beats 1–2: keep the pocket.
  events.push(hit('hihatClosed', barStart));
  events.push(hit('kick', barStart));
  events.push(hit('hihatClosed', barStart + BILLIE_Q / 2));
  events.push(hit('hihatClosed', barStart + BILLIE_Q));
  events.push(hit('snare', barStart + BILLIE_Q));
  events.push(hit('hihatClosed', barStart + BILLIE_Q * 1.5));
  // Beat 3: snare build (sheet “œ œ” lead-in).
  events.push(hit('snare', barStart + BILLIE_Q * 2));
  events.push(hit('snare', barStart + BILLIE_Q * 2.5));
  // Beat 4: toms into crash.
  events.push(hit('tomMid', barStart + BILLIE_Q * 3));
  events.push(hit('tomLow', barStart + BILLIE_Q * 3.5));
  events.push(hit('crash', barStart + BILLIE_Q * 3.5));
  events.push(hit('kick', barStart + BILLIE_Q * 3.5));
}

export const BILLIE_JEAN_EVENTS: DrumSongEvent[] = (() => {
  const events: DrumSongEvent[] = [];
  const bar = (n: number) => n * BILLIE_Q * 4;

  // Drum intro feel (sheet Play 3x condensed to 4 bars)
  billieJeanGrooveBar(events, bar(0));
  billieJeanGrooveBar(events, bar(1));
  billieJeanGrooveBar(events, bar(2));
  billieJeanGrooveBar(events, bar(3));

  // Verse pocket
  billieJeanGrooveBar(events, bar(4));
  billieJeanGrooveBar(events, bar(5));
  billieJeanGrooveBar(events, bar(6));
  billieJeanGrooveBar(events, bar(7));

  // Pre-chorus / chorus crash hits (sheet crash on downbeats)
  billieJeanGrooveBar(events, bar(8), { crashOnOne: true });
  billieJeanGrooveBar(events, bar(9), { crashOnOne: true });
  billieJeanGrooveBar(events, bar(10));
  // Turnaround fill
  billieJeanFillBar(events, bar(11));

  return events.sort((a, b) => a.atMs - b.atMs || a.padId.localeCompare(b.padId));
})();

/**
 * Seven Nation Army (The White Stripes) — Meg White groove.
 * Chart tempo ♩ = 126 (Dynamic Drum School full chart).
 * Kick on all quarters + closed-hat 8ths; snare added on 2+4; chorus crashes.
 */
const SNA_Q = 60000 / 126;

function snaKickHatBar(events: DrumSongEvent[], barStart: number): void {
  for (let i = 0; i < 8; i++) {
    events.push(hit('hihatClosed', barStart + i * (SNA_Q / 2)));
  }
  for (let beat = 0; beat < 4; beat++) {
    events.push(hit('kick', barStart + beat * SNA_Q));
  }
}

function snaGrooveBar(
  events: DrumSongEvent[],
  barStart: number,
  opts?: { crashOnOne?: boolean },
): void {
  for (let i = 0; i < 8; i++) {
    const t = barStart + i * (SNA_Q / 2);
    if (opts?.crashOnOne && i === 0) {
      events.push(hit('crash', t));
    } else {
      events.push(hit('hihatClosed', t));
    }
  }
  for (let beat = 0; beat < 4; beat++) {
    events.push(hit('kick', barStart + beat * SNA_Q));
  }
  // Sheet: “Add the Snare on 2 & 4”
  events.push(hit('snare', barStart + SNA_Q));
  events.push(hit('snare', barStart + SNA_Q * 3));
}

function snaFillBar(events: DrumSongEvent[], barStart: number): void {
  // Beats 1–2: keep the stomp.
  events.push(hit('hihatClosed', barStart));
  events.push(hit('kick', barStart));
  events.push(hit('hihatClosed', barStart + SNA_Q / 2));
  events.push(hit('kick', barStart + SNA_Q));
  events.push(hit('snare', barStart + SNA_Q));
  events.push(hit('hihatClosed', barStart + SNA_Q));
  events.push(hit('hihatClosed', barStart + SNA_Q * 1.5));
  // Beats 3–4: snare 8ths into crash (sparse Meg-style turnaround).
  events.push(hit('snare', barStart + SNA_Q * 2));
  events.push(hit('snare', barStart + SNA_Q * 2.5));
  events.push(hit('snare', barStart + SNA_Q * 3));
  events.push(hit('crash', barStart + SNA_Q * 3.5));
  events.push(hit('kick', barStart + SNA_Q * 3.5));
}

export const SEVEN_NATION_ARMY_EVENTS: DrumSongEvent[] = (() => {
  const events: DrumSongEvent[] = [];
  const bar = (n: number) => n * SNA_Q * 4;

  // Verse build — kick + hat only (before snare enters)
  snaKickHatBar(events, bar(0));
  snaKickHatBar(events, bar(1));

  // Verse — snare on 2 & 4
  snaGrooveBar(events, bar(2));
  snaGrooveBar(events, bar(3));
  snaGrooveBar(events, bar(4));
  snaGrooveBar(events, bar(5));

  // Pre-chorus (2 bars)
  snaGrooveBar(events, bar(6));
  snaGrooveBar(events, bar(7));

  // Instrumental chorus — crash on downbeats
  snaGrooveBar(events, bar(8), { crashOnOne: true });
  snaGrooveBar(events, bar(9), { crashOnOne: true });
  snaGrooveBar(events, bar(10), { crashOnOne: true });

  // Post-chorus turnaround
  snaFillBar(events, bar(11));

  return events.sort((a, b) => a.atMs - b.atMs || a.padId.localeCompare(b.padId));
})();

/**
 * Smells Like Teen Spirit (Nirvana) — Dave Grohl groove.
 * Chart tempo ♩ = 116 (Alldrummer arr.).
 * Hats 8ths; snare on 2+4; kick on 1, 1&, 2&, and 3 — then chorus crashes + fill.
 */
const TEEN_Q = 60000 / 116;

function teenSpiritGrooveBar(
  events: DrumSongEvent[],
  barStart: number,
  opts?: { crashOnOne?: boolean },
): void {
  for (let i = 0; i < 8; i++) {
    const t = barStart + i * (TEEN_Q / 2);
    if (opts?.crashOnOne && i === 0) {
      events.push(hit('crash', t));
    } else {
      events.push(hit('hihatClosed', t));
    }
  }
  // Sheet mm.5 kick: 1, & of 1, & of 2, 3
  events.push(hit('kick', barStart));
  events.push(hit('kick', barStart + TEEN_Q / 2));
  events.push(hit('kick', barStart + TEEN_Q + TEEN_Q / 2));
  events.push(hit('kick', barStart + TEEN_Q * 2));
  events.push(hit('snare', barStart + TEEN_Q));
  events.push(hit('snare', barStart + TEEN_Q * 3));
}

function teenSpiritFillBar(events: DrumSongEvent[], barStart: number): void {
  // Intro/turnaround fill feel (sheet mm.4 — starts around beat 2).
  events.push(hit('kick', barStart));
  const s = TEEN_Q / 4;
  events.push(hit('snare', barStart + TEEN_Q));
  events.push(hit('snare', barStart + TEEN_Q + s));
  events.push(hit('tomHi', barStart + TEEN_Q + 2 * s));
  events.push(hit('tomMid', barStart + TEEN_Q + 3 * s));
  events.push(hit('tomLow', barStart + TEEN_Q * 2));
  events.push(hit('snare', barStart + TEEN_Q * 2.5));
  events.push(hit('snare', barStart + TEEN_Q * 3));
  events.push(hit('crash', barStart + TEEN_Q * 3.5));
  events.push(hit('kick', barStart + TEEN_Q * 3.5));
}

export const SMELLS_LIKE_TEEN_SPIRIT_EVENTS: DrumSongEvent[] = (() => {
  const events: DrumSongEvent[] = [];
  const bar = (n: number) => n * TEEN_Q * 4;

  // Main groove (verse / quiet-loud pocket)
  teenSpiritGrooveBar(events, bar(0));
  teenSpiritGrooveBar(events, bar(1));
  teenSpiritGrooveBar(events, bar(2));
  teenSpiritGrooveBar(events, bar(3));
  teenSpiritGrooveBar(events, bar(4));
  teenSpiritGrooveBar(events, bar(5));

  // Chorus — crash on downbeats
  teenSpiritGrooveBar(events, bar(6), { crashOnOne: true });
  teenSpiritGrooveBar(events, bar(7), { crashOnOne: true });
  teenSpiritGrooveBar(events, bar(8), { crashOnOne: true });
  teenSpiritGrooveBar(events, bar(9), { crashOnOne: true });

  teenSpiritGrooveBar(events, bar(10));
  // Ending fill
  teenSpiritFillBar(events, bar(11));

  return events.sort((a, b) => a.atMs - b.atMs || a.padId.localeCompare(b.padId));
})();

/**
 * We Will Rock You (Queen) — Brian May / Tom Ansuini OMC chart.
 * Chart tempo ♩ = 83. Classic stomp–stomp–clap, then full-kit entrance.
 */
const WWRY_Q = 60000 / 83;

/** Stomp (kick) on 1+2, clap (snare) on 3 — rest on 4. */
function wwryStompBar(events: DrumSongEvent[], barStart: number): void {
  events.push(hit('kick', barStart));
  events.push(hit('kick', barStart + WWRY_Q));
  events.push(hit('snare', barStart + WWRY_Q * 2));
}

/** Full-kit entrance: same stomps under quarter hats / crash. */
function wwryFullBar(
  events: DrumSongEvent[],
  barStart: number,
  opts?: { crashOnOne?: boolean },
): void {
  for (let i = 0; i < 4; i++) {
    const t = barStart + i * WWRY_Q;
    if (opts?.crashOnOne && i === 0) {
      events.push(hit('crash', t));
    } else {
      events.push(hit('hihatClosed', t));
    }
  }
  events.push(hit('kick', barStart));
  events.push(hit('kick', barStart + WWRY_Q));
  events.push(hit('snare', barStart + WWRY_Q * 2));
}

function wwryEndingBar(events: DrumSongEvent[], barStart: number): void {
  // Keep stomps, then big crash hit (chart ending punch).
  events.push(hit('kick', barStart));
  events.push(hit('crash', barStart));
  events.push(hit('kick', barStart + WWRY_Q));
  events.push(hit('snare', barStart + WWRY_Q * 2));
  events.push(hit('snare', barStart + WWRY_Q * 2.5));
  events.push(hit('snare', barStart + WWRY_Q * 3));
  events.push(hit('crash', barStart + WWRY_Q * 3.5));
  events.push(hit('kick', barStart + WWRY_Q * 3.5));
}

export const WE_WILL_ROCK_YOU_EVENTS: DrumSongEvent[] = (() => {
  const events: DrumSongEvent[] = [];
  const bar = (n: number) => n * WWRY_Q * 4;

  // Iconic stomp–stomp–clap (audience / sparse kit feel)
  wwryStompBar(events, bar(0));
  wwryStompBar(events, bar(1));
  wwryStompBar(events, bar(2));
  wwryStompBar(events, bar(3));
  wwryStompBar(events, bar(4));
  wwryStompBar(events, bar(5));

  // Band / full drum set entrance
  wwryFullBar(events, bar(6), { crashOnOne: true });
  wwryFullBar(events, bar(7));
  wwryFullBar(events, bar(8), { crashOnOne: true });
  wwryFullBar(events, bar(9));

  wwryFullBar(events, bar(10));
  wwryEndingBar(events, bar(11));

  return events.sort((a, b) => a.atMs - b.atMs || a.padId.localeCompare(b.padId));
})();

/**
 * Bir Derdim Var (Mor ve Ötesi) — Semih Temuçin transcription.
 * Chart tempo ♩ = 120. Intro open-hat hits → C-section groove (œ™ œ kick feel).
 */
const BDV_Q = 60000 / 120;

function bdvIntroBar(events: DrumSongEvent[], barStart: number): void {
  // Sheet intro: sparse open-hat “o o” hits.
  events.push(hit('hihatOpen', barStart));
  events.push(hit('hihatOpen', barStart + BDV_Q * 2));
}

function bdvGrooveBar(
  events: DrumSongEvent[],
  barStart: number,
  opts?: { crashOnOne?: boolean; dense?: boolean },
): void {
  for (let i = 0; i < 8; i++) {
    const t = barStart + i * (BDV_Q / 2);
    if (opts?.crashOnOne && i === 0) {
      events.push(hit('crash', t));
    } else {
      events.push(hit('hihatClosed', t));
    }
  }
  // C section: dotted kick on 1, 8th on & of 2; snare on 2+4.
  events.push(hit('kick', barStart));
  events.push(hit('snare', barStart + BDV_Q));
  events.push(hit('kick', barStart + BDV_Q + BDV_Q / 2));
  if (opts?.dense) {
    events.push(hit('kick', barStart + BDV_Q * 2));
  }
  events.push(hit('snare', barStart + BDV_Q * 3));
}

function bdvFillBar(events: DrumSongEvent[], barStart: number): void {
  events.push(hit('hihatClosed', barStart));
  events.push(hit('kick', barStart));
  events.push(hit('snare', barStart + BDV_Q));
  events.push(hit('kick', barStart + BDV_Q + BDV_Q / 2));
  events.push(hit('snare', barStart + BDV_Q * 2));
  events.push(hit('tomHi', barStart + BDV_Q * 2.5));
  events.push(hit('tomMid', barStart + BDV_Q * 3));
  events.push(hit('tomLow', barStart + BDV_Q * 3.5));
  events.push(hit('crash', barStart + BDV_Q * 3.5));
  events.push(hit('kick', barStart + BDV_Q * 3.5));
}

export const BIR_DERDIM_VAR_EVENTS: DrumSongEvent[] = (() => {
  const events: DrumSongEvent[] = [];
  const bar = (n: number) => n * BDV_Q * 4;

  // Intro feel (sheet: rest then open hats)
  bdvIntroBar(events, bar(0));
  bdvIntroBar(events, bar(1));

  // Verse / C pocket
  bdvGrooveBar(events, bar(2));
  bdvGrooveBar(events, bar(3));
  bdvGrooveBar(events, bar(4));
  bdvGrooveBar(events, bar(5));

  // Denser chorus drive
  bdvGrooveBar(events, bar(6), { dense: true });
  bdvGrooveBar(events, bar(7), { dense: true });
  bdvGrooveBar(events, bar(8), { crashOnOne: true, dense: true });
  bdvGrooveBar(events, bar(9), { crashOnOne: true, dense: true });

  bdvGrooveBar(events, bar(10), { dense: true });
  bdvFillBar(events, bar(11));

  return events.sort((a, b) => a.atMs - b.atMs || a.padId.localeCompare(b.padId));
})();

/**
 * Seni Kendime Sakladım (Duman) — Semih Temuçin transcription.
 * Chart tempo ♩ = 70. Slow rock pocket: hats + kick 1+3 / snare 2+4, then build + fill.
 */
const SKS_Q = 60000 / 70;

function sksIntroBar(events: DrumSongEvent[], barStart: number): void {
  // Sheet A: sparse hits + open hat (“o”) feel.
  events.push(hit('kick', barStart));
  events.push(hit('hihatOpen', barStart + SKS_Q * 2));
  events.push(hit('kick', barStart + SKS_Q * 3));
}

function sksGrooveBar(
  events: DrumSongEvent[],
  barStart: number,
  opts?: { crashOnOne?: boolean; syncopated?: boolean },
): void {
  for (let i = 0; i < 8; i++) {
    const t = barStart + i * (SKS_Q / 2);
    if (opts?.crashOnOne && i === 0) {
      events.push(hit('crash', t));
    } else {
      events.push(hit('hihatClosed', t));
    }
  }
  events.push(hit('kick', barStart));
  events.push(hit('snare', barStart + SKS_Q));
  if (opts?.syncopated) {
    // Sheet œ™ œ kick feel into beat 3.
    events.push(hit('kick', barStart + SKS_Q + SKS_Q / 2));
  }
  events.push(hit('kick', barStart + SKS_Q * 2));
  events.push(hit('snare', barStart + SKS_Q * 3));
}

function sksFillBar(events: DrumSongEvent[], barStart: number): void {
  // Sheet ending runs — snare/tom 8ths into crash.
  events.push(hit('kick', barStart));
  events.push(hit('snare', barStart + SKS_Q));
  events.push(hit('snare', barStart + SKS_Q * 1.5));
  events.push(hit('tomHi', barStart + SKS_Q * 2));
  events.push(hit('tomMid', barStart + SKS_Q * 2.5));
  events.push(hit('tomLow', barStart + SKS_Q * 3));
  events.push(hit('snare', barStart + SKS_Q * 3.5));
  events.push(hit('crash', barStart + SKS_Q * 3.5));
  events.push(hit('kick', barStart + SKS_Q * 3.5));
}

export const SENI_KENDIME_SAKLADIM_EVENTS: DrumSongEvent[] = (() => {
  const events: DrumSongEvent[] = [];
  const bar = (n: number) => n * SKS_Q * 4;

  // Intro (section A sparse)
  sksIntroBar(events, bar(0));
  sksIntroBar(events, bar(1));

  // Main slow pocket
  sksGrooveBar(events, bar(2));
  sksGrooveBar(events, bar(3));
  sksGrooveBar(events, bar(4), { syncopated: true });
  sksGrooveBar(events, bar(5), { syncopated: true });

  // Build / chorus accents
  sksGrooveBar(events, bar(6), { crashOnOne: true, syncopated: true });
  sksGrooveBar(events, bar(7), { crashOnOne: true, syncopated: true });
  sksGrooveBar(events, bar(8), { syncopated: true });
  sksGrooveBar(events, bar(9), { crashOnOne: true, syncopated: true });

  sksGrooveBar(events, bar(10), { syncopated: true });
  sksFillBar(events, bar(11));

  return events.sort((a, b) => a.atMs - b.atMs || a.padId.localeCompare(b.padId));
})();

/**
 * Kendime Yalan Söyledim (Seksendört) — Deniz Işıkdemir SCORE.
 * Chart tempo ♩ = 127. Intro offbeat kicks → hat 8ths + backbeat → drive + crash/fill.
 */
const KYS_Q = 60000 / 127;

function kysIntroBar(events: DrumSongEvent[], barStart: number): void {
  // Sheet opening: Œ œ Œ œ — hit on 2 and 4.
  events.push(hit('kick', barStart + KYS_Q));
  events.push(hit('kick', barStart + KYS_Q * 3));
}

function kysGrooveBar(
  events: DrumSongEvent[],
  barStart: number,
  opts?: { crashOnOne?: boolean; drive?: boolean },
): void {
  for (let i = 0; i < 8; i++) {
    const t = barStart + i * (KYS_Q / 2);
    if (opts?.crashOnOne && i === 0) {
      events.push(hit('crash', t));
    } else {
      events.push(hit('hihatClosed', t));
    }
  }
  // mm.7 feel: œ œ œ œ under 8th hats → kick/snare quarters.
  events.push(hit('kick', barStart));
  events.push(hit('snare', barStart + KYS_Q));
  events.push(hit('kick', barStart + KYS_Q * 2));
  if (opts?.drive) {
    // mm.19: œ œ œ Œ œ — extra kick on 4 with snare.
    events.push(hit('kick', barStart + KYS_Q * 3));
  }
  events.push(hit('snare', barStart + KYS_Q * 3));
}

function kysFillBar(events: DrumSongEvent[], barStart: number): void {
  // Sheet 16th snare runs into crash (mm.23 / ending).
  const s = KYS_Q / 4;
  events.push(hit('kick', barStart));
  events.push(hit('snare', barStart + KYS_Q));
  for (let i = 0; i < 8; i++) {
    events.push(hit('snare', barStart + KYS_Q * 2 + i * s));
  }
  events.push(hit('crash', barStart + KYS_Q * 4 - s));
  events.push(hit('kick', barStart + KYS_Q * 4 - s));
}

export const KENDIME_YALAN_SOYLEDIM_EVENTS: DrumSongEvent[] = (() => {
  const events: DrumSongEvent[] = [];
  const bar = (n: number) => n * KYS_Q * 4;

  // Intro kicks
  kysIntroBar(events, bar(0));
  kysIntroBar(events, bar(1));

  // Main groove (sheet 4X section)
  kysGrooveBar(events, bar(2));
  kysGrooveBar(events, bar(3));
  kysGrooveBar(events, bar(4));
  kysGrooveBar(events, bar(5));

  // Driving chorus pocket
  kysGrooveBar(events, bar(6), { drive: true });
  kysGrooveBar(events, bar(7), { drive: true, crashOnOne: true });
  kysGrooveBar(events, bar(8), { drive: true });
  kysGrooveBar(events, bar(9), { drive: true, crashOnOne: true });

  kysGrooveBar(events, bar(10), { drive: true });
  kysFillBar(events, bar(11));

  return events.sort((a, b) => a.atMs - b.atMs || a.padId.localeCompare(b.padId));
})();
