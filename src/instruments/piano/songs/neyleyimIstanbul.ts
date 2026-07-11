import type { NoteId } from '../pianoNotes';
import type { SongDefinition } from './types';

// Murat Dalkılıç — "Neyleyim İstanbul'u" (music: Oytun Karanacak), intro melody.
// Transcribed in C major from the kolaynota.com notation; quarter ≈ 470ms (~128bpm).
// Bars 1-5 of the instrumental intro, ending on the low C resolution.
// Backing: assets/songs/neyleyim-istanbul.mp3 (~4:23). eventsStartMs aligned to
// first non-silent audio (~0.39s via silencedetect); fine-tune if keys feel early/late.
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

const LAST_EVENT_MS = RAW_EVENTS[RAW_EVENTS.length - 1]?.atMs ?? 0;

/** First audible frame of the bundled mix (ms). */
const EVENTS_START_MS = 390;

export const neyleyimIstanbulSong: SongDefinition = {
  id: 'neyleyim-istanbul',
  title: "Neyleyim İstanbul'u",
  artist: 'Murat Dalkılıç',
  descriptionKey: 'tutorial.songs.neyleyimIstanbul.description',
  previewDurationMs: 10500,
  events: RAW_EVENTS,
  backingTrack: {
    module: require('../../../../assets/songs/neyleyim-istanbul.mp3'),
    eventsStartMs: EVENTS_START_MS,
  },
  partialWindowMs: {
    startMs: EVENTS_START_MS,
    endMs: EVENTS_START_MS + LAST_EVENT_MS + 2000,
  },
};
