import { canonInDSong } from '../../piano/songs/canonInD';
import { furEliseSong } from '../../piano/songs/furElise';
import { odeToJoySong } from '../../piano/songs/odeToJoy';
import { turkMarsiSong } from '../../piano/songs/turkMarsi';
import { uskudaraGiderkenSong } from '../../piano/songs/uskudaraGiderken';
import type { ViolinSongDefinition, ViolinSongEvent } from './types';

// 20 violin-iconic tutorial songs. Five melodies are ported 1:1 from the
// ear-approved piano catalog (all already sit inside the violin's G3–C#6
// range); the rest are fresh transcriptions pending ear approval.

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

function soundIdForNote(note: string): string {
  const octave = Number(note.slice(-1));
  const pitch = PITCH_CLASS[note.slice(0, -1)] ?? 0;
  const midi = Math.max(MIN_MIDI, Math.min(MAX_MIDI, 12 * (octave + 1) + pitch));
  for (const string of STRINGS) {
    if (midi >= string.open) {
      return `${string.id}:${midi - string.open}`;
    }
  }
  return 'v4:0';
}

/** [note, beats] steps on a fixed pulse; 'R' rests. */
type Step = [string, number?];

function seq(beatMs: number, steps: Step[]): ViolinSongEvent[] {
  let at = 0;
  const events: ViolinSongEvent[] = [];
  for (const [note, beats = 1] of steps) {
    if (note !== 'R') {
      events.push({ soundId: soundIdForNote(note), atMs: Math.round(at) });
    }
    at += beatMs * beats;
  }
  return events;
}

function fromPianoEvents(
  events: { noteId: string; atMs: number }[],
): ViolinSongEvent[] {
  return events
    .map(({ noteId, atMs }) => ({ soundId: soundIdForNote(noteId), atMs }))
    .sort((a, b) => a.atMs - b.atMs);
}

// ---------------------------------------------------------------------------
// Suzuki opener — Twinkle Twinkle Little Star (A major).
const TWINKLE_STAR = seq(500, [
  ['A4'], ['A4'], ['E5'], ['E5'], ['F#5'], ['F#5'], ['E5', 2],
  ['D5'], ['D5'], ['C#5'], ['C#5'], ['B4'], ['B4'], ['A4', 2],
  ['E5'], ['E5'], ['D5'], ['D5'], ['C#5'], ['C#5'], ['B4', 2],
  ['E5'], ['E5'], ['D5'], ['D5'], ['C#5'], ['C#5'], ['B4', 2],
  ['A4'], ['A4'], ['E5'], ['E5'], ['F#5'], ['F#5'], ['E5', 2],
  ['D5'], ['D5'], ['C#5'], ['C#5'], ['B4'], ['B4'], ['A4', 2],
]);

// Amazing Grace (G major, 3/4).
const AMAZING_GRACE = seq(600, [
  ['D4'], ['G4', 2], ['B4', 0.5], ['G4', 0.5], ['B4', 2], ['A4'],
  ['G4', 2], ['E4'], ['D4', 2], ['D4'],
  ['G4', 2], ['B4', 0.5], ['G4', 0.5], ['B4', 2], ['A4'], ['D5', 3],
  ['D5', 2], ['B4', 0.5], ['D5', 0.5], ['B4', 2], ['G4'],
  ['D4', 2], ['E4'], ['G4', 2], ['G4', 0.5], ['E4', 0.5], ['D4', 2], ['D4'],
  ['G4', 2], ['B4', 0.5], ['G4', 0.5], ['B4', 2], ['A4'], ['G4', 3],
]);

// Brahms — Lullaby (Wiegenlied), G major 3/4.
const BRAHMS_LULLABY = seq(550, [
  ['B4'], ['B4'], ['D5', 2], ['B4'], ['B4'], ['D5', 2],
  ['B4'], ['D5'], ['G5'], ['F#5', 2], ['E5'], ['E5'], ['D5', 2],
  ['A4'], ['B4'], ['C5', 2], ['A4'],
  ['A4'], ['B4'], ['C5', 2], ['C5'],
  ['A4'], ['C5'], ['F#5'], ['E5', 2], ['D5'], ['F#5'], ['G5', 2],
  ['D5'], ['B4'], ['G4', 3],
]);

// Bach / Petzold — Minuet in G.
const MINUET_IN_G = seq(450, [
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
const VIVALDI_SPRING = seq(420, [
  ['E5'], ['G#5'], ['G#5'], ['G#5', 0.5], ['F#5', 0.5], ['E5'],
  ['B5', 1.5], ['B5', 0.5], ['A5', 0.5], ['G#5', 0.5], ['F#5'], ['E5'],
  ['E5'], ['G#5'], ['G#5'], ['G#5', 0.5], ['F#5', 0.5], ['E5'],
  ['B5', 1.5], ['B5', 0.5], ['A5', 0.5], ['G#5', 0.5], ['F#5'], ['E5'],
  ['B5'], ['A5', 0.5], ['G#5', 0.5], ['A5'], ['F#5'],
  ['G#5'], ['F#5', 0.5], ['E5', 0.5], ['E5', 2],
]);

// Mozart — Eine kleine Nachtmusik, opening theme.
const EINE_KLEINE = seq(400, [
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
const GREENSLEEVES = seq(420, [
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
const SWAN_LAKE = seq(480, [
  ['E5', 2], ['A4', 0.5], ['B4', 0.5], ['C5', 0.5], ['D5', 0.5],
  ['E5', 2], ['A4', 0.5], ['B4', 0.5], ['C5', 0.5], ['D5', 0.5],
  ['E5'], ['F5'], ['E5'], ['D5'], ['C5'], ['B4'],
  ['E5'], ['F5'], ['E5'], ['D5'], ['C5'], ['B4'],
  ['E5', 2], ['A4', 0.5], ['B4', 0.5], ['C5', 0.5], ['D5', 0.5],
  ['E5'], ['C5'], ['A4', 3],
]);

// Bizet — Habanera (Carmen), chromatic descent.
const HABANERA = seq(480, [
  ['D5'], ['C#5'], ['C5'], ['B4', 0.5], ['B4', 0.5],
  ['A#4', 0.5], ['B4', 0.5], ['A4'], ['G#4', 0.5], ['G4', 0.5],
  ['F#4'], ['G4', 0.5], ['A4', 0.5], ['F#4'], ['E4', 2],
  ['D5'], ['C#5'], ['C5'], ['B4', 0.5], ['B4', 0.5],
  ['A#4', 0.5], ['B4', 0.5], ['A4'], ['G#4', 0.5], ['G4', 0.5],
  ['F#4'], ['G4', 0.5], ['F#4', 0.5], ['E4', 2],
]);

// Monti — Czardas, largo section (D minor).
const CZARDAS = seq(550, [
  ['A4'], ['D5', 1.5], ['E5', 0.5], ['F5'], ['E5', 0.5], ['D5', 0.5],
  ['C#5', 1.5], ['D5', 0.5], ['E5'], ['A4'],
  ['E5', 1.5], ['F5', 0.5], ['G5'], ['F5', 0.5], ['E5', 0.5], ['D5', 2],
  ['A4'], ['D5', 1.5], ['E5', 0.5], ['F5'], ['E5', 0.5], ['D5', 0.5],
  ['C#5', 1.5], ['D5', 0.5], ['E5'],
  ['F5', 0.5], ['E5', 0.5], ['D5', 0.5], ['C#5', 0.5], ['D5', 2],
]);

// Hava Nagila (E freygish) — klezmer violin staple.
const HAVA_NAGILA = seq(400, [
  ['E4', 1.5], ['G#4', 0.5], ['A4'], ['B4'],
  ['B4', 0.5], ['C5', 0.5], ['B4', 0.5], ['A4', 0.5], ['B4', 2],
  ['E4', 1.5], ['G#4', 0.5], ['A4'], ['B4'],
  ['B4', 0.5], ['C5', 0.5], ['B4', 0.5], ['A4', 0.5], ['B4', 2],
  ['B4', 0.5], ['B4', 0.5], ['B4'], ['C5', 0.5], ['B4', 0.5],
  ['A4', 0.5], ['G#4', 0.5], ['A4'], ['F4', 0.5], ['F4', 0.5],
  ['F4'], ['G#4', 0.5], ['F4', 0.5], ['E4', 2],
]);

// Bella Ciao (E minor).
const BELLA_CIAO = seq(400, [
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
const SARI_GELIN = seq(500, [
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
const CANAKKALE = seq(480, [
  ['A4', 0.5], ['A4', 0.5], ['B4', 0.5], ['C5', 0.5],
  ['C5', 0.5], ['B4', 0.5], ['A4', 0.5], ['B4', 0.5], ['G4'], ['A4', 2],
  ['A4', 0.5], ['A4', 0.5], ['B4', 0.5], ['C5', 0.5],
  ['C5', 0.5], ['B4', 0.5], ['A4', 0.5], ['B4', 0.5], ['G4'], ['A4', 2],
  ['E5'], ['E5', 0.5], ['D5', 0.5], ['C5'], ['B4', 0.5], ['A4', 0.5],
  ['B4'], ['C5', 0.5], ['B4', 0.5], ['A4'], ['G4'], ['A4', 3],
]);

// Ramin Djawadi — Game of Thrones main theme (C minor).
const GAME_OF_THRONES = seq(400, [
  ['G4', 1.5], ['C4', 1.5], ['Eb4', 0.5], ['F4', 0.5],
  ['G4', 1.5], ['C4', 1.5], ['Eb4', 0.5], ['F4', 0.5],
  ['G4', 1.5], ['C4', 1.5], ['E4', 0.5], ['F4', 0.5],
  ['G4', 1.5], ['C4', 1.5], ['E4', 0.5], ['F4', 0.5],
  ['D5', 1.5], ['G4', 1.5], ['Bb4', 0.5], ['C5', 0.5],
  ['D5', 1.5], ['G4', 1.5], ['Bb4', 0.5], ['C5', 0.5],
  ['C5'], ['Bb4'], ['G4', 2],
]);

export const VIOLIN_EXTRA_SONGS: ViolinSongDefinition[] = [
  {
    id: 'twinkle-star',
    title: 'Twinkle Twinkle Little Star',
    artist: 'Anonim',
    difficulty: 'easy',
    events: TWINKLE_STAR,
    partialCount: 14,
  },
  {
    id: 'ode-to-joy',
    title: 'Ode to Joy',
    artist: 'Ludwig van Beethoven',
    difficulty: 'easy',
    events: fromPianoEvents(odeToJoySong.events),
    partialCount: 15,
  },
  {
    id: 'amazing-grace',
    title: 'Amazing Grace',
    artist: 'Anonim',
    difficulty: 'easy',
    events: AMAZING_GRACE,
    partialCount: 10,
  },
  {
    id: 'brahms-lullaby',
    title: 'Lullaby (Wiegenlied)',
    artist: 'Johannes Brahms',
    difficulty: 'easy',
    events: BRAHMS_LULLABY,
    partialCount: 13,
  },
  {
    id: 'minuet-in-g',
    title: 'Minuet in G',
    artist: 'J. S. Bach / Petzold',
    difficulty: 'medium',
    events: MINUET_IN_G,
    partialCount: 16,
  },
  {
    id: 'canon-in-d',
    title: 'Canon in D',
    artist: 'Johann Pachelbel',
    difficulty: 'medium',
    events: fromPianoEvents(canonInDSong.events),
    partialCount: 16,
  },
  {
    id: 'vivaldi-spring',
    title: 'Spring (La Primavera)',
    artist: 'Antonio Vivaldi',
    difficulty: 'hard',
    events: VIVALDI_SPRING,
    partialCount: 12,
  },
  {
    id: 'eine-kleine',
    title: 'Eine kleine Nachtmusik',
    artist: 'Wolfgang Amadeus Mozart',
    difficulty: 'medium',
    events: EINE_KLEINE,
    partialCount: 9,
  },
  {
    id: 'fur-elise',
    title: 'Für Elise',
    artist: 'Ludwig van Beethoven',
    difficulty: 'medium',
    events: fromPianoEvents(furEliseSong.events),
    partialCount: 13,
  },
  {
    id: 'greensleeves',
    title: 'Greensleeves',
    artist: 'Anonim',
    difficulty: 'medium',
    events: GREENSLEEVES,
    partialCount: 11,
  },
  {
    id: 'swan-lake',
    title: 'Swan Lake',
    artist: 'P. I. Tchaikovsky',
    difficulty: 'medium',
    events: SWAN_LAKE,
    partialCount: 10,
  },
  {
    id: 'habanera',
    title: 'Habanera (Carmen)',
    artist: 'Georges Bizet',
    difficulty: 'medium',
    events: HABANERA,
    partialCount: 15,
  },
  {
    id: 'czardas',
    title: 'Czardas',
    artist: 'Vittorio Monti',
    difficulty: 'hard',
    events: CZARDAS,
    partialCount: 10,
  },
  {
    id: 'hava-nagila',
    title: 'Hava Nagila',
    artist: 'Anonim',
    difficulty: 'medium',
    events: HAVA_NAGILA,
    partialCount: 9,
  },
  {
    id: 'bella-ciao',
    title: 'Bella Ciao',
    artist: 'Anonim',
    difficulty: 'medium',
    events: BELLA_CIAO,
    partialCount: 10,
  },
  {
    id: 'turk-marsi',
    title: 'Türk Marşı',
    artist: 'Wolfgang Amadeus Mozart',
    difficulty: 'hard',
    events: fromPianoEvents(turkMarsiSong.events),
    partialCount: 24,
  },
  {
    id: 'uskudara-giderken',
    title: "Üsküdar'a Giderken",
    artist: 'Anonim',
    difficulty: 'medium',
    events: fromPianoEvents(uskudaraGiderkenSong.events),
    partialCount: 15,
  },
  {
    id: 'sari-gelin',
    title: 'Sarı Gelin',
    artist: 'Anonim',
    difficulty: 'medium',
    events: SARI_GELIN,
    partialCount: 10,
  },
  {
    id: 'canakkale-turkusu',
    title: 'Çanakkale Türküsü',
    artist: 'Anonim',
    difficulty: 'medium',
    events: CANAKKALE,
    partialCount: 10,
  },
  {
    id: 'game-of-thrones',
    title: 'Game of Thrones',
    artist: 'Ramin Djawadi',
    difficulty: 'medium',
    events: GAME_OF_THRONES,
    partialCount: 8,
  },
];
