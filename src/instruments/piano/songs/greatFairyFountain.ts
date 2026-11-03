import type { NoteId } from '../pianoNotes';
import type { SongDefinition, SongEvent } from './types';

// Koji Kondo — "Great Fairy's Fountain" (The Legend of Zelda). A BioBand
// arrangement rather than a transcription of the score: harp-style arpeggios
// laid over the theme's harmony — D minor, about 78 BPM, the bass stepping
// down Bb–A–G under G minor, F and E half-diminished before the turn to A7 —
// which is what the ear recognises in it: the shimmer over a falling bass.
//
// Each bar arpeggiates its chord up through five tones and back down, eighth
// notes on the 24 keys (C4–B5). That is the line the player plays; the bass is
// accompaniment, written on the keyboard and sounded an octave down.
// Quarter note ≈ 770 ms (78 BPM).
const Q = 770;
const E = Q / 2;
const BAR = 4 * Q;

type Ev = SongEvent;

type Chord = {
  /** Five chord tones, low to high, all inside C4–B5. */
  tones: [NoteId, NoteId, NoteId, NoteId, NoteId];
  /** Bass root, written on the keyboard; sounded an octave down. */
  bass: NoteId;
  /** A second bass note on beat 3 — the fifth, or the root again. */
  bassBeat3: NoteId;
};

const G_MINOR_ADD9: Chord = {
  tones: ['Bb4', 'D5', 'G5', 'A5', 'Bb5'],
  bass: 'Bb4',
  bassBeat3: 'G4',
};
const G_MINOR_7: Chord = {
  tones: ['Bb4', 'D5', 'F5', 'G5', 'Bb5'],
  bass: 'Bb4',
  bassBeat3: 'D4',
};
const F_MAJOR_ADD9: Chord = {
  tones: ['A4', 'C5', 'F5', 'G5', 'A5'],
  bass: 'A4',
  bassBeat3: 'F4',
};
const E_HALF_DIMINISHED: Chord = {
  tones: ['G4', 'Bb4', 'D5', 'E5', 'G5'],
  bass: 'G4',
  bassBeat3: 'E4',
};
const A_DOMINANT_7: Chord = {
  tones: ['A4', 'Db5', 'E5', 'G5', 'A5'],
  bass: 'A4',
  bassBeat3: 'E4',
};
const D_MINOR_ADD9: Chord = {
  tones: ['A4', 'D5', 'E5', 'F5', 'A5'],
  bass: 'D4',
  bassBeat3: 'A4',
};
const B_FLAT_MAJOR_7: Chord = {
  tones: ['Bb4', 'D5', 'F5', 'A5', 'Bb5'],
  bass: 'Bb4',
  bassBeat3: 'F4',
};
const A_SUS4: Chord = {
  tones: ['A4', 'D5', 'E5', 'A5', 'B5'],
  bass: 'A4',
  bassBeat3: 'E4',
};

/** Up through the five tones and back down: 0-1-2-3-4-3-2-1. */
const ARPEGGIO_SHAPE = [0, 1, 2, 3, 4, 3, 2, 1] as const;

function arpeggioBar(startMs: number, chord: Chord): Ev[] {
  return ARPEGGIO_SHAPE.map((toneIndex, i) => ({
    noteId: chord.tones[toneIndex],
    atMs: startMs + i * E,
    // Each note rings into the next, the way a harp string is left to sound.
    durationMs: 2 * E,
    // The peak of each wave a touch stronger, the fall softer.
    velocity: toneIndex === 4 ? 0.62 : i < 4 ? 0.5 : 0.42,
  }));
}

function bassBar(startMs: number, chord: Chord): Ev[] {
  return [
    {
      noteId: chord.bass,
      atMs: startMs,
      durationMs: 2 * Q,
      velocity: 0.55,
      role: 'accompaniment' as const,
      transpose: -12,
    },
    {
      noteId: chord.bassBeat3,
      atMs: startMs + 2 * Q,
      durationMs: 2 * Q,
      velocity: 0.45,
      role: 'accompaniment' as const,
      transpose: -12,
    },
  ];
}

/**
 * Two eight-bar phrases. The first falls to the dominant and opens out on
 * D minor; the second takes the same descent and closes on it.
 */
const PHRASES: Chord[] = [
  G_MINOR_ADD9,
  G_MINOR_7,
  F_MAJOR_ADD9,
  E_HALF_DIMINISHED,
  A_DOMINANT_7,
  D_MINOR_ADD9,
  B_FLAT_MAJOR_7,
  A_DOMINANT_7,

  G_MINOR_ADD9,
  G_MINOR_7,
  F_MAJOR_ADD9,
  E_HALF_DIMINISHED,
  B_FLAT_MAJOR_7,
  A_SUS4,
  A_DOMINANT_7,
];

/** Final bar: a rising D minor arpeggio that lands and holds on D. */
function cadenceBar(startMs: number): Ev[] {
  const rise: NoteId[] = ['D4', 'F4', 'A4', 'D5'];
  return [
    ...rise.map((noteId, i) => ({
      noteId,
      atMs: startMs + i * E,
      durationMs: 2 * E,
      velocity: 0.48,
    })),
    { noteId: 'F5' as NoteId, atMs: startMs + 2 * Q, durationMs: Q, velocity: 0.5 },
    { noteId: 'D5' as NoteId, atMs: startMs + 3 * Q, durationMs: 2 * Q, velocity: 0.45 },
    {
      noteId: 'D4' as NoteId,
      atMs: startMs,
      durationMs: 4 * Q,
      velocity: 0.55,
      role: 'accompaniment' as const,
      transpose: -12,
    },
  ];
}

const CADENCE_START = PHRASES.length * BAR;

const EVENTS: Ev[] = [
  ...PHRASES.flatMap((chord, i) => [
    ...arpeggioBar(i * BAR, chord),
    ...bassBar(i * BAR, chord),
  ]),
  ...cadenceBar(CADENCE_START),
].sort((a, b) => a.atMs - b.atMs);

const MELODY = EVENTS.filter((event) => event.role !== 'accompaniment');
const LAST_MS = MELODY[MELODY.length - 1]?.atMs ?? 0;
// The excerpt is the first phrase — the descent and its turn to the dominant.
const PARTIAL_END_MS = 8 * BAR - E;

export const greatFairyFountainSong: SongDefinition = {
  id: 'great-fairy-fountain',
  title: "Great Fairy's Fountain",
  artist: 'Koji Kondo',
  descriptionKey: 'tutorial.songs.greatFairyFountain.description',
  previewDurationMs: Math.min(12000, LAST_MS + Q),
  events: EVENTS,
  meter: { beatMs: Q, beatsPerBar: 4 },
  partialWindowMs: {
    startMs: 0,
    endMs: PARTIAL_END_MS,
  },
};
