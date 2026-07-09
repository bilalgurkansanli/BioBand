import type { NoteId } from '../pianoNotes';
import type { SongDefinition } from './types';

// Murat Dalkılıç — "Neyleyim İstanbul'u" (music: Oytun Karanacak), intro melody.
// Transcribed in C major from the kolaynota.com notation; quarter ≈ 470ms (~128bpm).
// Bars 1-5 of the instrumental intro, ending on the low C resolution.
// Played back slower than the record so it is easier to follow along.
const TEMPO_SCALE = 1.3;

const RAW_EVENTS: { noteId: NoteId; atMs: number }[] = [
  // Bar 1 — La Si La pickup, then the Mi Re Do Si La descent.
  { noteId: 'A4', atMs: 0 },
  { noteId: 'B4', atMs: 115 },
  { noteId: 'A4', atMs: 230 },
  { noteId: 'E5', atMs: 350 },
  { noteId: 'D5', atMs: 585 },
  { noteId: 'C5', atMs: 820 },
  { noteId: 'B4', atMs: 1055 },
  { noteId: 'A4', atMs: 1170 },
  // Bar 2 — Sol, Sol La Sol, Re Do Si La Sol.
  { noteId: 'G4', atMs: 1290 },
  { noteId: 'G4', atMs: 1880 },
  { noteId: 'A4', atMs: 1995 },
  { noteId: 'G4', atMs: 2110 },
  { noteId: 'D5', atMs: 2230 },
  { noteId: 'C5', atMs: 2465 },
  { noteId: 'B4', atMs: 2700 },
  { noteId: 'A4', atMs: 2935 },
  { noteId: 'G4', atMs: 3050 },
  // Bar 3 — the syncopated Fa Mi Fa riff, closing with Sol La.
  { noteId: 'F4', atMs: 3170 },
  { noteId: 'E4', atMs: 3290 },
  { noteId: 'F4', atMs: 3405 },
  { noteId: 'F4', atMs: 3875 },
  { noteId: 'E4', atMs: 3990 },
  { noteId: 'F4', atMs: 4110 },
  { noteId: 'E4', atMs: 4460 },
  { noteId: 'F4', atMs: 4580 },
  { noteId: 'G4', atMs: 4815 },
  { noteId: 'A4', atMs: 4930 },
  // Bar 4 — Sol held, then the Re Mi Mi Re Do Si La Si run.
  { noteId: 'G4', atMs: 5050 },
  { noteId: 'D5', atMs: 5990 },
  { noteId: 'E5', atMs: 6105 },
  { noteId: 'E5', atMs: 6225 },
  { noteId: 'D5', atMs: 6340 },
  { noteId: 'C5', atMs: 6460 },
  { noteId: 'B4', atMs: 6575 },
  { noteId: 'A4', atMs: 6695 },
  { noteId: 'B4', atMs: 6810 },
  // Bar 5 — Do held, Sol La Fa Sol / Mi Fa Re Mi descent…
  { noteId: 'C5', atMs: 6930 },
  { noteId: 'G4', atMs: 7870 },
  { noteId: 'A4', atMs: 7985 },
  { noteId: 'F4', atMs: 8105 },
  { noteId: 'G4', atMs: 8220 },
  { noteId: 'E4', atMs: 8340 },
  { noteId: 'F4', atMs: 8455 },
  { noteId: 'D4', atMs: 8575 },
  { noteId: 'E4', atMs: 8690 },
  // …resolving on the low Do.
  { noteId: 'C4', atMs: 8810 },
];

const NEYLEYIM_ISTANBUL_EVENTS = RAW_EVENTS.map((event) => ({
  ...event,
  atMs: Math.round(event.atMs * TEMPO_SCALE),
}));

export const neyleyimIstanbulSong: SongDefinition = {
  id: 'neyleyim-istanbul',
  title: "Neyleyim İstanbul'u",
  artist: 'Murat Dalkılıç',
  descriptionKey: 'tutorial.songs.neyleyimIstanbul.description',
  previewDurationMs: Math.round(10500 * TEMPO_SCALE),
  events: NEYLEYIM_ISTANBUL_EVENTS,
};
