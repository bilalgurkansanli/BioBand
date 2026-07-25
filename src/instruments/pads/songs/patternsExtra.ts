import { createGrid, groupStresses } from '../../shared/rhythm';
import type { PadSoundId } from '../padsSounds';
import type { SongMeter } from '../../piano/songs/types';
import type { PadSongEvent } from './types';

/**
 * Instructional rhythm lessons (no songs). Turkish usûl patterns target the
 * TURKISH bank layout (pad01 düm, pad02 tek, pad03 ka, pad04 şak,
 * pad05 derin düm, pad06 flam, pad07 bendir düm, pad08 bendir tek,
 * pad09 bendir vız, pad10 def, pad11 def zil, pad12 def şak, pad13 kaşık,
 * pad14 çift kaşık, pad15 zilli maşa); modern grooves target the DRUMS bank
 * (pad01 kick, pad02 snare, pad03 hat, pad04 open hat, pad05 tom,
 * pad07 crash, pad08 ride, pad09 low tom, pad10 808, pad11 high tom).
 * The catalog carries each lesson's bankId so selection auto-switches.
 */

function hit(padId: PadSoundId, atMs: number): PadSongEvent {
  return { padId, atMs: Math.round(atMs) };
}

function sorted(events: PadSongEvent[]): PadSongEvent[] {
  return events.sort((a, b) => a.atMs - b.atMs || a.padId.localeCompare(b.padId));
}

function quarterMs(bpm: number): number {
  return 60000 / bpm;
}

// --- Turkish usûl lessons (turkish bank) -----------------------------------

/** Düm-tek alternation on the beat — the very first darbuka exercise. */
export const DUM_TEK_TEMELI_EVENTS: PadSongEvent[] = (() => {
  const Q = quarterMs(100);
  const events: PadSongEvent[] = [];
  for (let bar = 0; bar < 2; bar++) {
    const o = bar * Q * 4;
    events.push(hit('pad01', o));
    events.push(hit('pad02', o + Q));
    events.push(hit('pad01', o + Q * 2));
    events.push(hit('pad02', o + Q * 3));
  }
  return sorted(events);
})();

/** Düm tek-ka: the "ka" answer lands on the off-beat. */
export const DUM_TEKA_EVENTS: PadSongEvent[] = (() => {
  const Q = quarterMs(100);
  const events: PadSongEvent[] = [];
  for (let bar = 0; bar < 2; bar++) {
    const o = bar * Q * 4;
    events.push(hit('pad01', o));
    events.push(hit('pad02', o + Q));
    events.push(hit('pad03', o + Q * 1.5));
    events.push(hit('pad01', o + Q * 2));
    events.push(hit('pad02', o + Q * 3));
    events.push(hit('pad03', o + Q * 3.5));
  }
  return sorted(events);
})();

/** Çiftetelli skeleton — düm rests, doubled teks answer. */
export const CIFTETELLI_EVENTS: PadSongEvent[] = (() => {
  const Q = quarterMs(96);
  const events: PadSongEvent[] = [];
  for (let bar = 0; bar < 2; bar++) {
    const o = bar * Q * 4;
    events.push(hit('pad01', o));
    events.push(hit('pad02', o + Q * 1.5));
    events.push(hit('pad02', o + Q * 2));
    events.push(hit('pad01', o + Q * 2.5));
    events.push(hit('pad01', o + Q * 3));
    events.push(hit('pad02', o + Q * 3.5));
  }
  return sorted(events);
})();

/** Halay drive on the bendir, zilli maşa answering. */
export const HALAY_EVENTS: PadSongEvent[] = (() => {
  const Q = quarterMs(110);
  const events: PadSongEvent[] = [];
  for (let bar = 0; bar < 2; bar++) {
    const o = bar * Q * 4;
    events.push(hit('pad07', o));
    events.push(hit('pad08', o + Q));
    events.push(hit('pad07', o + Q * 1.5));
    events.push(hit('pad07', o + Q * 2));
    events.push(hit('pad08', o + Q * 3));
    events.push(hit('pad15', o + Q * 3.5));
  }
  return sorted(events);
})();

// 9/8 aksak is 2+2+2+3 eighths, so its stresses fall at eighths 0, 2, 4 and 6
// — not at even thirds. Counting it as an even meter puts the accents in the
// wrong place, which is precisely what stops an usûl sounding like itself.
const AKSAK_9_8_GROUPS = [2, 2, 2, 3];
const aksak98 = createGrid({
  bpm: 120,
  groups: AKSAK_9_8_GROUPS,
  unit: 'eighth',
});

export const AKSAK_9_8_METER: SongMeter = {
  beatMs: aksak98.eighthMs,
  beatsPerBar: 9,
  strongBeats: groupStresses(AKSAK_9_8_GROUPS),
};

/** Roman havası 9/8 (2+2+2+3) — the aksak feel. */
export const ROMAN_9_8_EVENTS: PadSongEvent[] = (() => {
  const E = aksak98.eighthMs;
  const events: PadSongEvent[] = [];
  for (let bar = 0; bar < 2; bar++) {
    events.push(hit('pad01', aksak98.group(bar, 0)));
    events.push(hit('pad02', aksak98.group(bar, 1)));
    events.push(hit('pad01', aksak98.group(bar, 2)));
    events.push(hit('pad02', aksak98.group(bar, 3)));
    if (bar === 1) {
      // The long group's inner eighths — where the aksak lift lives.
      events.push(hit('pad04', aksak98.group(bar, 3, E)));
    }
    events.push(hit('pad02', aksak98.group(bar, 3, E * 2)));
  }
  return sorted(events);
})();

/** 9/8 on spoons — same aksak skeleton, kaşık voicing over düm anchors. */
export const KASIK_9_8_EVENTS: PadSongEvent[] = (() => {
  const E = aksak98.eighthMs;
  const events: PadSongEvent[] = [];
  for (let bar = 0; bar < 2; bar++) {
    events.push(hit('pad01', aksak98.group(bar, 0)));
    events.push(hit('pad13', aksak98.group(bar, 0)));
    events.push(hit('pad13', aksak98.group(bar, 1)));
    events.push(hit('pad01', aksak98.group(bar, 2)));
    events.push(hit('pad13', aksak98.group(bar, 2)));
    events.push(hit('pad13', aksak98.group(bar, 3)));
    events.push(hit('pad14', aksak98.group(bar, 3, E)));
    events.push(hit('pad13', aksak98.group(bar, 3, E * 2)));
  }
  return sorted(events);
})();

/** Slow bendir meditation — düm, wire buzz, tek. */
export const BENDIR_DEM_EVENTS: PadSongEvent[] = (() => {
  const Q = quarterMs(80);
  const events: PadSongEvent[] = [];
  for (let bar = 0; bar < 2; bar++) {
    const o = bar * Q * 4;
    events.push(hit('pad07', o));
    events.push(hit('pad09', o + Q * 1.5));
    events.push(hit('pad08', o + Q * 3));
  }
  return sorted(events);
})();

/** Def groove — hits answered by jingle shakes and a slap. */
export const DEF_SIKIRTISI_EVENTS: PadSongEvent[] = (() => {
  const Q = quarterMs(104);
  const events: PadSongEvent[] = [];
  for (let bar = 0; bar < 2; bar++) {
    const o = bar * Q * 4;
    events.push(hit('pad10', o));
    events.push(hit('pad11', o + Q * 0.5));
    events.push(hit('pad11', o + Q));
    events.push(hit('pad12', o + Q * 1.5));
    events.push(hit('pad10', o + Q * 2));
    events.push(hit('pad11', o + Q * 2.5));
    events.push(hit('pad11', o + Q * 3));
    events.push(hit('pad12', o + Q * 3.5));
  }
  return sorted(events);
})();

// --- Modern groove lessons (drums bank) ------------------------------------

/** Boom-bap: lazy 90 BPM kick placement under steady eighth hats. */
export const HIPHOP_90_EVENTS: PadSongEvent[] = (() => {
  const Q = quarterMs(90);
  const events: PadSongEvent[] = [];
  for (let bar = 0; bar < 2; bar++) {
    const o = bar * Q * 4;
    for (let i = 0; i < 8; i++) {
      events.push(hit('pad03', o + i * (Q / 2)));
    }
    events.push(hit('pad01', o));
    events.push(hit('pad02', o + Q));
    events.push(hit('pad01', o + Q * 1.75));
    events.push(hit('pad01', o + Q * 2.5));
    events.push(hit('pad02', o + Q * 3));
  }
  return sorted(events);
})();

/** Half-time trap: 808 anchor, snare on 3, hat bursts at the bar tail. */
export const TRAP_ROLL_EVENTS: PadSongEvent[] = (() => {
  const Q = quarterMs(70);
  const events: PadSongEvent[] = [];
  for (let bar = 0; bar < 2; bar++) {
    const o = bar * Q * 4;
    for (let i = 0; i < 8; i++) {
      events.push(hit('pad03', o + i * (Q / 2)));
    }
    // 1/16 burst on beat four.
    events.push(hit('pad03', o + Q * 3.25));
    events.push(hit('pad03', o + Q * 3.75));
    events.push(hit('pad10', o));
    if (bar === 1) {
      events.push(hit('pad10', o + Q * 2.75));
    }
    events.push(hit('pad02', o + Q * 2));
    events.push(hit('pad04', o + Q * 1.75));
  }
  return sorted(events);
})();

/** Dembow: four-on-the-floor kick with the tresillo snare answer. */
export const REGGAETON_EVENTS: PadSongEvent[] = (() => {
  const Q = quarterMs(95);
  const events: PadSongEvent[] = [];
  for (let bar = 0; bar < 2; bar++) {
    const o = bar * Q * 4;
    for (let beat = 0; beat < 4; beat++) {
      events.push(hit('pad01', o + beat * Q));
    }
    events.push(hit('pad02', o + Q * 0.75));
    events.push(hit('pad02', o + Q * 1.5));
    events.push(hit('pad02', o + Q * 2.75));
    events.push(hit('pad02', o + Q * 3.5));
  }
  return sorted(events);
})();

/** Funk: sixteenth hats for one bar — endurance and evenness. */
export const FUNK_16_EVENTS: PadSongEvent[] = (() => {
  const Q = quarterMs(100);
  const events: PadSongEvent[] = [];
  for (let i = 0; i < 16; i++) {
    events.push(hit('pad03', i * (Q / 4)));
  }
  events.push(hit('pad01', 0));
  events.push(hit('pad02', Q));
  events.push(hit('pad01', Q * 1.75));
  events.push(hit('pad01', Q * 2.5));
  events.push(hit('pad02', Q * 3));
  return sorted(events);
})();

/** Shuffle: swung ride pairs (triplet feel) over a backbeat. */
export const SWING_SHUFFLE_EVENTS: PadSongEvent[] = (() => {
  const Q = quarterMs(100);
  const swing = Q * (2 / 3);
  const events: PadSongEvent[] = [];
  for (let bar = 0; bar < 2; bar++) {
    const o = bar * Q * 4;
    for (let beat = 0; beat < 4; beat++) {
      events.push(hit('pad08', o + beat * Q));
      events.push(hit('pad08', o + beat * Q + swing));
    }
    events.push(hit('pad01', o));
    events.push(hit('pad02', o + Q));
    events.push(hit('pad01', o + Q * 2));
    events.push(hit('pad02', o + Q * 3));
  }
  return sorted(events);
})();

/** Syncopated breakbeat — kicks and snares off the grid's strong beats. */
export const BREAKBEAT_EVENTS: PadSongEvent[] = (() => {
  const Q = quarterMs(130);
  const events: PadSongEvent[] = [];
  for (let bar = 0; bar < 2; bar++) {
    const o = bar * Q * 4;
    for (let i = 0; i < 8; i++) {
      if (i === 5) {
        continue; // breath before the pickup
      }
      events.push(hit('pad03', o + i * (Q / 2)));
    }
    events.push(hit('pad01', o));
    events.push(hit('pad02', o + Q));
    events.push(hit('pad01', o + Q * 1.5));
    events.push(hit('pad01', o + Q * 2.75));
    events.push(hit('pad02', o + Q * 3));
    events.push(hit('pad02', o + Q * 3.75));
  }
  return sorted(events);
})();

/** One bar of groove, then a half-bar fill down the toms into a crash. */
export const YARIM_BAR_FILL_EVENTS: PadSongEvent[] = (() => {
  const Q = quarterMs(110);
  const events: PadSongEvent[] = [];
  // Bar 1: straight rock.
  for (let i = 0; i < 8; i++) {
    events.push(hit('pad03', i * (Q / 2)));
  }
  events.push(hit('pad01', 0));
  events.push(hit('pad02', Q));
  events.push(hit('pad01', Q * 2));
  events.push(hit('pad02', Q * 3));
  // Bar 2: half groove...
  const o = Q * 4;
  for (let i = 0; i < 4; i++) {
    events.push(hit('pad03', o + i * (Q / 2)));
  }
  events.push(hit('pad01', o));
  events.push(hit('pad02', o + Q));
  // ...then the fill: snare doubles, down the toms, crash on the door.
  events.push(hit('pad02', o + Q * 2));
  events.push(hit('pad02', o + Q * 2.25));
  events.push(hit('pad11', o + Q * 2.5));
  events.push(hit('pad05', o + Q * 2.75));
  events.push(hit('pad09', o + Q * 3));
  events.push(hit('pad09', o + Q * 3.25));
  events.push(hit('pad01', o + Q * 3.5));
  events.push(hit('pad07', o + Q * 3.5));
  return sorted(events);
})();

/** Amen-flavored break — displaced snares under ride eighths. */
export const AMEN_KIRIGI_EVENTS: PadSongEvent[] = (() => {
  const Q = quarterMs(138);
  const events: PadSongEvent[] = [];
  for (let bar = 0; bar < 2; bar++) {
    const o = bar * Q * 4;
    for (let i = 0; i < 8; i++) {
      events.push(hit('pad08', o + i * (Q / 2)));
    }
    events.push(hit('pad01', o));
    events.push(hit('pad01', o + Q * 0.5));
    events.push(hit('pad02', o + Q));
    events.push(hit('pad02', o + Q * (bar === 0 ? 1.75 : 1.5)));
    events.push(hit('pad01', o + Q * 2.5));
    events.push(hit('pad02', o + Q * 3));
    events.push(hit('pad02', o + Q * 3.75));
  }
  return sorted(events);
})();
