import type { NoteId } from '../pianoNotes';
import type { SongDefinition, SongEvent } from './types';

// Ed Sheeran — "Shape of You" (2017), simplified to Db (C#) minor.
// Pitches from the letter-note transcription this chart has always used.
//
// 96 BPM, 4/4 — the song's actual tempo. Letter-note sources list one letter
// per syllable and carry no rhythm at all, so the whole thing used to be laid
// out as one unbroken stream of sixteenths: 151 notes, 150ms apart, with not a
// single rest anywhere. At that spacing the phrases run into each other and
// the tune stops being followable, let alone playable.
//
// So the pulse here is the eighth, phrases are separated by real silence, and
// each one ends on a held note. The verse is delivered faster than this on the
// record; notating it at the eighth is deliberate — a lesson has to be
// playable at the tempo it teaches.
const BPM = 96;
const Q = Math.round(60000 / BPM); // 625
const E = Q / 2;
const BAR = 4 * Q;

type Ev = SongEvent;

type Phrase = {
  notes: NoteId[];
  /** Beats of silence after the phrase, on top of its final held note. */
  restBeats?: number;
};

/** Intro marimba riff, verse, chorus hook, then the riff back for the close. */
const PHRASES: Phrase[] = [
  // Intro riff — the repeated-note marimba pulse.
  { notes: ['B4', 'E5', 'E5', 'E5', 'E5', 'E5', 'E5', 'E5', 'E5', 'E5', 'E5', 'E5'] },
  { notes: ['E5', 'E5', 'E5', 'E5', 'Gb5', 'Ab5', 'Ab5'], restBeats: 1 },
  { notes: ['B5', 'Ab5', 'Ab5', 'Ab5', 'Ab5', 'Ab5', 'Gb5', 'Gb5', 'Gb5', 'Gb5', 'Gb5'] },
  { notes: ['Gb5', 'Gb5', 'Gb5', 'Gb5', 'Ab5', 'Gb5', 'E5', 'Db5'], restBeats: 2 },

  // Verse.
  { notes: ['Db5', 'Db5', 'Db5', 'Gb5', 'Ab5', 'Ab5', 'Ab5', 'Ab5'] },
  { notes: ['Ab5', 'Ab5', 'Ab5', 'Ab5', 'Ab5', 'Ab5', 'Ab5', 'Ab5'], restBeats: 1 },
  { notes: ['Ab5', 'B5', 'Ab5', 'Ab5', 'Gb5', 'Gb5', 'E5', 'Ab5'] },
  { notes: ['Gb5', 'E5', 'E5', 'E5', 'E5', 'B5'], restBeats: 2 },

  // Chorus hook.
  { notes: ['Gb5', 'Ab5', 'Ab5', 'Gb5', 'Gb5', 'Gb5', 'Gb5', 'Gb5'] },
  { notes: ['Gb5', 'Gb5', 'Gb5', 'Gb5', 'E5', 'Db5'], restBeats: 1 },
  { notes: ['Ab4', 'Ab4', 'Db5', 'Db5', 'Db5', 'Db5'] },
  { notes: ['Db5', 'Db5', 'Db5', 'B4', 'Db5', 'Ab5', 'Gb5'], restBeats: 1 },
  { notes: ['Gb5', 'Gb5', 'Ab5', 'Gb5', 'E5'] },
  { notes: ['Db5', 'E5', 'Ab5', 'Gb5', 'Gb5', 'Db5'], restBeats: 1 },
  { notes: ['B5', 'Gb5', 'Ab5', 'Ab5', 'Gb5', 'E5', 'Db5'] },
  { notes: ['Gb5', 'Gb5', 'Ab5', 'Gb5', 'E5', 'Gb5', 'E5', 'Db5'], restBeats: 2 },

  // Riff returns for the close.
  { notes: ['B4', 'E5', 'E5', 'E5', 'E5', 'E5', 'E5', 'E5'] },
  { notes: ['E5', 'E5', 'E5', 'Gb5', 'Ab5', 'Ab5'], restBeats: 1 },
  { notes: ['B5', 'Ab5', 'Ab5', 'Ab5', 'Gb5', 'Gb5', 'Gb5', 'Gb5'] },
  { notes: ['Gb5', 'Gb5', 'Ab5', 'Gb5', 'E5', 'Gb5', 'E5', 'Db5'] },
];

/** Where each phrase begins, so the bass can follow the same layout. */
const phraseStarts: number[] = [];

const MELODY: Ev[] = [];
{
  let cursor = 0;
  for (const phrase of PHRASES) {
    phraseStarts.push(cursor);
    const last = phrase.notes.length - 1;
    phrase.notes.forEach((noteId, i) => {
      MELODY.push({
        noteId,
        atMs: Math.round(cursor + i * E),
        // The phrase lands on a held note; everything before it is an eighth.
        durationMs: i === last ? Q : E,
      });
    });
    const spanMs = last * E + Q + (phrase.restBeats ?? 0) * Q;
    // Start every phrase on a bar line so the groove stays legible.
    cursor += Math.ceil(spanMs / BAR) * BAR;
  }
}

const LAST_MS = MELODY[MELODY.length - 1]?.atMs ?? 0;

/**
 * Chord root per phrase, in Db (C#) minor, read off the pitches each phrase
 * dwells on: phrases sitting on Mi → i, the Fa#-Sol# turns → iv, the Sol#-Si
 * ones → III, the Fa#-Si one → VII. Ties hold the previous chord.
 *
 * The piano does not sound this — its samples stop at Do4, so a bass can only
 * be produced by stretching one an octave down, which no longer sounds like a
 * piano. It stays here for when there are real low samples to play it with.
 */
const PHRASE_ROOTS: NoteId[] = [
  'Db4', 'Db4', 'E4', 'Gb4',
  'Db4', 'Db4', 'E4', 'Db4',
  'Gb4', 'Db4', 'Gb4', 'Db4',
  'Gb4', 'Db4', 'E4', 'Db4',
  'Db4', 'Db4', 'E4', 'Db4',
];

const BASS: Ev[] = phraseStarts.flatMap((startMs, i) =>
  [0, 2].map((beat) => ({
    noteId: PHRASE_ROOTS[i] ?? 'Db4',
    atMs: startMs + beat * Q,
    durationMs: 2 * Q,
    role: 'accompaniment' as const,
    transpose: -12,
  })),
);

const EVENTS: Ev[] = [...MELODY, ...BASS].sort((a, b) => a.atMs - b.atMs);

// The excerpt is the intro riff plus the first verse phrase.
const partialNotes = MELODY.filter((event) => event.atMs < phraseStarts[5]);

export const shapeOfYouSong: SongDefinition = {
  id: 'shape-of-you',
  title: 'Shape of You',
  artist: 'Ed Sheeran',
  descriptionKey: 'tutorial.songs.shapeOfYou.description',
  previewDurationMs: Math.min(12000, LAST_MS + Q),
  events: EVENTS,
  meter: { beatMs: Q, beatsPerBar: 4 },
  partialWindowMs: {
    startMs: partialNotes[0]?.atMs ?? 0,
    endMs: partialNotes[partialNotes.length - 1]?.atMs ?? LAST_MS,
  },
};
