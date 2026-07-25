import type { SongRole } from '../../shared/songPerformance';
import { canonInDSong } from '../../piano/songs/canonInD';
import { furEliseSong } from '../../piano/songs/furElise';
import { odeToJoySong } from '../../piano/songs/odeToJoy';
import { turkMarsiSong } from '../../piano/songs/turkMarsi';
import { uskudaraGiderkenSong } from '../../piano/songs/uskudaraGiderken';
import type { ViolinSongDefinition, ViolinSongEvent } from './types';

// 20 violin-iconic tutorial songs. Five melodies come from the ear-approved
// piano catalog — the tune only, since the violin has one bow (all of them
// already sit inside its G3–C#6 range); the rest are fresh transcriptions
// pending ear approval.
//
// Every chart states its note lengths. A bowed note lasts as long as the bow
// travels, so without them a whole note and a sixteenth sound identical and
// repeated pitches slur into one long stroke.

const PITCH_CLASS: Record<string, number> = {
  C: 0,
  'C#': 1,
  Db: 1,
  D: 2,
  'D#': 3,
  Eb: 3,
  E: 4,
  F: 5,
  'F#': 6,
  Gb: 6,
  G: 7,
  'G#': 8,
  Ab: 8,
  A: 9,
  'A#': 10,
  Bb: 10,
  B: 11,
};

/** Highest string whose open pitch fits — lowest position, natural fingering. */
const STRINGS = [
  { id: 'v1', open: 76 },
  { id: 'v2', open: 69 },
  { id: 'v3', open: 62 },
  { id: 'v4', open: 55 },
] as const;

const MIN_MIDI = 55;
const MAX_MIDI = 85;

function midiForNote(note: string): number {
  const octave = Number(note.slice(-1));
  const pitch = PITCH_CLASS[note.slice(0, -1)] ?? 0;
  return Math.max(MIN_MIDI, Math.min(MAX_MIDI, 12 * (octave + 1) + pitch));
}

function soundIdForMidi(midi: number): string {
  for (const string of STRINGS) {
    if (midi >= string.open) {
      return `${string.id}:${midi - string.open}`;
    }
  }
  return 'v4:0';
}

function soundIdForNote(note: string): string {
  return soundIdForMidi(midiForNote(note));
}

/** [note, beats] steps on a fixed pulse; 'R' rests. */
type Step = [string, number?];

/**
 * Fraction of its written value a bow stroke actually sounds. The remainder is
 * the bow change — without it two quarters on one pitch are heard as a single
 * half note.
 */
const DETACHE = 0.9;

function seq(beatMs: number, steps: Step[]): ViolinSongEvent[] {
  let at = 0;
  const events: ViolinSongEvent[] = [];
  for (const [note, beats = 1] of steps) {
    if (note !== 'R') {
      events.push({
        soundId: soundIdForNote(note),
        atMs: Math.round(at),
        durationMs: Math.round(beatMs * beats * DETACHE),
      });
    }
    at += beatMs * beats;
  }
  // Nothing follows the last note, so it takes its full written length.
  const last = events[events.length - 1];
  if (last?.durationMs) {
    last.durationMs = Math.round(last.durationMs / DETACHE);
  }
  return events;
}

type PianoEvent = {
  noteId: string;
  atMs: number;
  durationMs?: number;
  velocity?: number;
  role?: SongRole;
};

/**
 * Port a piano chart to the fingerboard.
 *
 * A violin bows one line at a time: the piano's left hand is dropped rather
 * than turned into extra violin notes, and simultaneous pitches collapse to the
 * top one — an under-voice would only be reachable as a double stop, which an
 * arbitrary interval cannot promise. Written lengths and strengths come across
 * intact; they are the phrasing.
 *
 * `semitones` undoes a transposition the piano chart only carries because its
 * keyboard is two octaves wide. The fingerboard runs G3 to E6 and has no such
 * limit, so a piece moved down to fit the keys would otherwise be bowed in the
 * wrong register — and low on a violin is its dullest register, not its best.
 */
function fromPianoEvents(
  events: PianoEvent[],
  semitones = 0,
): ViolinSongEvent[] {
  const line = events
    .filter((event) => event.role !== 'accompaniment')
    .sort((a, b) => a.atMs - b.atMs);

  const out: ViolinSongEvent[] = [];
  const midis: number[] = [];
  for (const event of line) {
    const midi = midiForNote(event.noteId) + semitones;
    const last = out.length - 1;
    if (last >= 0 && out[last].atMs === event.atMs) {
      if (midi <= midis[last]) {
        continue;
      }
      out.pop();
      midis.pop();
    }
    midis.push(midi);
    out.push({
      soundId: soundIdForMidi(midi),
      atMs: event.atMs,
      ...(event.durationMs !== undefined
        ? { durationMs: event.durationMs }
        : {}),
      ...(event.velocity !== undefined ? { velocity: event.velocity } : {}),
    });
  }
  return out;
}

// ---------------------------------------------------------------------------
// Suzuki opener — Twinkle Twinkle Little Star (A major).
const TWINKLE_BEAT = 500;
const TWINKLE_STAR = seq(TWINKLE_BEAT, [
  ['A4'], ['A4'], ['E5'], ['E5'], ['F#5'], ['F#5'], ['E5', 2],
  ['D5'], ['D5'], ['C#5'], ['C#5'], ['B4'], ['B4'], ['A4', 2],
  ['E5'], ['E5'], ['D5'], ['D5'], ['C#5'], ['C#5'], ['B4', 2],
  ['E5'], ['E5'], ['D5'], ['D5'], ['C#5'], ['C#5'], ['B4', 2],
  ['A4'], ['A4'], ['E5'], ['E5'], ['F#5'], ['F#5'], ['E5', 2],
  ['D5'], ['D5'], ['C#5'], ['C#5'], ['B4'], ['B4'], ['A4', 2],
]);

// Amazing Grace (G major, 3/4).
const AMAZING_GRACE_BEAT = 600;
const AMAZING_GRACE = seq(AMAZING_GRACE_BEAT, [
  ['D4'], ['G4', 2], ['B4', 0.5], ['G4', 0.5], ['B4', 2], ['A4'],
  ['G4', 2], ['E4'], ['D4', 2], ['D4'],
  ['G4', 2], ['B4', 0.5], ['G4', 0.5], ['B4', 2], ['A4'], ['D5', 3],
  ['D5', 2], ['B4', 0.5], ['D5', 0.5], ['B4', 2], ['G4'],
  ['D4', 2], ['E4'], ['G4', 2], ['G4', 0.5], ['E4', 0.5], ['D4', 2], ['D4'],
  ['G4', 2], ['B4', 0.5], ['G4', 0.5], ['B4', 2], ['A4'], ['G4', 3],
]);

// Brahms — Lullaby (Wiegenlied), G major 3/4.
const BRAHMS_BEAT = 550;
const BRAHMS_LULLABY = seq(BRAHMS_BEAT, [
  ['B4'], ['B4'], ['D5', 2], ['B4'], ['B4'], ['D5', 2],
  ['B4'], ['D5'], ['G5'], ['F#5', 2], ['E5'], ['E5'], ['D5', 2],
  ['A4'], ['B4'], ['C5', 2], ['A4'],
  ['A4'], ['B4'], ['C5', 2], ['C5'],
  ['A4'], ['C5'], ['F#5'], ['E5', 2], ['D5'], ['F#5'], ['G5', 2],
  ['D5'], ['B4'], ['G4', 3],
]);

// Bach / Petzold — Minuet in G.
const MINUET_BEAT = 450;
const MINUET_IN_G = seq(MINUET_BEAT, [
  ['D5'], ['G4', 0.5], ['A4', 0.5], ['B4', 0.5], ['C5', 0.5],
  ['D5'], ['G4'], ['G4'],
  ['E5'], ['C5', 0.5], ['D5', 0.5], ['E5', 0.5], ['F#5', 0.5],
  ['G5'], ['G4'], ['G4'],
  ['C5'], ['D5', 0.5], ['C5', 0.5], ['B4', 0.5], ['A4', 0.5],
  ['B4'], ['C5', 0.5], ['B4', 0.5], ['A4', 0.5], ['G4', 0.5],
  ['F#4'], ['G4', 0.5], ['A4', 0.5], ['B4', 0.5], ['G4', 0.5], ['A4', 3],
  ['D5'], ['G4', 0.5], ['A4', 0.5], ['B4', 0.5], ['C5', 0.5],
  ['D5'], ['G4'], ['G4'],
  ['E5'], ['C5', 0.5], ['D5', 0.5], ['E5', 0.5], ['F#5', 0.5],
  ['G5'], ['G4'], ['G4'],
  ['C5'], ['D5', 0.5], ['C5', 0.5], ['B4', 0.5], ['A4', 0.5],
  ['B4'], ['C5', 0.5], ['B4', 0.5], ['A4', 0.5], ['G4', 0.5],
  ['A4'], ['B4', 0.5], ['A4', 0.5], ['G4', 0.5], ['F#4', 0.5], ['G4', 3],
]);

// Vivaldi — Spring (La Primavera) opening ritornello, E major.
const VIVALDI_BEAT = 420;
const VIVALDI_SPRING = seq(VIVALDI_BEAT, [
  ['E5'], ['G#5'], ['G#5'], ['G#5', 0.5], ['F#5', 0.5], ['E5'],
  ['B5', 1.5], ['B5', 0.5], ['A5', 0.5], ['G#5', 0.5], ['F#5'], ['E5'],
  ['E5'], ['G#5'], ['G#5'], ['G#5', 0.5], ['F#5', 0.5], ['E5'],
  ['B5', 1.5], ['B5', 0.5], ['A5', 0.5], ['G#5', 0.5], ['F#5'], ['E5'],
  ['B5'], ['A5', 0.5], ['G#5', 0.5], ['A5'], ['F#5'],
  ['G#5'], ['F#5', 0.5], ['E5', 0.5], ['E5', 2],
]);

// Mozart — Eine kleine Nachtmusik, opening theme.
const EINE_KLEINE_BEAT = 400;
const EINE_KLEINE = seq(EINE_KLEINE_BEAT, [
  ['G4'], ['D4'], ['G4'], ['D4'],
  ['G4', 0.5], ['D4', 0.5], ['G4', 0.5], ['B4', 0.5], ['D5', 2],
  ['C5'], ['A4'], ['C5'], ['A4'],
  ['C5', 0.5], ['A4', 0.5], ['F#4', 0.5], ['A4', 0.5], ['D4', 2],
  ['G4'], ['D4'], ['G4'], ['D4'],
  ['G4', 0.5], ['D4', 0.5], ['G4', 0.5], ['B4', 0.5], ['D5', 2],
  ['C5'], ['A4'], ['C5'], ['A4'],
  ['C5', 0.5], ['A4', 0.5], ['F#4', 0.5], ['A4', 0.5], ['G4', 2],
]);

// Greensleeves (E minor, 6/8 feel).
const GREENSLEEVES_BEAT = 420;
const GREENSLEEVES = seq(GREENSLEEVES_BEAT, [
  ['E4'], ['G4', 2], ['A4'], ['B4', 1.5], ['C5', 0.5], ['B4'],
  ['A4', 2], ['F#4'], ['D4', 1.5], ['E4', 0.5], ['F#4'],
  ['G4', 2], ['E4'], ['E4', 1.5], ['D#4', 0.5], ['E4'],
  ['F#4', 2], ['D#4'], ['B3', 3],
  ['E4'], ['G4', 2], ['A4'], ['B4', 1.5], ['C5', 0.5], ['B4'],
  ['A4', 2], ['F#4'], ['D4', 1.5], ['E4', 0.5], ['F#4'],
  ['G4', 1.5], ['F#4', 0.5], ['E4'], ['D#4', 1.5], ['C#4', 0.5], ['D#4'],
  ['E4', 3],
]);

// Tchaikovsky — Swan Lake theme (A minor).
const SWAN_LAKE_BEAT = 480;
const SWAN_LAKE = seq(SWAN_LAKE_BEAT, [
  ['E5', 2], ['A4', 0.5], ['B4', 0.5], ['C5', 0.5], ['D5', 0.5],
  ['E5', 2], ['A4', 0.5], ['B4', 0.5], ['C5', 0.5], ['D5', 0.5],
  ['E5'], ['F5'], ['E5'], ['D5'], ['C5'], ['B4'],
  ['E5'], ['F5'], ['E5'], ['D5'], ['C5'], ['B4'],
  ['E5', 2], ['A4', 0.5], ['B4', 0.5], ['C5', 0.5], ['D5', 0.5],
  ['E5'], ['C5'], ['A4', 3],
]);

// Bizet — Habanera (Carmen), chromatic descent.
const HABANERA_BEAT = 480;
const HABANERA = seq(HABANERA_BEAT, [
  ['D5'], ['C#5'], ['C5'], ['B4', 0.5], ['B4', 0.5],
  ['A#4', 0.5], ['B4', 0.5], ['A4'], ['G#4', 0.5], ['G4', 0.5],
  ['F#4'], ['G4', 0.5], ['A4', 0.5], ['F#4'], ['E4', 2],
  ['D5'], ['C#5'], ['C5'], ['B4', 0.5], ['B4', 0.5],
  ['A#4', 0.5], ['B4', 0.5], ['A4'], ['G#4', 0.5], ['G4', 0.5],
  ['F#4'], ['G4', 0.5], ['F#4', 0.5], ['E4', 2],
]);

// Monti — Czardas, largo section (D minor).
const CZARDAS_BEAT = 550;
const CZARDAS = seq(CZARDAS_BEAT, [
  ['A4'], ['D5', 1.5], ['E5', 0.5], ['F5'], ['E5', 0.5], ['D5', 0.5],
  ['C#5', 1.5], ['D5', 0.5], ['E5'], ['A4'],
  ['E5', 1.5], ['F5', 0.5], ['G5'], ['F5', 0.5], ['E5', 0.5], ['D5', 2],
  ['A4'], ['D5', 1.5], ['E5', 0.5], ['F5'], ['E5', 0.5], ['D5', 0.5],
  ['C#5', 1.5], ['D5', 0.5], ['E5'],
  ['F5', 0.5], ['E5', 0.5], ['D5', 0.5], ['C#5', 0.5], ['D5', 2],
]);

// Hava Nagila (E freygish) — klezmer violin staple.
const HAVA_NAGILA_BEAT = 400;
const HAVA_NAGILA = seq(HAVA_NAGILA_BEAT, [
  ['E4', 1.5], ['G#4', 0.5], ['A4'], ['B4'],
  ['B4', 0.5], ['C5', 0.5], ['B4', 0.5], ['A4', 0.5], ['B4', 2],
  ['E4', 1.5], ['G#4', 0.5], ['A4'], ['B4'],
  ['B4', 0.5], ['C5', 0.5], ['B4', 0.5], ['A4', 0.5], ['B4', 2],
  ['B4', 0.5], ['B4', 0.5], ['B4'], ['C5', 0.5], ['B4', 0.5],
  ['A4', 0.5], ['G#4', 0.5], ['A4'], ['F4', 0.5], ['F4', 0.5],
  ['F4'], ['G#4', 0.5], ['F4', 0.5], ['E4', 2],
]);

// Bella Ciao (E minor).
const BELLA_CIAO_BEAT = 400;
const BELLA_CIAO = seq(BELLA_CIAO_BEAT, [
  ['E4', 0.5], ['A4', 0.5], ['B4', 0.5], ['C5', 1], ['A4', 1.5],
  ['E4', 0.5], ['A4', 0.5], ['B4', 0.5], ['C5', 1], ['A4', 1.5],
  ['E4', 0.5], ['A4', 0.5], ['B4', 0.5], ['C5', 1],
  ['B4', 0.5], ['A4', 0.5], ['C5', 1], ['B4', 0.5], ['A4', 0.5],
  ['E5', 1], ['E5', 1], ['E5', 1],
  ['E5', 0.5], ['D5', 0.5], ['E5', 0.5], ['F5', 1], ['F5', 1],
  ['F5', 0.5], ['E5', 0.5], ['D5', 0.5], ['F5', 1], ['E5', 1],
  ['E5', 0.5], ['D5', 0.5], ['C5', 0.5], ['E5', 1], ['D5', 1],
  ['D5', 0.5], ['C5', 0.5], ['B4', 1], ['C5', 0.5], ['D5', 0.5],
  ['E5', 1], ['C5', 1], ['B4', 1], ['A4', 2],
]);

// Sarı Gelin (Anadolu halk ezgisi, A minor çevresinde).
const SARI_GELIN_BEAT = 500;
const SARI_GELIN = seq(SARI_GELIN_BEAT, [
  ['A4'], ['B4', 0.5], ['C5', 0.5], ['D5'], ['C5', 0.5], ['B4', 0.5],
  ['C5'], ['B4', 0.5], ['A4', 0.5], ['G4', 2],
  ['A4'], ['B4', 0.5], ['C5', 0.5], ['D5'], ['C5', 0.5], ['B4', 0.5],
  ['C5'], ['B4', 0.5], ['A4', 0.5], ['A4', 2],
  ['E5'], ['D5', 0.5], ['C5', 0.5], ['D5'], ['C5', 0.5], ['B4', 0.5],
  ['C5'], ['B4', 0.5], ['A4', 0.5], ['G4', 2],
  ['A4'], ['G4', 0.5], ['A4', 0.5], ['B4'], ['A4', 0.5], ['G4', 0.5],
  ['A4', 3],
]);

// Çanakkale Türküsü (A minor).
const CANAKKALE_BEAT = 480;
const CANAKKALE = seq(CANAKKALE_BEAT, [
  ['A4', 0.5], ['A4', 0.5], ['B4', 0.5], ['C5', 0.5],
  ['C5', 0.5], ['B4', 0.5], ['A4', 0.5], ['B4', 0.5], ['G4'], ['A4', 2],
  ['A4', 0.5], ['A4', 0.5], ['B4', 0.5], ['C5', 0.5],
  ['C5', 0.5], ['B4', 0.5], ['A4', 0.5], ['B4', 0.5], ['G4'], ['A4', 2],
  ['E5'], ['E5', 0.5], ['D5', 0.5], ['C5'], ['B4', 0.5], ['A4', 0.5],
  ['B4'], ['C5', 0.5], ['B4', 0.5], ['A4'], ['G4'], ['A4', 3],
]);

// Ramin Djawadi — Game of Thrones main theme (C minor).
const GOT_BEAT = 400;
const GAME_OF_THRONES = seq(GOT_BEAT, [
  ['G4', 1.5], ['C4', 1.5], ['Eb4', 0.5], ['F4', 0.5],
  ['G4', 1.5], ['C4', 1.5], ['Eb4', 0.5], ['F4', 0.5],
  ['G4', 1.5], ['C4', 1.5], ['E4', 0.5], ['F4', 0.5],
  ['G4', 1.5], ['C4', 1.5], ['E4', 0.5], ['F4', 0.5],
  ['D5', 1.5], ['G4', 1.5], ['Bb4', 0.5], ['C5', 0.5],
  ['D5', 1.5], ['G4', 1.5], ['Bb4', 0.5], ['C5', 0.5],
  ['C5'], ['Bb4'], ['G4', 2],
]);

// Pulses of the charts ported from the piano catalog, taken from those files'
// own tempo constants.
const ODE_TO_JOY_BEAT = 600;
const CANON_BEAT = 500;
/** Für Elise is 3/8: the eighth is the beat, after a two-sixteenth pickup. */
const FUR_ELISE_BEAT = 420;
const TURK_MARSI_BEAT = 440;
const USKUDARA_BEAT = 520;

export const VIOLIN_EXTRA_SONGS: ViolinSongDefinition[] = [
  {
    id: 'twinkle-star',
    title: 'Twinkle Twinkle Little Star',
    artist: 'Anonim',
    difficulty: 'easy',
    events: TWINKLE_STAR,
    partialCount: 14,
    meter: { beatMs: TWINKLE_BEAT, beatsPerBar: 4 },
  },
  {
    id: 'ode-to-joy',
    title: 'Ode to Joy',
    artist: 'Ludwig van Beethoven',
    difficulty: 'easy',
    events: fromPianoEvents(odeToJoySong.events),
    partialCount: 15,
    meter: { beatMs: ODE_TO_JOY_BEAT, beatsPerBar: 4 },
  },
  {
    id: 'amazing-grace',
    title: 'Amazing Grace',
    artist: 'Anonim',
    difficulty: 'easy',
    events: AMAZING_GRACE,
    partialCount: 10,
    meter: {
      beatMs: AMAZING_GRACE_BEAT,
      beatsPerBar: 3,
      // One-beat pickup: the tune's first downbeat is the second note.
      barStartMs: AMAZING_GRACE_BEAT,
    },
  },
  {
    id: 'brahms-lullaby',
    title: 'Lullaby (Wiegenlied)',
    artist: 'Johannes Brahms',
    difficulty: 'easy',
    events: BRAHMS_LULLABY,
    partialCount: 13,
    meter: {
      beatMs: BRAHMS_BEAT,
      beatsPerBar: 3,
      // Two-beat pickup before the first held note.
      barStartMs: BRAHMS_BEAT * 2,
    },
  },
  {
    id: 'minuet-in-g',
    title: 'Minuet in G',
    artist: 'J. S. Bach / Petzold',
    difficulty: 'medium',
    events: MINUET_IN_G,
    partialCount: 16,
    meter: { beatMs: MINUET_BEAT, beatsPerBar: 3 },
  },
  {
    id: 'canon-in-d',
    title: 'Canon in D',
    artist: 'Johann Pachelbel',
    difficulty: 'medium',
    events: fromPianoEvents(canonInDSong.events),
    partialCount: 16,
    meter: { beatMs: CANON_BEAT, beatsPerBar: 4 },
  },
  {
    id: 'vivaldi-spring',
    title: 'Spring (La Primavera)',
    artist: 'Antonio Vivaldi',
    difficulty: 'hard',
    events: VIVALDI_SPRING,
    partialCount: 12,
    meter: {
      beatMs: VIVALDI_BEAT,
      beatsPerBar: 4,
      barStartMs: VIVALDI_BEAT,
    },
  },
  {
    id: 'eine-kleine',
    title: 'Eine kleine Nachtmusik',
    artist: 'Wolfgang Amadeus Mozart',
    difficulty: 'medium',
    events: EINE_KLEINE,
    partialCount: 9,
    meter: { beatMs: EINE_KLEINE_BEAT, beatsPerBar: 4 },
  },
  {
    id: 'fur-elise',
    title: 'Für Elise',
    artist: 'Ludwig van Beethoven',
    difficulty: 'medium',
    events: fromPianoEvents(furEliseSong.events),
    partialCount: 13,
    meter: {
      beatMs: FUR_ELISE_BEAT,
      beatsPerBar: 3,
      barStartMs: FUR_ELISE_BEAT,
    },
  },
  {
    id: 'greensleeves',
    title: 'Greensleeves',
    artist: 'Anonim',
    difficulty: 'medium',
    events: GREENSLEEVES,
    partialCount: 11,
    meter: {
      beatMs: GREENSLEEVES_BEAT,
      beatsPerBar: 6,
      barStartMs: GREENSLEEVES_BEAT,
    },
  },
  {
    id: 'swan-lake',
    title: 'Swan Lake',
    artist: 'P. I. Tchaikovsky',
    difficulty: 'medium',
    events: SWAN_LAKE,
    partialCount: 10,
    meter: { beatMs: SWAN_LAKE_BEAT, beatsPerBar: 4 },
  },
  {
    id: 'habanera',
    title: 'Habanera (Carmen)',
    artist: 'Georges Bizet',
    difficulty: 'medium',
    events: HABANERA,
    partialCount: 15,
    meter: { beatMs: HABANERA_BEAT, beatsPerBar: 4 },
  },
  {
    id: 'czardas',
    title: 'Czardas',
    artist: 'Vittorio Monti',
    difficulty: 'hard',
    events: CZARDAS,
    partialCount: 10,
    meter: { beatMs: CZARDAS_BEAT, beatsPerBar: 4 },
  },
  {
    id: 'hava-nagila',
    title: 'Hava Nagila',
    artist: 'Anonim',
    difficulty: 'medium',
    events: HAVA_NAGILA,
    partialCount: 9,
    meter: { beatMs: HAVA_NAGILA_BEAT, beatsPerBar: 4 },
  },
  {
    id: 'bella-ciao',
    title: 'Bella Ciao',
    artist: 'Anonim',
    difficulty: 'medium',
    events: BELLA_CIAO,
    partialCount: 10,
    meter: {
      beatMs: BELLA_CIAO_BEAT,
      beatsPerBar: 4,
      barStartMs: BELLA_CIAO_BEAT / 2,
    },
  },
  {
    id: 'turk-marsi',
    title: 'Türk Marşı',
    artist: 'Wolfgang Amadeus Mozart',
    difficulty: 'hard',
    // Back up to Mozart's A minor. The piano plays it a fourth lower only
    // because its top key stops one note under the theme's peak.
    events: fromPianoEvents(turkMarsiSong.events, 5),
    partialCount: 24,
    meter: { beatMs: TURK_MARSI_BEAT, beatsPerBar: 2 },
  },
  {
    id: 'uskudara-giderken',
    title: "Üsküdar'a Giderken",
    artist: 'Anonim',
    difficulty: 'medium',
    events: fromPianoEvents(uskudaraGiderkenSong.events),
    partialCount: 15,
    meter: { beatMs: USKUDARA_BEAT, beatsPerBar: 2 },
  },
  {
    id: 'sari-gelin',
    title: 'Sarı Gelin',
    artist: 'Anonim',
    difficulty: 'medium',
    events: SARI_GELIN,
    partialCount: 10,
    meter: { beatMs: SARI_GELIN_BEAT, beatsPerBar: 4 },
  },
  {
    id: 'canakkale-turkusu',
    title: 'Çanakkale Türküsü',
    artist: 'Anonim',
    difficulty: 'medium',
    events: CANAKKALE,
    partialCount: 10,
    meter: { beatMs: CANAKKALE_BEAT, beatsPerBar: 4 },
  },
  {
    id: 'game-of-thrones',
    title: 'Game of Thrones',
    artist: 'Ramin Djawadi',
    difficulty: 'medium',
    events: GAME_OF_THRONES,
    partialCount: 8,
    meter: { beatMs: GOT_BEAT, beatsPerBar: 4 },
  },
];
