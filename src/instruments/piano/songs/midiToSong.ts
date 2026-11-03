import {
  finishImportedEvents,
  importTitle,
  selectMelodicParts,
  splitChords,
} from '../../shared/midiArrange';
import { noteTimes, readMidiFile, type MidiFileContent, type MidiNote } from '../../shared/midiReader';
import { MAX_USER_SONG_EVENTS, readDurationMs } from '../../shared/userSongDocument';
import {
  UserSongParseError,
  buildUserSongDefinition,
  chooseOctaveShift,
  DEFAULT_PREVIEW_DURATION_MS,
  fitMidiToKeyboard,
} from './userSongSchema';
import type { SongDefinition, SongEvent } from './types';

const MIDI_C4 = 60;
const MIDI_B5 = 83;
/** Keep at most two strongest melodic parts from a multi-part MIDI. */
const MAX_TRACKS_TO_KEEP = 2;
/** Quarter note assumed when the file has no beat (SMPTE timing). */
const FALLBACK_QUARTER_MS = 500;

/**
 * How far a note may be nudged onto the sixteenth grid.
 *
 * A MIDI exported from notation software is already exact; one captured from a
 * live keyboard is a few milliseconds off on every note. That jitter is
 * inaudible on its own, but a lesson highlights each note and scores the
 * player against it, so a chart that never quite lands on the beat feels
 * loose to play along with. Only genuine jitter is pulled in — anything
 * further off is deliberate placement (swing, a triplet, rubato) and is left
 * exactly where the performer put it.
 */
const JITTER_TOLERANCE_MS = 32;

/**
 * Pull near-miss onsets onto the grid, leave everything else alone.
 * Order is preserved, and notes struck together stay together.
 */
function deJitter(events: SongEvent[], gridMs: number): SongEvent[] {
  if (!Number.isFinite(gridMs) || gridMs <= 0) {
    return events;
  }
  const tolerance = Math.min(JITTER_TOLERANCE_MS, gridMs * 0.25);
  let previous = -Infinity;

  return events.map((event) => {
    const nearest = Math.round(event.atMs / gridMs) * gridMs;
    const snapped =
      Math.abs(nearest - event.atMs) <= tolerance ? Math.round(nearest) : event.atMs;
    const atMs = Math.max(previous, snapped);
    previous = atMs;
    return atMs === event.atMs ? event : { ...event, atMs };
  });
}
/**
 * Furthest an accompaniment is sounded below the key it is written on. Beyond
 * two octaves an anchor sample is stretched past a quarter of its rate, which
 * turns muddy rather than deep.
 */
const MAX_BASS_TRANSPOSE = -24;

/**
 * One transpose for the whole under-voice: the octave placement that lands the
 * most of it on real keys. Choosing per note would leave neighbouring bass
 * notes on different octaves — the same contour damage the melody shift exists
 * to prevent, just moved into the accompaniment.
 */
export function chooseBassTranspose(shiftedMidis: number[]): number {
  if (shiftedMidis.length === 0) {
    return 0;
  }

  let best = 0;
  let bestInRange = -1;

  for (let transpose = 0; transpose >= MAX_BASS_TRANSPOSE; transpose -= 12) {
    let inRange = 0;
    for (const midi of shiftedMidis) {
      const key = midi - transpose;
      if (key >= MIDI_C4 && key <= MIDI_B5) {
        inRange += 1;
      }
    }
    // Ties keep the smallest shift, so a part that already fits is left at the
    // pitch it was written at rather than dropped an octave for no reason.
    if (inRange > bestInRange) {
      bestInRange = inRange;
      best = transpose;
    }
  }

  // Nothing fits at any octave — the part sits further below the keyboard than
  // it can be sounded. Take the deepest placement so it at least stays under
  // the tune instead of folding up into the melody's own register.
  return bestInRange > 0 ? best : MAX_BASS_TRANSPOSE;
}

/**
 * Convert a MIDI file buffer into a BioBand SongDefinition.
 * Picks the strongest melodic parts, splits chords into tune and under-voice,
 * shifts the whole piece onto the keyboard.
 */
export function midiBytesToSong(
  bytes: ArrayLike<number>,
  options?: { fileName?: string },
): SongDefinition {
  let file: MidiFileContent;
  try {
    file = readMidiFile(bytes);
  } catch {
    throw new UserSongParseError('midiParseFailed');
  }

  const combined = selectMelodicParts(file.notes, MAX_TRACKS_TO_KEEP);
  if (combined.length === 0) {
    throw new UserSongParseError('emptySong');
  }

  const { melody, bass } = splitChords(combined);
  const octaveShift = chooseOctaveShift(melody.map((note) => note.noteNumber));
  const bassTranspose = chooseBassTranspose(
    bass.map((note) => note.noteNumber + octaveShift),
  );

  const toEvent = (note: MidiNote, role: 'melody' | 'accompaniment'): SongEvent => {
    const { atMs, durationMs: rawDuration } = noteTimes(note, file.timing);
    const durationMs = readDurationMs(rawDuration);
    const shifted = note.noteNumber + octaveShift;

    // The shift centres the tune, which leaves the under-voice below the
    // keyboard. Folding it up a note at a time would reintroduce the very
    // leaps this converter exists to avoid — and drop the bass into the
    // melody's own register. Instead the whole under-voice takes one transpose
    // and is written on the keys that transpose lands on, so its line stays
    // intact. The melody cannot do this: the user has to press the key that
    // lights up.
    const transpose = role === 'accompaniment' ? bassTranspose : 0;
    const noteId = fitMidiToKeyboard(shifted - transpose);

    return {
      noteId,
      atMs,
      ...(durationMs !== undefined ? { durationMs } : {}),
      velocity: note.velocity,
      ...(role === 'accompaniment' ? { role } : {}),
      ...(transpose !== 0 ? { transpose } : {}),
    };
  };

  let events: SongEvent[] = melody.map((note) => toEvent(note, 'melody'));

  // The under-voice is only worth carrying if the tune still fits the cap.
  if (bass.length > 0 && events.length + bass.length <= MAX_USER_SONG_EVENTS) {
    events = events.concat(bass.map((note) => toEvent(note, 'accompaniment')));
  }

  // Drop exact same-time duplicates after wrap. Melody and bass are merged by
  // now, so a clash need not be adjacent within its onset group. Transpose is
  // part of the identity: a melody note and an under-voice on the same key
  // sound an octave apart and are both wanted.
  events = finishImportedEvents(events, {
    maxEvents: MAX_USER_SONG_EVENTS,
    keyOf: (event) => `${event.noteId}:${event.transpose ?? 0}`,
  });

  // A quarter note in ms, from the file's own tempo. A file that speeds up has
  // no single grid to tidy against and is left exactly as performed.
  const quarterMs = file.timing.openingQuarterMs ?? FALLBACK_QUARTER_MS;
  const steadyTempo = file.timing.steadyTempo && file.timing.openingQuarterMs !== null;

  if (steadyTempo) {
    events = deJitter(events, quarterMs / 4);
  }

  // 6/8 and 9/8 count in eighths, 2/2 in half notes: the beat is a quarter
  // scaled by the denominator the file declares.
  const timeSignature = file.timeSignature;
  const meter =
    steadyTempo && timeSignature && timeSignature.denominator > 0
      ? {
          beatMs: (quarterMs * 4) / timeSignature.denominator,
          beatsPerBar: timeSignature.numerator,
        }
      : undefined;

  const lastAtMs = events.length > 0 ? events[events.length - 1].atMs : 0;

  return buildUserSongDefinition({
    title: importTitle(file.trackName, options?.fileName),
    events,
    // Preview the opening rather than a fixed five seconds, and never run past
    // the end of a short piece.
    previewDurationMs: Math.max(
      2000,
      Math.min(DEFAULT_PREVIEW_DURATION_MS * 2, lastAtMs + quarterMs),
    ),
    meter,
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
