import type { NoteId } from '../pianoNotes';
import type { SongDefinition } from './types';

// Barış Manço — "Gülpembe" (music: Ahmet Güvenç), intro hook.
// Transcribed in E minor from the kolaynota.com notation (Musa Çetiner);
// quarter ≈ 620ms (~97bpm). The iconic Mi / Fa-Mi-Re / Mi phrase repeats with
// descending three-note pickups (Si-La-Si, La-Sol-La, Sol-Fa♯-Sol) between.
// Note: the F in the Fa-Mi-Re triplet is F natural (marked ♮ in the source).
// Played back slower than the record so it is easier to follow along.
const TEMPO_SCALE = 1.25;

const RAW_EVENTS: { noteId: NoteId; atMs: number }[] = [
  // Phrase 1 — Mi, Fa-Mi-Re triplet, held Mi.
  { noteId: 'E4', atMs: 0 },
  { noteId: 'F4', atMs: 620 },
  { noteId: 'E4', atMs: 827 },
  { noteId: 'D4', atMs: 1033 },
  { noteId: 'E4', atMs: 1240 },
  // Pickup: Si La Si.
  { noteId: 'B4', atMs: 3410 },
  { noteId: 'A4', atMs: 3720 },
  { noteId: 'B4', atMs: 4030 },
  // Phrase 2.
  { noteId: 'E4', atMs: 4960 },
  { noteId: 'F4', atMs: 5580 },
  { noteId: 'E4', atMs: 5787 },
  { noteId: 'D4', atMs: 5993 },
  { noteId: 'E4', atMs: 6200 },
  // Pickup: La Sol La.
  { noteId: 'A4', atMs: 8370 },
  { noteId: 'G4', atMs: 8680 },
  { noteId: 'A4', atMs: 8990 },
  // Phrase 3.
  { noteId: 'E4', atMs: 9920 },
  { noteId: 'F4', atMs: 10540 },
  { noteId: 'E4', atMs: 10747 },
  { noteId: 'D4', atMs: 10953 },
  { noteId: 'E4', atMs: 11160 },
  // Pickup: Sol Fa♯ Sol.
  { noteId: 'G4', atMs: 13330 },
  { noteId: 'Gb4', atMs: 13640 },
  { noteId: 'G4', atMs: 13950 },
  // Closing phrase — Fa-Mi-Re triplet resolving on the final Mi.
  { noteId: 'F4', atMs: 14880 },
  { noteId: 'E4', atMs: 15087 },
  { noteId: 'D4', atMs: 15293 },
  { noteId: 'E4', atMs: 15500 },
];

const GULPEMBE_EVENTS = RAW_EVENTS.map((event) => ({
  ...event,
  atMs: Math.round(event.atMs * TEMPO_SCALE),
}));

export const gulpembeSong: SongDefinition = {
  id: 'gulpembe',
  title: 'Gülpembe',
  artist: 'Barış Manço',
  descriptionKey: 'tutorial.songs.gulpembe.description',
  previewDurationMs: Math.round(17700 * TEMPO_SCALE),
  events: GULPEMBE_EVENTS,
};
