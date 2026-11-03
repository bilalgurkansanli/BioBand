import {
  finishImportedEvents,
  importTitle,
  selectMelodicParts,
  splitChords,
} from '../../shared/midiArrange';
import { chooseOctaveShift as chooseShiftForRange, foldIntoRange } from '../../shared/midiPitch';
import { noteTimes, readMidiFile, type MidiFileContent, type MidiNote } from '../../shared/midiReader';
import { MAX_USER_SONG_EVENTS, readDurationMs } from '../../shared/userSongDocument';
import {
  formatPluckSoundId,
  GUITAR_MAX_FRET,
  GUITAR_STRINGS,
  type GuitarStringId,
} from '../guitarSounds';
import type { GuitarSongDefinition, GuitarSongEvent } from './types';
import {
  buildUserGuitarSongDefinition,
  UserGuitarSongParseError,
} from './userGuitarSongSchema';

const MAX_TRACKS_TO_KEEP = 2;
const GUITAR_MIDI_MIN = 40; // E2
const GUITAR_MIDI_MAX = 76; // E5 (12th fret high e)

/**
 * One octave shift for the whole piece — the one leaving the fewest notes off
 * the fretboard, breaking ties toward the middle of the neck.
 */
export function chooseOctaveShift(midiNumbers: number[]): number {
  return chooseShiftForRange(midiNumbers, GUITAR_MIDI_MIN, GUITAR_MIDI_MAX);
}

/**
 * Land a pitch on the fretboard, folding only what the whole-piece shift
 * missed, then pick the best string/fret for it.
 */
export function midiToGuitarSoundId(midiNumber: number): string {
  const n = foldIntoRange(midiNumber, GUITAR_MIDI_MIN, GUITAR_MIDI_MAX);
  if (n === null) {
    return formatPluckSoundId('s4', 0);
  }

  let best: { stringId: GuitarStringId; fret: number; score: number } | null = null;
  for (const string of GUITAR_STRINGS) {
    const fret = n - string.openMidi;
    if (fret < 0 || fret > GUITAR_MAX_FRET) {
      continue;
    }
    // Prefer lower frets (easier shapes) and mid strings slightly.
    const score = -fret * 10 - Math.abs(3.5 - Number(string.id.slice(1)));
    if (!best || score > best.score) {
      best = { stringId: string.id, fret, score };
    }
  }

  if (!best) {
    return formatPluckSoundId('s4', 0);
  }
  return formatPluckSoundId(best.stringId, best.fret);
}

export function midiBytesToGuitarSong(
  bytes: ArrayLike<number>,
  options?: { fileName?: string },
): GuitarSongDefinition & { artist?: string } {
  let file: MidiFileContent;
  try {
    file = readMidiFile(bytes);
  } catch {
    throw new UserGuitarSongParseError('midiParseFailed');
  }

  // Splitting keeps the walking bass of a blues or the low riff of Nothing
  // Else Matters as accompaniment instead of discarding it.
  const { melody, bass } = splitChords(selectMelodicParts(file.notes, MAX_TRACKS_TO_KEEP));
  if (melody.length === 0) {
    throw new UserGuitarSongParseError('emptySong');
  }

  const octaveShift = chooseOctaveShift(melody.map((note) => note.noteNumber));

  const toEvent = (note: MidiNote, role: 'melody' | 'accompaniment'): GuitarSongEvent => {
    const { atMs, durationMs: rawDuration } = noteTimes(note, file.timing);
    const durationMs = readDurationMs(rawDuration);
    return {
      soundId: midiToGuitarSoundId(note.noteNumber + octaveShift),
      atMs,
      ...(durationMs !== undefined ? { durationMs } : {}),
      velocity: note.velocity,
      ...(role === 'accompaniment' ? { role } : {}),
    };
  };

  let events: GuitarSongEvent[] = melody.map((note) => toEvent(note, 'melody'));

  // The under-voice is only worth carrying if the tune still fits the cap.
  if (bass.length > 0 && events.length + bass.length <= MAX_USER_SONG_EVENTS) {
    events = events.concat(bass.map((note) => toEvent(note, 'accompaniment')));
  }

  // Drop exact same-time duplicates after fitting. Melody and bass are merged
  // by now, so a clash need not be adjacent within its onset group.
  events = finishImportedEvents(events, {
    maxEvents: MAX_USER_SONG_EVENTS,
    keyOf: (event) => event.soundId,
    compare: (a, b) => a.soundId.localeCompare(b.soundId),
  });

  return buildUserGuitarSongDefinition({
    title: importTitle(file.trackName, options?.fileName),
    events,
  });
}

export function parseMidiToGuitarSong(
  bytes: ArrayLike<number>,
  options?: { fileName?: string },
): GuitarSongDefinition & { artist?: string } {
  try {
    return midiBytesToGuitarSong(bytes, options);
  } catch (error) {
    if (error instanceof UserGuitarSongParseError) {
      throw error;
    }
    throw new UserGuitarSongParseError('midiParseFailed');
  }
}
