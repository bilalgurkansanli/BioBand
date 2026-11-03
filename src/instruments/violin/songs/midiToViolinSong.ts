import {
  finishImportedEvents,
  importTitle,
  selectMelodicParts,
  topLine,
} from '../../shared/midiArrange';
import { chooseOctaveShift as chooseShiftForRange, foldIntoRange } from '../../shared/midiPitch';
import { noteTimes, readMidiFile, type MidiFileContent } from '../../shared/midiReader';
import { MAX_USER_SONG_EVENTS, readDurationMs } from '../../shared/userSongDocument';
import { formatNoteSoundId, POSITION_COUNT, VIOLIN_STRINGS, type ViolinStringId } from '../violinSounds';
import type { ViolinSongDefinition, ViolinSongEvent } from './types';
import {
  buildUserViolinSongDefinition,
  UserViolinSongParseError,
} from './userViolinSongSchema';

const MAX_TRACKS_TO_KEEP = 2;
const VIOLIN_MIDI_MIN = Math.min(...VIOLIN_STRINGS.map((s) => s.openMidi));
const VIOLIN_MIDI_MAX = Math.max(...VIOLIN_STRINGS.map((s) => s.openMidi)) + POSITION_COUNT - 1;

/**
 * One octave shift for the whole piece — the one leaving the fewest notes
 * outside the violin's compass, breaking ties toward the middle of it.
 */
export function chooseOctaveShift(midiNumbers: number[]): number {
  return chooseShiftForRange(midiNumbers, VIOLIN_MIDI_MIN, VIOLIN_MIDI_MAX);
}

/**
 * Land a pitch on the fingerboard, folding only what the whole-piece shift
 * missed, then pick the best string/position for it.
 */
export function midiToViolinSoundId(midiNumber: number): string {
  const n = foldIntoRange(midiNumber, VIOLIN_MIDI_MIN, VIOLIN_MIDI_MAX);
  if (n === null) {
    return formatNoteSoundId('v2', 0);
  }

  let best: { stringId: ViolinStringId; position: number; score: number } | null = null;
  for (const string of VIOLIN_STRINGS) {
    const position = n - string.openMidi;
    if (position < 0 || position > POSITION_COUNT - 1) {
      continue;
    }
    // Prefer lower positions (open strings/easier shapes), slight bias toward middle strings.
    const score = -position * 10 - Math.abs(2.5 - Number(string.id.slice(1)));
    if (!best || score > best.score) {
      best = { stringId: string.id, position, score };
    }
  }

  if (!best) {
    return formatNoteSoundId('v2', 0);
  }
  return formatNoteSoundId(best.stringId, best.position);
}

export function midiBytesToViolinSong(
  bytes: ArrayLike<number>,
  options?: { fileName?: string },
): ViolinSongDefinition & { artist?: string } {
  let file: MidiFileContent;
  try {
    file = readMidiFile(bytes);
  } catch {
    throw new UserViolinSongParseError('midiParseFailed');
  }

  // One bow, one note: an under-voice would only be reachable as a double stop
  // on an adjacent string, which arbitrary imported intervals cannot promise.
  const rawNotes = topLine(selectMelodicParts(file.notes, MAX_TRACKS_TO_KEEP));
  if (rawNotes.length === 0) {
    throw new UserViolinSongParseError('emptySong');
  }

  const octaveShift = chooseOctaveShift(rawNotes.map((note) => note.noteNumber));

  let events: ViolinSongEvent[] = rawNotes.map((note) => {
    const { atMs, durationMs: rawDuration } = noteTimes(note, file.timing);
    const durationMs = readDurationMs(rawDuration);
    return {
      soundId: midiToViolinSoundId(note.noteNumber + octaveShift),
      atMs,
      ...(durationMs !== undefined ? { durationMs } : {}),
      velocity: note.velocity,
    };
  });

  events = finishImportedEvents(events, {
    maxEvents: MAX_USER_SONG_EVENTS,
    keyOf: (event) => event.soundId,
    compare: (a, b) => a.soundId.localeCompare(b.soundId),
  });

  return buildUserViolinSongDefinition({
    title: importTitle(file.trackName, options?.fileName),
    events,
  });
}

export function parseMidiToViolinSong(
  bytes: ArrayLike<number>,
  options?: { fileName?: string },
): ViolinSongDefinition & { artist?: string } {
  try {
    return midiBytesToViolinSong(bytes, options);
  } catch (error) {
    if (error instanceof UserViolinSongParseError) {
      throw error;
    }
    throw new UserViolinSongParseError('midiParseFailed');
  }
}
