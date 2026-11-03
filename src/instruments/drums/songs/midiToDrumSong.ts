import { finishImportedEvents, importTitle, percussionNotes } from '../../shared/midiArrange';
import { readMidiFile, type MidiFileContent } from '../../shared/midiReader';
import { MAX_USER_SONG_EVENTS } from '../../shared/userSongDocument';
import type { DrumSoundId } from '../drumsSounds';
import type { DrumSongDefinition, DrumSongEvent } from './types';
import {
  buildUserDrumSongDefinition,
  UserDrumSongParseError,
} from './userDrumSongSchema';

/**
 * General MIDI percussion note → BioBand pad.
 * Unmapped percussion (claves, shakers, etc.) is skipped.
 * Pads are addressed by identity, not by pitch — transposing an import would
 * only send hits to the wrong pads, so no octave fitting happens here.
 */
const GM_NOTE_TO_PAD: Record<number, DrumSoundId> = {
  35: 'kick',
  36: 'kick',
  37: 'snare',
  38: 'snare',
  39: 'snare',
  40: 'snare',
  41: 'tomLow',
  42: 'hihatClosed',
  43: 'tomLow',
  44: 'hihatClosed',
  45: 'tomLow',
  46: 'hihatOpen',
  47: 'tomMid',
  48: 'tomMid',
  49: 'crash',
  50: 'tomHi',
  51: 'ride',
  52: 'crash',
  53: 'ride',
  55: 'crash',
  57: 'crash',
  59: 'ride',
};

function mapNoteToPad(noteNumber: number): DrumSoundId | null {
  return GM_NOTE_TO_PAD[noteNumber] ?? null;
}

/**
 * Convert a MIDI file into a drums chart using General MIDI percussion
 * note numbers (kick/snare/hats/toms/cymbals). Only the drum channel is read
 * when the file has one. Melodic-only MIDIs yield emptySong.
 */
export function midiBytesToDrumSong(
  bytes: ArrayLike<number>,
  options?: { fileName?: string },
): DrumSongDefinition & { artist?: string } {
  let file: MidiFileContent;
  try {
    file = readMidiFile(bytes);
  } catch {
    throw new UserDrumSongParseError('midiParseFailed');
  }

  // A struck drum has no written length, so only the onset is kept.
  const events: DrumSongEvent[] = [];
  for (const note of percussionNotes(file)) {
    const padId = mapNoteToPad(note.noteNumber);
    if (padId) {
      events.push({ padId, atMs: file.timing.toMs(note.tick), velocity: note.velocity });
    }
  }

  if (events.length === 0) {
    throw new UserDrumSongParseError('emptySong');
  }

  return buildUserDrumSongDefinition({
    title: importTitle(file.trackName, options?.fileName),
    events: finishImportedEvents(events, {
      maxEvents: MAX_USER_SONG_EVENTS,
      keyOf: (event) => event.padId,
      compare: (a, b) => a.padId.localeCompare(b.padId),
    }),
  });
}

export function parseMidiToDrumSong(
  bytes: ArrayLike<number>,
  options?: { fileName?: string },
): DrumSongDefinition & { artist?: string } {
  try {
    return midiBytesToDrumSong(bytes, options);
  } catch (error) {
    if (error instanceof UserDrumSongParseError) {
      throw error;
    }
    throw new UserDrumSongParseError('midiParseFailed');
  }
}
