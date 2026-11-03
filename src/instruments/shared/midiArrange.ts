import { GM_DRUM_CHANNEL, type MidiFileContent, type MidiNote } from './midiReader';
import { cleanText, MAX_USER_SONG_AT_MS } from './userSongDocument';

// Turning a file's notes into one playable part: which voices to keep, how a
// chord collapses, and the clean-up every converter does before handing its
// events to the schema. Shared so the five importers agree on all of it.

/** Notes starting within this many ticks count as one chord. */
export const CHORD_TICK_WINDOW = 8;

/** Lowest voice must sit this far under the tune to be worth keeping. */
export const BASS_MIN_INTERVAL = 7;

function scorePart(notes: MidiNote[]): number {
  if (notes.length === 0) {
    return -Infinity;
  }
  const avgPitch = notes.reduce((sum, note) => sum + note.noteNumber, 0) / notes.length;
  // Prefer denser, mid/high melodic lines over sparse bass pads.
  return notes.length * 2 + avgPitch;
}

/**
 * Notes of the strongest melodic parts. A part is one channel of one track, so
 * a single-track (format 0) file still separates its instruments.
 *
 * The drum channel is never a candidate. It used to be: drums are usually the
 * densest part of a pop file, so the scoring picked the kit as "the melody"
 * and the lesson asked the user to play hi-hats on the piano.
 */
export function selectMelodicParts(notes: MidiNote[], maxParts: number): MidiNote[] {
  const parts = new Map<number, MidiNote[]>();
  for (const note of notes) {
    if (note.channel === GM_DRUM_CHANNEL) {
      continue;
    }
    const key = note.trackIndex * 16 + note.channel;
    const list = parts.get(key);
    if (list) {
      list.push(note);
    } else {
      parts.set(key, [note]);
    }
  }
  return [...parts.values()]
    .map((part) => ({ part, score: scorePart(part) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, maxParts)
    .flatMap((entry) => entry.part);
}

/**
 * The hits a percussion import should read. When the file uses the General
 * MIDI drum channel, only that channel is drums — mapping every channel's
 * notes 35–59 used to turn the bass line and the pianist's left hand into
 * kicks and toms. A file with no drum channel at all is taken as a pure drum
 * part written on some other channel, as before.
 */
export function percussionNotes(file: MidiFileContent): MidiNote[] {
  if (!file.hasDrumChannel) {
    return file.notes;
  }
  return file.notes.filter((note) => note.channel === GM_DRUM_CHANNEL);
}

function byOnsetThenHighest(a: MidiNote, b: MidiNote): number {
  return a.tick - b.tick || b.noteNumber - a.noteNumber;
}

/**
 * Split notes that start nearly together into the tune (top note) and the
 * voice under it (bottom note, when it is far enough below to be a real part
 * rather than a doubling). Keeping only the top line is what strips a song of
 * the thing that identifies it — the bass of Billie Jean, the rocking left
 * hand of Für Elise — leaving a correct but unrecognisable melody.
 */
export function splitChords(notes: MidiNote[]): { melody: MidiNote[]; bass: MidiNote[] } {
  if (notes.length === 0) {
    return { melody: [], bass: [] };
  }

  const sorted = [...notes].sort(byOnsetThenHighest);
  const melody: MidiNote[] = [];
  const bass: MidiNote[] = [];

  let groupTick = sorted[0].tick;
  let groupTop = sorted[0];
  let groupBottom = sorted[0];

  const flush = (): void => {
    melody.push(groupTop);
    if (groupTop.noteNumber - groupBottom.noteNumber >= BASS_MIN_INTERVAL) {
      bass.push(groupBottom);
    }
  };

  for (let i = 1; i < sorted.length; i++) {
    const note = sorted[i];
    if (note.tick - groupTick <= CHORD_TICK_WINDOW) {
      if (note.noteNumber > groupTop.noteNumber) {
        groupTop = note;
      }
      if (note.noteNumber < groupBottom.noteNumber) {
        groupBottom = note;
      }
      continue;
    }
    flush();
    groupTick = note.tick;
    groupTop = note;
    groupBottom = note;
  }
  flush();

  return { melody, bass };
}

/**
 * One bow, one note: simultaneous pitches collapse to the top line. For an
 * instrument that cannot promise an under-voice (the violin).
 */
export function topLine(notes: MidiNote[]): MidiNote[] {
  return splitChords(notes).melody;
}

/** Song title for an import: the file's own track name, else its file name. */
export function importTitle(trackName: string | undefined, fileName: string | undefined): string {
  const fromTrack = cleanText(trackName);
  if (fromTrack) {
    return fromTrack;
  }
  const fromFile = cleanText(fileName?.replace(/\.(mid|midi)$/i, ''));
  return fromFile || 'Imported MIDI';
}

/**
 * The common tail of every converter: sort, drop exact duplicates (same onset,
 * same key), keep the opening `maxEvents`, move the first note to 0 ms and drop
 * anything a broken tempo map pushed past the longest allowed song.
 */
export function finishImportedEvents<T extends { atMs: number }>(
  events: T[],
  options: {
    maxEvents: number;
    /** Identity within one onset; duplicates of it are dropped. */
    keyOf: (event: T) => string;
    /** Tie-break among events sharing an onset, so output is deterministic. */
    compare?: (a: T, b: T) => number;
  },
): T[] {
  const sorted = [...events].sort(
    (a, b) => a.atMs - b.atMs || (options.compare ? options.compare(a, b) : 0),
  );

  const seen = new Set<string>();
  const deduped: T[] = [];
  for (const event of sorted) {
    const key = `${event.atMs}:${options.keyOf(event)}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    deduped.push(event);
  }

  const kept = deduped.slice(0, options.maxEvents);
  const minAt = kept.length > 0 ? kept[0].atMs : 0;
  return kept
    .map((event) => (minAt > 0 ? { ...event, atMs: event.atMs - minAt } : event))
    .filter(
      (event) =>
        Number.isFinite(event.atMs) && event.atMs >= 0 && event.atMs <= MAX_USER_SONG_AT_MS,
    );
}
