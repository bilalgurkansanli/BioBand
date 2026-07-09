import type { NoteId } from '../pianoNotes';
import type { SongDefinition } from './types';

// Jingle Bells opening — "Jingle bells, jingle bells, jingle all the way / Oh what fun…"
// Rhythm: eighth-eighth-quarter, four eighths, then the iconic E–G–C–D–E run.
const JINGLE_BELLS_EVENTS: { noteId: NoteId; atMs: number }[] = [
  { noteId: 'E4', atMs: 0 },
  { noteId: 'E4', atMs: 250 },
  { noteId: 'E4', atMs: 500 },
  { noteId: 'E4', atMs: 1100 },
  { noteId: 'E4', atMs: 1350 },
  { noteId: 'E4', atMs: 1600 },
  { noteId: 'E4', atMs: 1850 },
  { noteId: 'E4', atMs: 2100 },
  { noteId: 'G4', atMs: 2350 },
  { noteId: 'C4', atMs: 2600 },
  { noteId: 'D4', atMs: 2850 },
  { noteId: 'E4', atMs: 3100 },
  { noteId: 'E4', atMs: 3700 },
  { noteId: 'E4', atMs: 3950 },
  { noteId: 'E4', atMs: 4200 },
  { noteId: 'E4', atMs: 4450 },
  { noteId: 'E4', atMs: 4700 },
  { noteId: 'G4', atMs: 4950 },
];

export const jingleBellsSong: SongDefinition = {
  id: 'jingle-bells',
  title: 'Jingle Bells',
  artist: 'James Lord Pierpont',
  descriptionKey: 'tutorial.songs.jingleBells.description',
  previewDurationMs: 5000,
  events: JINGLE_BELLS_EVENTS,
};
