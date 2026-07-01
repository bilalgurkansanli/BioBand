import type { NoteId } from '../pianoNotes';
import type { SongDefinition } from './types';

// Jingle Bells opening phrase in C major (E4–E5 range on our keyboard)
const JINGLE_BELLS_EVENTS: { noteId: NoteId; atMs: number }[] = [
  { noteId: 'E4', atMs: 0 },
  { noteId: 'E4', atMs: 500 },
  { noteId: 'E4', atMs: 1000 },
  { noteId: 'E4', atMs: 2000 },
  { noteId: 'E4', atMs: 2500 },
  { noteId: 'E4', atMs: 3000 },
  { noteId: 'E4', atMs: 3500 },
  { noteId: 'G4', atMs: 4000 },
  { noteId: 'C4', atMs: 4500 },
  { noteId: 'D4', atMs: 5000 },
  { noteId: 'E4', atMs: 5500 },
  { noteId: 'E4', atMs: 6500 },
  { noteId: 'E4', atMs: 7000 },
  { noteId: 'E4', atMs: 7500 },
  { noteId: 'E4', atMs: 8000 },
  { noteId: 'G4', atMs: 8500 },
  { noteId: 'C4', atMs: 9000 },
  { noteId: 'D4', atMs: 9500 },
];

export const jingleBellsSong: SongDefinition = {
  id: 'jingle-bells',
  titleKey: 'tutorial.songs.jingleBells.title',
  descriptionKey: 'tutorial.songs.jingleBells.description',
  previewDurationMs: 10000,
  events: JINGLE_BELLS_EVENTS,
};

export const TUTORIAL_SONGS: SongDefinition[] = [jingleBellsSong];

export function getSongById(id: string): SongDefinition | undefined {
  return TUTORIAL_SONGS.find((song) => song.id === id);
}
