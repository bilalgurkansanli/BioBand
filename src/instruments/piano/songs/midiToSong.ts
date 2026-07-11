import { parseMidi } from 'midi-file';

import { PIANO_NOTES, type NoteId } from '../pianoNotes';
import {
  UserSongParseError,
  buildUserSongDefinition,
  DEFAULT_PREVIEW_DURATION_MS,
} from './userSongSchema';
import type { SongDefinition, SongEvent } from './types';

const MIDI_C4 = 60;
const MIDI_B5 = 83;
const DEFAULT_MICROSECONDS_PER_BEAT = 500_000;

const NOTE_ID_BY_MIDI = new Map<number, NoteId>(
  PIANO_NOTES.map((note) => [note.midi, note.id]),
);

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
    // Should not happen for 60–83 chromatic range.
    return 'C4';
  }
  return noteId;
}

function titleFromFileName(fileName: string): string {
  const base = fileName.replace(/\.(mid|midi)$/i, '').trim();
  return base.length > 0 ? base : 'Imported MIDI';
}

/**
 * Convert a MIDI file buffer into a BioBand SongDefinition.
 * Collects note-on events (velocity > 0) from all tracks, with tempo map.
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
  // Absolute tick → microseconds-per-beat (tempo may change).
  const tempoMap: { tick: number; microsecondsPerBeat: number }[] = [
    { tick: 0, microsecondsPerBeat: DEFAULT_MICROSECONDS_PER_BEAT },
  ];

  const rawNotes: { tick: number; noteNumber: number }[] = [];
  let trackName: string | undefined;

  for (const track of midi.tracks) {
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

      // noteOn with velocity 0 is note-off — skip.
      if (event.type === 'noteOn' && event.velocity > 0) {
        rawNotes.push({ tick: absTick, noteNumber: event.noteNumber });
      }
    }
  }

  if (rawNotes.length === 0) {
    throw new UserSongParseError('emptySong');
  }

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

  const events: SongEvent[] = rawNotes.map((note) => ({
    noteId: wrapMidiToPianoRange(note.noteNumber),
    atMs: ticksToMs(note.tick),
  }));

  // Shift so the first note starts at 0.
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

// Re-export so callers can catch with one error type; map midiParseFailed.
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
