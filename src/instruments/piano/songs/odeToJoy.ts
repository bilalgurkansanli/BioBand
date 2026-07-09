import type { NoteId } from '../pianoNotes';
import type { SongDefinition } from './types';

// Beethoven — Ode to Joy (public domain), first two phrases in C major.
// Quarter note = 500ms; each phrase ends dotted-quarter + eighth + held half.
const ODE_TO_JOY_EVENTS: { noteId: NoteId; atMs: number }[] = [
  { noteId: 'E4', atMs: 0 },
  { noteId: 'E4', atMs: 500 },
  { noteId: 'F4', atMs: 1000 },
  { noteId: 'G4', atMs: 1500 },
  { noteId: 'G4', atMs: 2000 },
  { noteId: 'F4', atMs: 2500 },
  { noteId: 'E4', atMs: 3000 },
  { noteId: 'D4', atMs: 3500 },
  { noteId: 'C4', atMs: 4000 },
  { noteId: 'C4', atMs: 4500 },
  { noteId: 'D4', atMs: 5000 },
  { noteId: 'E4', atMs: 5500 },
  { noteId: 'E4', atMs: 6000 },
  { noteId: 'D4', atMs: 6750 },
  { noteId: 'D4', atMs: 7000 },
  { noteId: 'E4', atMs: 8000 },
  { noteId: 'E4', atMs: 8500 },
  { noteId: 'F4', atMs: 9000 },
  { noteId: 'G4', atMs: 9500 },
  { noteId: 'G4', atMs: 10000 },
  { noteId: 'F4', atMs: 10500 },
  { noteId: 'E4', atMs: 11000 },
  { noteId: 'D4', atMs: 11500 },
  { noteId: 'C4', atMs: 12000 },
  { noteId: 'C4', atMs: 12500 },
  { noteId: 'D4', atMs: 13000 },
  { noteId: 'E4', atMs: 13500 },
  { noteId: 'D4', atMs: 14000 },
  { noteId: 'C4', atMs: 14750 },
  { noteId: 'C4', atMs: 15000 },
];

export const odeToJoySong: SongDefinition = {
  id: 'ode-to-joy',
  title: 'Ode to Joy',
  artist: 'Ludwig van Beethoven',
  descriptionKey: 'tutorial.songs.odeToJoy.description',
  previewDurationMs: 16500,
  events: ODE_TO_JOY_EVENTS,
};
