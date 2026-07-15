import { parseMidi } from 'midi-file';

import { PIANO_NOTES, type NoteId } from '../pianoNotes';
import {
  UserSongParseError,
  buildUserSongDefinition,
  DEFAULT_PREVIEW_DURATION_MS,
  MAX_USER_SONG_EVENTS,
} from './userSongSchema';
import type { SongDefinition, SongEvent } from './types';

const MIDI_C4 = 60;
const MIDI_B5 = 83;
const DEFAULT_MICROSECONDS_PER_BEAT = 500_000;
/** Keep at most two strongest melodic tracks from a multi-track MIDI. */
const MAX_TRACKS_TO_KEEP = 2;
/** Notes starting within this many ticks count as one chord. */
const CHORD_TICK_WINDOW = 8;

const NOTE_ID_BY_MIDI = new Map<number, NoteId>(
  PIANO_NOTES.map((note) => [note.midi, note.id]),
);

type RawNote = {
  tick: number;
  noteNumber: number;
  trackIndex: number;
};

/**
 * Map any MIDI pitch into the piano's two-octave range (C4–B5) by octave wrapping.
 */
export function wrapMidiToPianoRange(midiNumber: number): NoteId {
  let n = Math.round(midiNumber);
  while (n < MIDI_C4) {
    n += 12;
  }
  while (n > MIDI_B5) {
    n -= 12;
  }
  const noteId = NOTE_ID_BY_MIDI.get(n);
  if (!noteId) {
    return 'C4';
  }
  return noteId;
}

function titleFromFileName(fileName: string): string {
  const base = fileName.replace(/\.(mid|midi)$/i, '').trim();
  return base.length > 0 ? base : 'Imported MIDI';
}

function scoreTrack(notes: RawNote[]): number {
  if (notes.length === 0) {
    return -Infinity;
  }
  const avgPitch =
    notes.reduce((sum, note) => sum + note.noteNumber, 0) / notes.length;
  // Prefer denser, mid/high melodic lines over sparse bass pads.
  return notes.length * 2 + avgPitch;
}

/** Keep top note only for notes that start nearly together (chord → melody). */
function thinChords(notes: RawNote[]): RawNote[] {
  if (notes.length === 0) {
    return [];
  }

  const sorted = [...notes].sort(
    (a, b) => a.tick - b.tick || b.noteNumber - a.noteNumber,
  );
  const kept: RawNote[] = [];
  let groupTick = sorted[0].tick;
  let groupBest = sorted[0];

  for (let i = 1; i < sorted.length; i++) {
    const note = sorted[i];
    if (note.tick - groupTick <= CHORD_TICK_WINDOW) {
      if (note.noteNumber > groupBest.noteNumber) {
        groupBest = note;
      }
      continue;
    }
    kept.push(groupBest);
    groupTick = note.tick;
    groupBest = note;
  }
  kept.push(groupBest);
  return kept;
}

/**
 * Convert a MIDI file buffer into a BioBand SongDefinition.
 * Picks the strongest melodic track(s), thins chords to top notes, wraps range.
 */
export function midiBytesToSong(
  bytes: ArrayLike<number>,
  options?: { fileName?: string },
): SongDefinition {
  let midi;
  try {
    midi = parseMidi(bytes);
  } catch {
    throw new UserSongParseError('midiParseFailed');
  }

  const ticksPerBeat = midi.header.ticksPerBeat ?? 480;
  const tempoMap: { tick: number; microsecondsPerBeat: number }[] = [
    { tick: 0, microsecondsPerBeat: DEFAULT_MICROSECONDS_PER_BEAT },
  ];

  const notesByTrack = new Map<number, RawNote[]>();
  let trackName: string | undefined;

  midi.tracks.forEach((track, trackIndex) => {
    let absTick = 0;
    for (const event of track) {
      absTick += event.deltaTime;

      if (event.type === 'setTempo') {
        tempoMap.push({
          tick: absTick,
          microsecondsPerBeat: event.microsecondsPerBeat,
        });
      }

      if (event.type === 'trackName' && !trackName && event.text.trim()) {
        trackName = event.text.trim();
      }

      if (event.type === 'noteOn' && event.velocity > 0) {
        const list = notesByTrack.get(trackIndex) ?? [];
        list.push({
          tick: absTick,
          noteNumber: event.noteNumber,
          trackIndex,
        });
        notesByTrack.set(trackIndex, list);
      }
    }
  });

  const ranked = [...notesByTrack.entries()]
    .map(([trackIndex, notes]) => ({
      trackIndex,
      notes,
      score: scoreTrack(notes),
    }))
    .filter((entry) => entry.notes.length > 0)
    .sort((a, b) => b.score - a.score);

  if (ranked.length === 0) {
    throw new UserSongParseError('emptySong');
  }

  const selectedTracks = ranked.slice(0, MAX_TRACKS_TO_KEEP);
  const combined = selectedTracks.flatMap((entry) => entry.notes);
  const thinned = thinChords(combined);

  tempoMap.sort((a, b) => a.tick - b.tick);

  function ticksToMs(tick: number): number {
    let ms = 0;
    let prevTick = 0;
    let tempo = DEFAULT_MICROSECONDS_PER_BEAT;

    for (const point of tempoMap) {
      if (point.tick > tick) {
        break;
      }
      if (point.tick > prevTick) {
        ms += ((point.tick - prevTick) / ticksPerBeat) * (tempo / 1000);
        prevTick = point.tick;
      }
      tempo = point.microsecondsPerBeat;
    }

    if (tick > prevTick) {
      ms += ((tick - prevTick) / ticksPerBeat) * (tempo / 1000);
    }

    return Math.round(ms);
  }

  let events: SongEvent[] = thinned.map((note) => ({
    noteId: wrapMidiToPianoRange(note.noteNumber),
    atMs: ticksToMs(note.tick),
  }));

  events.sort((a, b) => a.atMs - b.atMs);

  // Drop exact same-time duplicates after wrap.
  const deduped: SongEvent[] = [];
  for (const event of events) {
    const prev = deduped[deduped.length - 1];
    if (prev && prev.atMs === event.atMs && prev.noteId === event.noteId) {
      continue;
    }
    deduped.push(event);
  }
  events = deduped;

  if (events.length > MAX_USER_SONG_EVENTS) {
    events = events.slice(0, MAX_USER_SONG_EVENTS);
  }

  const minAt = events.reduce((min, e) => Math.min(min, e.atMs), Infinity);
  if (minAt > 0 && Number.isFinite(minAt)) {
    for (const event of events) {
      event.atMs -= minAt;
    }
  }

  const title =
    trackName ??
    (options?.fileName ? titleFromFileName(options.fileName) : 'Imported MIDI');

  return buildUserSongDefinition({
    title,
    events,
    previewDurationMs: DEFAULT_PREVIEW_DURATION_MS,
  });
}

export function parseMidiToSong(
  bytes: ArrayLike<number>,
  options?: { fileName?: string },
): SongDefinition {
  try {
    return midiBytesToSong(bytes, options);
  } catch (error) {
    if (error instanceof UserSongParseError) {
      throw error;
    }
    throw new UserSongParseError('midiParseFailed');
  }
}
