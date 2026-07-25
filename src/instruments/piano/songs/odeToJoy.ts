import type { NoteId } from '../pianoNotes';
import type { SongDefinition, SongEvent } from './types';

// Beethoven — "Ode to Joy", the Ninth Symphony's chorale as a four-part hymn.
// Pitches and rhythms follow the Mutopia Project's public-domain SATB setting
// (typeset by Peter Chubb), not a letter sheet.
//
// SOUNDING KEY IS G MAJOR — Beethoven's key, left alone. The tune runs D4–D5,
// which fits this keyboard with a key to spare at either end. The C major used
// before pushed the third phrase's low D under the bottom key, and that whole
// phrase — the one that steps down to the dominant and gives the hymn its
// middle — went missing as a result. All four phrases are here: A A' B A'.
//
// Quarter = 600ms, 4/4, sixteen bars.
const Q = 600;

type Ev = SongEvent;
/** [note, length in quarter notes]. */
type Step = [NoteId, number];

/** Lay a voice out from the top of the piece. */
function melody(steps: Step[]): Ev[] {
  let at = 0;
  return steps.map(([noteId, beats]) => {
    const event: Ev = { noteId, atMs: at, durationMs: beats * Q };
    at += beats * Q;
    return event;
  });
}

/**
 * Lower voices — heard, never highlighted, sounded an octave below the keys.
 * Beethoven's bass drops to G2 at the cadences and there is no room for that
 * under a two-octave keyboard, so those notes (and the closing C–B–A–G walk)
 * are taken an octave higher; every other pitch is the chorale's own.
 */
function inner(steps: Step[]): Ev[] {
  let at = 0;
  return steps.map(([noteId, beats]) => {
    const event: Ev = {
      noteId,
      atMs: at,
      durationMs: beats * Q,
      role: 'accompaniment',
      transpose: -12,
    };
    at += beats * Q;
    return event;
  });
}

// Soprano — the tune. Phrase 4 differs from phrase 1 only in its cadence, and
// phrase 3 (bars 9–12) is the one that dips to D4.
const SOPRANO: Step[] = [
  ['B4', 1], ['B4', 1], ['C5', 1], ['D5', 1],
  ['D5', 1], ['C5', 1], ['B4', 1], ['A4', 1],
  ['G4', 1], ['G4', 1], ['A4', 1], ['B4', 1],
  ['B4', 1.5], ['A4', 0.5], ['A4', 2],

  ['B4', 1], ['B4', 1], ['C5', 1], ['D5', 1],
  ['D5', 1], ['C5', 1], ['B4', 1], ['A4', 1],
  ['G4', 1], ['G4', 1], ['A4', 1], ['B4', 1],
  ['A4', 1.5], ['G4', 0.5], ['G4', 2],

  ['A4', 1], ['A4', 1], ['B4', 1], ['G4', 1],
  ['A4', 1], ['B4', 0.5], ['C5', 0.5], ['B4', 1], ['G4', 1],
  ['A4', 1], ['B4', 0.5], ['C5', 0.5], ['B4', 1], ['A4', 1],
  ['G4', 1], ['A4', 1], ['D4', 2],

  ['B4', 1], ['B4', 1], ['C5', 1], ['D5', 1],
  ['D5', 1], ['C5', 1], ['B4', 1], ['A4', 1],
  ['G4', 1], ['G4', 1], ['A4', 1], ['B4', 1],
  ['A4', 1.5], ['G4', 0.5], ['G4', 2],
];

// Tenor, written an octave above where it sounds.
const TENOR: Step[] = [
  ['D5', 1], ['D5', 1], ['C5', 1], ['B4', 1],
  ['E5', 1.5], ['D5', 0.5], ['D5', 1], ['D5', 1],
  ['B4', 1], ['B4', 1], ['D5', 1], ['D5', 1],
  ['D5', 1.5], ['D5', 0.5], ['D5', 2],

  ['D5', 1], ['D5', 1], ['C5', 1], ['B4', 1],
  ['E5', 1.5], ['D5', 0.5], ['D5', 1], ['D5', 1],
  ['B4', 1], ['B4', 1], ['D5', 1], ['D5', 1],
  ['D5', 1], ['D5', 1], ['B4', 2],

  ['Gb4', 1], ['Gb4', 1], ['G4', 1], ['E4', 1],
  ['Gb4', 1], ['G4', 0.5], ['A4', 0.5], ['G4', 1], ['E4', 1],
  ['Gb4', 1], ['Gb4', 1], ['Gb4', 1], ['B4', 1],
  ['B4', 1], ['A4', 1], ['G4', 1], ['Gb4', 1],

  ['G4', 1], ['D5', 1], ['F5', 1], ['F5', 1],
  ['G5', 1.5], ['D5', 0.5], ['D5', 1], ['C5', 1],
  ['G4', 1], ['G4', 1], ['C5', 1], ['D5', 1],
  ['D5', 1], ['D5', 1], ['B4', 2],
];

// Bass, written an octave above where it sounds.
const BASS: Step[] = [
  ['G4', 1], ['G4', 1], ['G4', 1], ['G4', 1],
  ['E4', 1.5], ['Gb4', 0.5], ['G4', 1], ['D4', 1],
  ['B4', 1], ['B4', 1], ['A4', 1], ['G4', 1],
  ['D4', 1.5], ['D4', 0.5], ['D4', 2],

  ['G4', 1], ['G4', 1], ['G4', 1], ['G4', 1],
  ['E4', 1.5], ['Gb4', 0.5], ['G4', 1], ['D4', 1],
  ['B4', 1], ['B4', 1], ['A4', 1], ['G4', 1],
  ['D4', 1], ['D4', 1], ['G4', 2],

  ['D4', 1], ['D4', 1], ['D4', 1], ['D4', 1],
  ['D4', 1], ['D4', 1], ['D4', 1], ['D4', 1],
  ['D4', 1], ['D4', 1], ['Eb4', 1], ['Eb4', 1],
  ['E4', 1], ['A4', 1], ['D4', 2],

  ['G4', 1], ['G4', 1], ['F4', 1], ['F4', 1],
  ['E4', 1.5], ['Gb4', 0.5], ['G4', 1], ['C4', 1],
  ['C5', 1], ['B4', 1], ['A4', 1], ['G4', 1],
  ['D4', 1], ['D4', 1], ['G4', 2],
];

/**
 * Tenor and bass meet on the same note six times — Beethoven's own unisons.
 * Two identical strikes at the same instant would only be one key hit twice,
 * so the longer of the pair stands for both.
 */
function mergeUnisons(events: Ev[]): Ev[] {
  const byKey = new Map<string, Ev>();
  for (const event of events) {
    const key = `${event.noteId}@${event.atMs}`;
    const held = byKey.get(key);
    if (!held || (event.durationMs ?? 0) > (held.durationMs ?? 0)) {
      byKey.set(key, event);
    }
  }
  return [...byKey.values()];
}

const EVENTS: Ev[] = [
  ...melody(SOPRANO),
  ...mergeUnisons([...inner(TENOR), ...inner(BASS)]),
].sort((a, b) => a.atMs - b.atMs);

const MELODY = EVENTS.filter((event) => event.role !== 'accompaniment');
const LAST_MS = MELODY[MELODY.length - 1]?.atMs ?? 0;

export const odeToJoySong: SongDefinition = {
  id: 'ode-to-joy',
  title: 'Ode to Joy',
  artist: 'Ludwig van Beethoven',
  descriptionKey: 'tutorial.songs.odeToJoy.description',
  previewDurationMs: Math.min(12000, LAST_MS + Q),
  events: EVENTS,
  meter: { beatMs: Q, beatsPerBar: 4 },
};
