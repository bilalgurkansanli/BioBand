import type { NoteId } from '../pianoNotes';
import type { SongDefinition } from './types';

// Ed Sheeran — "Shape of You" (2017). Full marimba riff + verse + chorus,
// simplified to Db minor. Source: noobnotes.net easy letter-note transcription.
// Sixteenth note ≈ 150ms (fast repeated-note groove).
const S = 150;

type Ev = { noteId: NoteId; atMs: number };

/** Lay out a flat run of notes as straight sixteenth notes from `startMs`. */
function run(startMs: number, notes: NoteId[]): Ev[] {
  return notes.map((noteId, i) => ({ noteId, atMs: startMs + i * S }));
}

const LINES: NoteId[][] = [
  // Intro riff — the iconic repeated-note marimba pulse.
  ['B4', 'E5', 'E5', 'E5', 'E5', 'E5', 'E5', 'E5', 'E5', 'E5', 'E5', 'E5'],
  ['E5', 'E5', 'E5', 'E5', 'Gb5', 'Ab5', 'Ab5'],
  ['B5', 'Ab5', 'Ab5', 'Ab5', 'Ab5', 'Ab5', 'Gb5', 'Gb5', 'Gb5', 'Gb5', 'Gb5'],
  ['Gb5', 'Gb5', 'Gb5', 'Gb5', 'Ab5', 'Gb5', 'E5', 'Db5'],
  // Verse.
  ['Db5', 'Db5', 'Db5', 'Gb5', 'Ab5', 'Ab5', 'Ab5', 'Ab5'],
  ['Ab5', 'Ab5', 'Ab5', 'Ab5', 'Ab5', 'Ab5', 'Ab5', 'Ab5'],
  ['Ab5', 'B5', 'Ab5', 'Ab5', 'Gb5', 'Gb5', 'E5', 'Ab5'],
  ['Gb5', 'E5', 'E5', 'E5', 'E5', 'B5'],
  // Chorus hook.
  ['Gb5', 'Ab5', 'Ab5', 'Gb5', 'Gb5', 'Gb5', 'Gb5', 'Gb5'],
  ['Gb5', 'Gb5', 'Gb5', 'Gb5', 'E5', 'Db5'],
  ['Ab4', 'Ab4', 'Db5', 'Db5', 'Db5', 'Db5'],
  ['Db5', 'Db5', 'Db5', 'B4', 'Db5', 'Ab5', 'Gb5'],
  ['Gb5', 'Gb5', 'Ab5', 'Gb5', 'E5'],
  ['Db5', 'E5', 'Ab5', 'Gb5', 'Gb5', 'Db5'],
  ['B5', 'Gb5', 'Ab5', 'Ab5', 'Gb5', 'E5', 'Db5'],
  ['Gb5', 'Gb5', 'Ab5', 'Gb5', 'E5', 'Gb5', 'E5', 'Db5'],
  // Second pass — riff returns for the final chorus.
  ['B4', 'E5', 'E5', 'E5', 'E5', 'E5', 'E5', 'E5'],
  ['E5', 'E5', 'E5', 'Gb5', 'Ab5', 'Ab5'],
  ['B5', 'Ab5', 'Ab5', 'Ab5', 'Gb5', 'Gb5', 'Gb5', 'Gb5'],
  ['Gb5', 'Gb5', 'Ab5', 'Gb5', 'E5', 'Gb5', 'E5', 'Db5'],
];

const EVENTS: Ev[] = LINES.reduce<Ev[]>((acc, line) => {
  const startMs = acc.length > 0 ? acc[acc.length - 1].atMs + S : 0;
  acc.push(...run(startMs, line));
  return acc;
}, []);

const LAST_MS = EVENTS[EVENTS.length - 1]?.atMs ?? 0;

const partialNotes = EVENTS.slice(0, 60);

export const shapeOfYouSong: SongDefinition = {
  id: 'shape-of-you',
  title: 'Shape of You',
  artist: 'Ed Sheeran',
  descriptionKey: 'tutorial.songs.shapeOfYou.description',
  previewDurationMs: Math.min(12000, LAST_MS + S),
  events: EVENTS,
  partialWindowMs: {
    startMs: partialNotes[0]?.atMs ?? 0,
    endMs: partialNotes[partialNotes.length - 1]?.atMs ?? LAST_MS,
  },
};
