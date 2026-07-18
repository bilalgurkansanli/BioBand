import type { PadSoundId } from '../padsSounds';
import type { PadSongEvent } from './types';

/** Quarter note at 120 BPM. */
const Q = 500;

function hit(padId: PadSoundId, atMs: number): PadSongEvent {
  return { padId, atMs };
}

/** Slow practice groove: kick + snare only — 2 bars. */
export const KICK_SNARE_EVENTS: PadSongEvent[] = (() => {
  const events: PadSongEvent[] = [];
  for (let bar = 0; bar < 2; bar++) {
    const o = bar * Q * 4;
    events.push(hit('pad01', o));
    events.push(hit('pad02', o + Q));
    events.push(hit('pad01', o + Q * 2));
    events.push(hit('pad01', o + Q * 2.5));
    events.push(hit('pad02', o + Q * 3));
  }
  return events;
})();

/** Classic rock: kick 1+3, snare 2+4, closed hat 8ths — 2 bars. */
export const BASIC_ROCK_EVENTS: PadSongEvent[] = (() => {
  const events: PadSongEvent[] = [];
  for (let bar = 0; bar < 2; bar++) {
    const o = bar * Q * 4;
    for (let i = 0; i < 8; i++) {
      events.push(hit('pad03', o + i * (Q / 2)));
    }
    events.push(hit('pad01', o));
    events.push(hit('pad02', o + Q));
    events.push(hit('pad01', o + Q * 2));
    events.push(hit('pad02', o + Q * 3));
  }
  return events.sort((a, b) => a.atMs - b.atMs || a.padId.localeCompare(b.padId));
})();

/** Four-on-the-floor kick + snare backbeat + open hat on offbeats — 2 bars. */
export const DISCO_FLOOR_EVENTS: PadSongEvent[] = (() => {
  const events: PadSongEvent[] = [];
  for (let bar = 0; bar < 2; bar++) {
    const o = bar * Q * 4;
    for (let beat = 0; beat < 4; beat++) {
      events.push(hit('pad01', o + beat * Q));
    }
    events.push(hit('pad02', o + Q));
    events.push(hit('pad02', o + Q * 3));
    events.push(hit('pad04', o + Q / 2));
    events.push(hit('pad04', o + Q + Q / 2));
    events.push(hit('pad04', o + Q * 2 + Q / 2));
    events.push(hit('pad04', o + Q * 3 + Q / 2));
  }
  return events.sort((a, b) => a.atMs - b.atMs || a.padId.localeCompare(b.padId));
})();

/** Descending tom/perc fill into crash — 1 bar. */
export const TOM_FILL_EVENTS: PadSongEvent[] = [
  hit('pad05', 0),
  hit('pad05', Q / 2),
  hit('pad06', Q),
  hit('pad06', Q + Q / 2),
  hit('pad05', Q * 2),
  hit('pad05', Q * 2 + Q / 2),
  hit('pad02', Q * 3),
  hit('pad01', Q * 3),
  hit('pad07', Q * 4),
  hit('pad01', Q * 4),
];

/** Cymbal accents with ride pattern — 2 bars. */
export const RIDE_GROOVE_EVENTS: PadSongEvent[] = (() => {
  const events: PadSongEvent[] = [];
  for (let bar = 0; bar < 2; bar++) {
    const o = bar * Q * 4;
    for (let i = 0; i < 8; i++) {
      events.push(hit('pad08', o + i * (Q / 2)));
    }
    events.push(hit('pad01', o));
    events.push(hit('pad02', o + Q));
    events.push(hit('pad01', o + Q * 2));
    events.push(hit('pad01', o + Q * 2.5));
    events.push(hit('pad02', o + Q * 3));
    if (bar === 1) {
      events.push(hit('pad07', o + Q * 4));
    }
  }
  return events.sort((a, b) => a.atMs - b.atMs || a.padId.localeCompare(b.padId));
})();

/** Simple samba-ish: kick + perc feel with hats — 2 bars. */
export const SIMPLE_SAMBA_EVENTS: PadSongEvent[] = (() => {
  const events: PadSongEvent[] = [];
  for (let bar = 0; bar < 2; bar++) {
    const o = bar * Q * 4;
    events.push(hit('pad01', o));
    events.push(hit('pad03', o));
    events.push(hit('pad03', o + Q / 2));
    events.push(hit('pad02', o + Q * 0.75));
    events.push(hit('pad01', o + Q));
    events.push(hit('pad03', o + Q));
    events.push(hit('pad04', o + Q * 1.5));
    events.push(hit('pad02', o + Q * 2));
    events.push(hit('pad03', o + Q * 2));
    events.push(hit('pad01', o + Q * 2.5));
    events.push(hit('pad03', o + Q * 2.5));
    events.push(hit('pad02', o + Q * 3));
    events.push(hit('pad03', o + Q * 3));
    events.push(hit('pad08', o + Q * 3.5));
  }
  return events.sort((a, b) => a.atMs - b.atMs || a.padId.localeCompare(b.padId));
})();

/** Stab riff: uses pad09–pad12 synth stabs — 2 bars. */
export const STAB_RIFF_EVENTS: PadSongEvent[] = (() => {
  const events: PadSongEvent[] = [];
  for (let bar = 0; bar < 2; bar++) {
    const o = bar * Q * 4;
    events.push(hit('pad01', o));
    events.push(hit('pad09', o));
    events.push(hit('pad02', o + Q));
    events.push(hit('pad10', o + Q));
    events.push(hit('pad01', o + Q * 2));
    events.push(hit('pad11', o + Q * 2));
    events.push(hit('pad12', o + Q * 2.5));
    events.push(hit('pad02', o + Q * 3));
    events.push(hit('pad09', o + Q * 3));
    events.push(hit('pad10', o + Q * 3.5));
  }
  return events.sort((a, b) => a.atMs - b.atMs || a.padId.localeCompare(b.padId));
})();

/** We Will Rock You style: stomp-stomp-clap — 2 bars at 83 BPM. */
const WWRY_Q = 60000 / 83;
export const WE_WILL_ROCK_YOU_EVENTS: PadSongEvent[] = (() => {
  const events: PadSongEvent[] = [];
  for (let bar = 0; bar < 2; bar++) {
    const o = bar * WWRY_Q * 4;
    events.push(hit('pad01', o));
    events.push(hit('pad01', o + WWRY_Q));
    events.push(hit('pad02', o + WWRY_Q * 2));
  }
  return events;
})();
