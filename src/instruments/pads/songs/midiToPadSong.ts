import { finishImportedEvents, importTitle, percussionNotes } from '../../shared/midiArrange';
import { noteTimes, readMidiFile, type MidiFileContent } from '../../shared/midiReader';
import { MAX_USER_SONG_EVENTS, readDurationMs } from '../../shared/userSongDocument';
import type { PadSoundId } from '../padsSounds';
import type { PadSongDefinition, PadSongEvent } from './types';
import {
  buildUserPadSongDefinition,
  UserPadSongParseError,
} from './userPadSongSchema';

/**
 * General MIDI percussion note -> PadSoundId.
 * Same drum mapping as drums, but targeting pad01–pad08.
 * Pads are addressed by identity, not by pitch — transposing an import would
 * only send hits to the wrong pads, so no octave fitting happens here.
 */
const GM_NOTE_TO_PAD: Record<number, PadSoundId> = {
  35: 'pad01', // kick
  36: 'pad01',
  37: 'pad02', // snare
  38: 'pad02',
  39: 'pad02',
  40: 'pad02',
  41: 'pad05', // tom low -> pad05
  42: 'pad03', // hihat closed
  43: 'pad05', // tom low
  44: 'pad03', // hihat closed
  45: 'pad05', // tom low
  46: 'pad04', // hihat open
  47: 'pad06', // tom mid -> pad06 (perc)
  48: 'pad06', // tom mid
  49: 'pad07', // crash -> pad07 (fx1)
  50: 'pad05', // tom hi -> pad05
  51: 'pad08', // ride -> pad08 (fx2)
  52: 'pad07', // crash
  53: 'pad08', // ride
  55: 'pad07', // crash
  57: 'pad07', // crash
  59: 'pad08', // ride
};

function mapNoteToPad(noteNumber: number): PadSoundId | null {
  return GM_NOTE_TO_PAD[noteNumber] ?? null;
}

/**
 * Convert a MIDI file into a pads chart from its General MIDI percussion. Only
 * the drum channel is read when the file has one.
 */
export function midiBytesToPadSong(
  bytes: ArrayLike<number>,
  options?: { fileName?: string },
): PadSongDefinition & { artist?: string } {
  let file: MidiFileContent;
  try {
    file = readMidiFile(bytes);
  } catch {
    throw new UserPadSongParseError('midiParseFailed');
  }

  const events: PadSongEvent[] = [];
  for (const note of percussionNotes(file)) {
    const padId = mapNoteToPad(note.noteNumber);
    if (!padId) {
      continue;
    }
    const { atMs, durationMs: rawDuration } = noteTimes(note, file.timing);
    const durationMs = readDurationMs(rawDuration);
    events.push({
      padId,
      atMs,
      ...(durationMs !== undefined ? { durationMs } : {}),
      velocity: note.velocity,
    });
  }

  if (events.length === 0) {
    throw new UserPadSongParseError('emptySong');
  }

  return buildUserPadSongDefinition({
    title: importTitle(file.trackName, options?.fileName),
    events: finishImportedEvents(events, {
      maxEvents: MAX_USER_SONG_EVENTS,
      keyOf: (event) => event.padId,
      compare: (a, b) => a.padId.localeCompare(b.padId),
    }),
  });
}

export function parseMidiToPadSong(
  bytes: ArrayLike<number>,
  options?: { fileName?: string },
): PadSongDefinition & { artist?: string } {
  try {
    return midiBytesToPadSong(bytes, options);
  } catch (error) {
    if (error instanceof UserPadSongParseError) {
      throw error;
    }
    throw new UserPadSongParseError('midiParseFailed');
  }
}
