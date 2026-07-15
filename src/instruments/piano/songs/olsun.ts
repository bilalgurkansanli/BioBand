import type { NoteId } from '../pianoNotes';
import type { SongDefinition } from './types';

// Sertab Erener — "Olsun" (Emre Kula / Can Bonomo)
// Musa Çetiner / kolaynota.com — F#m (3 sharps). Do#→Db, Fa#→Gb, Sol#→Ab.
// Intro riff + "Ben giderim…" vocal + title tag + page-2 color.
// Quarter ≈ 480ms.
const Q = 480;
const E = Q / 2;
const S = Q / 4;
const H = Q * 2;
const BAR = 4 * Q;

type Ev = { noteId: NoteId; atMs: number };

function at(bar: number, offset: number, noteId: NoteId): Ev {
  return { noteId, atMs: bar * BAR + offset };
}

/** Intro (M1–8) from kolaynota page 1. */
function intro(startBar: number): Ev[] {
  const b = startBar;
  return [
    // M1: Do# La Do# La Do# Re Do# Si
    at(b, 0, 'Db5'),
    at(b, E, 'A4'),
    at(b, Q, 'Db5'),
    at(b, Q + E, 'A4'),
    at(b, 2 * Q, 'Db5'),
    at(b, 2 * Q + E, 'D5'),
    at(b, 3 * Q, 'Db5'),
    at(b, 3 * Q + E, 'B4'),
    // M2: Mi | Si La Si La Si Do# Si
    at(b + 1, 0, 'E5'),
    at(b + 1, E, 'B4'),
    at(b + 1, Q, 'A4'),
    at(b + 1, Q + E, 'B4'),
    at(b + 1, 2 * Q, 'A4'),
    at(b + 1, 2 * Q + E, 'B4'),
    at(b + 1, 3 * Q, 'Db5'),
    at(b + 1, 3 * Q + E, 'B4'),
    // M3: La Sol# | Do# La Do# La Do# Re
    at(b + 2, 0, 'A4'),
    at(b + 2, E, 'Ab4'),
    at(b + 2, Q, 'Db5'),
    at(b + 2, Q + E, 'A4'),
    at(b + 2, 2 * Q, 'Db5'),
    at(b + 2, 2 * Q + E, 'A4'),
    at(b + 2, 3 * Q, 'Db5'),
    at(b + 2, 3 * Q + E, 'D5'),
    // M4: Do# Si Mi | Si La Si La Si
    at(b + 3, 0, 'Db5'),
    at(b + 3, E, 'B4'),
    at(b + 3, Q, 'E5'),
    at(b + 3, Q + E, 'B4'),
    at(b + 3, 2 * Q, 'A4'),
    at(b + 3, 2 * Q + E, 'B4'),
    at(b + 3, 3 * Q, 'A4'),
    at(b + 3, 3 * Q + E, 'B4'),
    // M5–6 close
    at(b + 4, 0, 'Db5'),
    at(b + 4, E, 'B4'),
    at(b + 4, Q, 'A4'),
    at(b + 4, Q + E, 'Ab4'),
    at(b + 4, 2 * Q, 'A4'),
    at(b + 4, 3 * Q, 'Gb4'),
    at(b + 5, 0, 'E4'),
    at(b + 5, Q, 'Gb4'),
    at(b + 5, 2 * Q, 'A4'),
    at(b + 5, 3 * Q, 'Ab4'),
    // M7–8 Fine approach
    at(b + 6, 0, 'A4'),
    at(b + 6, H, 'Gb4'),
    at(b + 7, 0, 'E4'),
    at(b + 7, H, 'D4'),
  ];
}

/** "Ben giderim, İstanbul senin olsun" (F#m). */
function benGiderim(startBar: number): Ev[] {
  const b = startBar;
  return [
    at(b, 0, 'A4'),
    at(b, E, 'A4'),
    at(b, Q, 'Ab4'),
    at(b, Q + E, 'Gb4'),
    at(b, 2 * Q, 'Ab4'),
    at(b, 2 * Q + E, 'Ab4'),
    at(b, 3 * Q, 'B4'),
    at(b, 3 * Q + E, 'A4'),
    at(b + 1, 0, 'Ab4'),
    at(b + 1, Q, 'Gb4'),
    at(b + 1, 2 * Q, 'Gb4'),
  ];
}

function alirimBasimi(startBar: number): Ev[] {
  const b = startBar;
  return [
    at(b, 0, 'Gb4'),
    at(b, E, 'Ab4'),
    at(b, Q, 'A4'),
    at(b, Q + E, 'Gb4'),
    at(b, 2 * Q, 'Ab4'),
    at(b, 2 * Q + E, 'A4'),
    at(b, 3 * Q, 'Gb4'),
    at(b, 3 * Q + E, 'Ab4'),
    at(b + 1, 0, 'A4'),
    at(b + 1, E, 'Ab4'),
    at(b + 1, Q, 'Gb4'),
    at(b + 1, Q + E, 'E4'),
    at(b + 1, 2 * Q, 'Gb4'),
    at(b + 1, 3 * Q, 'Gb4'),
  ];
}

function silerimYasimi(startBar: number): Ev[] {
  const b = startBar;
  return [
    at(b, 0, 'Gb4'),
    at(b, E, 'Ab4'),
    at(b, Q, 'A4'),
    at(b, Q + E, 'Gb4'),
    at(b, 2 * Q, 'Ab4'),
    at(b, 2 * Q + E, 'A4'),
    at(b, 3 * Q, 'Ab4'),
    at(b, 3 * Q + E, 'Gb4'),
    at(b + 1, 0, 'E4'),
    at(b + 1, Q, 'Gb4'),
    at(b + 1, 2 * Q, 'Gb4'),
  ];
}

function kestirirSacimi(startBar: number): Ev[] {
  const b = startBar;
  return [
    at(b, 0, 'Gb4'),
    at(b, E, 'Ab4'),
    at(b, Q, 'A4'),
    at(b, Q + E, 'Gb4'),
    at(b, 2 * Q, 'Ab4'),
    at(b, 2 * Q + E, 'A4'),
    at(b, 3 * Q, 'Ab4'),
    at(b, 3 * Q + E, 'Gb4'),
    at(b + 1, 0, 'E4'),
    at(b + 1, Q, 'D4'),
    at(b + 1, 2 * Q, 'Gb4'),
  ];
}

function soyleArtikOlsun(startBar: number): Ev[] {
  const b = startBar;
  return [
    at(b, 0, 'Gb4'),
    at(b, E, 'Ab4'),
    at(b, Q, 'A4'),
    at(b, Q + E, 'Gb4'),
    at(b, 2 * Q, 'Db5'),
    at(b, 2 * Q + E, 'Db5'),
    at(b, 3 * Q, 'B4'),
    at(b, 3 * Q + E, 'A4'),
    at(b + 1, 0, 'Ab4'),
    at(b + 1, Q, 'Gb4'),
    at(b + 1, 2 * Q, 'Gb4'),
    at(b + 1, 3 * Q, 'Gb4'),
  ];
}

function page2Color(startBar: number): Ev[] {
  const b = startBar;
  return [
    at(b, 0, 'Gb4'),
    at(b, Q, 'E4'),
    at(b, Q + E, 'Gb4'),
    at(b, 2 * Q, 'E4'),
    at(b, 3 * Q, 'D4'),
    at(b + 1, 0, 'Db5'),
    at(b + 1, E, 'B4'),
    at(b + 1, Q, 'A4'),
    at(b + 1, Q + E, 'Ab4'),
    at(b + 1, 2 * Q, 'A4'),
    at(b + 1, 3 * Q, 'Gb4'),
    at(b + 2, 0, 'A4'),
    at(b + 2, S, 'Gb4'),
    at(b + 2, 2 * S, 'Ab4'),
    at(b + 2, 3 * S, 'A4'),
    at(b + 2, Q, 'Ab4'),
    at(b + 2, Q + E, 'Gb4'),
    at(b + 2, 2 * Q, 'E4'),
    at(b + 2, 3 * Q, 'D4'),
    at(b + 3, 0, 'Gb4'),
  ];
}

const OLSUN_EVENTS: Ev[] = [
  ...intro(0),
  ...benGiderim(8),
  ...benGiderim(10),
  ...alirimBasimi(12),
  ...silerimYasimi(14),
  ...kestirirSacimi(16),
  ...soyleArtikOlsun(18),
  ...page2Color(20),
  // D.C. al Fine — recall opening riff
  ...intro(24).slice(0, 36),
];

const LAST_MS = OLSUN_EVENTS[OLSUN_EVENTS.length - 1]?.atMs ?? 0;

const introNotes = OLSUN_EVENTS.filter((e) => e.atMs < 8 * BAR);
const partialNotes =
  introNotes.length >= 50
    ? introNotes.slice(0, 50)
    : OLSUN_EVENTS.slice(0, 50);

export const olsunSong: SongDefinition = {
  id: 'olsun',
  title: 'Olsun',
  artist: 'Sertab Erener',
  descriptionKey: 'tutorial.songs.olsun.description',
  previewDurationMs: Math.min(12000, LAST_MS + Q),
  events: OLSUN_EVENTS,
  partialWindowMs: {
    startMs: partialNotes[0]?.atMs ?? 0,
    endMs: partialNotes[partialNotes.length - 1]?.atMs ?? LAST_MS,
  },
};
