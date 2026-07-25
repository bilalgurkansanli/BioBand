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
  /** Tick the note was released — null when the file never closes it. */
  endTick: number | null;
  noteNumber: number;
  /** 0..1, from the MIDI strike velocity. */
  velocity: number;
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

/**
 * One octave shift for the whole piece — the one leaving the fewest notes
 * outside the keyboard, breaking ties toward the range's centre.
 *
 * Folding each note into range on its own is what makes an imported tune stop
 * sounding like itself: a descending line suddenly leaps an octave up, and
 * melodic contour is the most recognisable thing a melody has. Moving the
 * whole piece keeps every interval intact.
 */
export function chooseOctaveShift(midiNumbers: number[]): number {
  if (midiNumbers.length === 0) {
    return 0;
  }

  const centre = (MIDI_C4 + MIDI_B5) / 2;
  const mean =
    midiNumbers.reduce((sum, n) => sum + n, 0) / midiNumbers.length;

  let bestShift = 0;
  let bestOutside = Infinity;
  let bestDistance = Infinity;

  for (let shift = -72; shift <= 72; shift += 12) {
    let outside = 0;
    for (const n of midiNumbers) {
      const shifted = n + shift;
      if (shifted < MIDI_C4 || shifted > MIDI_B5) {
        outside += 1;
      }
    }
    const distance = Math.abs(mean + shift - centre);

    if (outside < bestOutside || (outside === bestOutside && distance < bestDistance)) {
      bestOutside = outside;
      bestDistance = distance;
      bestShift = shift;
    }
  }

  return bestShift;
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

/** Lowest voice must sit this far under the tune to be worth keeping. */
const BASS_MIN_INTERVAL = 7;

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
 * Split notes that start nearly together into the tune (top note) and the
 * voice under it (bottom note, when it is far enough below to be a real part
 * rather than a doubling). Keeping only the top line is what strips a song of
 * the thing that identifies it — the bass of Billie Jean, the rocking left
 * hand of Für Elise — leaving a correct but unrecognisable melody.
 */
function splitChords(notes: RawNote[]): { melody: RawNote[]; bass: RawNote[] } {
  if (notes.length === 0) {
    return { melody: [], bass: [] };
  }

  const sorted = [...notes].sort(
    (a, b) => a.tick - b.tick || b.noteNumber - a.noteNumber,
  );
  const melody: RawNote[] = [];
  const bass: RawNote[] = [];

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
  let timeSignature: { numerator: number; denominator: number } | undefined;

  midi.tracks.forEach((track, trackIndex) => {
    let absTick = 0;
    const list: RawNote[] = [];
    /** Notes sounding right now, so a note-off can give them their length. */
    const open = new Map<number, RawNote>();

    const close = (noteNumber: number, tick: number): void => {
      const note = open.get(noteNumber);
      if (note) {
        note.endTick = tick;
        open.delete(noteNumber);
      }
    };

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

      // The bar line the file itself declares — better than assuming 4/4.
      if (event.type === 'timeSignature' && !timeSignature) {
        timeSignature = {
          numerator: event.numerator,
          denominator: event.denominator,
        };
      }

      if (event.type === 'noteOn' && event.velocity > 0) {
        // A retrigger without an intervening note-off ends the previous one.
        close(event.noteNumber, absTick);
        const note: RawNote = {
          tick: absTick,
          endTick: null,
          noteNumber: event.noteNumber,
          velocity: Math.min(1, Math.max(0.05, event.velocity / 127)),
          trackIndex,
        };
        open.set(event.noteNumber, note);
        list.push(note);
      } else if (
        event.type === 'noteOff' ||
        (event.type === 'noteOn' && event.velocity === 0)
      ) {
        close(event.noteNumber, absTick);
      }
    }

    if (list.length > 0) {
      notesByTrack.set(trackIndex, list);
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
  const { melody, bass } = splitChords(combined);
  const octaveShift = chooseOctaveShift(melody.map((note) => note.noteNumber));
  const bassTranspose = chooseBassTranspose(
    bass.map((note) => note.noteNumber + octaveShift),
  );

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

  const toEvent = (note: RawNote, role: 'melody' | 'accompaniment'): SongEvent => {
    const atMs = ticksToMs(note.tick);
    const durationMs =
      note.endTick !== null ? Math.max(1, ticksToMs(note.endTick) - atMs) : undefined;
    const shifted = note.noteNumber + octaveShift;

    // The shift centres the tune, which leaves the under-voice below the
    // keyboard. Folding it up a note at a time would reintroduce the very
    // leaps this converter exists to avoid — and drop the bass into the
    // melody's own register. Instead the whole under-voice takes one transpose
    // and is written on the keys that transpose lands on, so its line stays
    // intact. The melody cannot do this: the user has to press the key that
    // lights up.
    const transpose = role === 'accompaniment' ? bassTranspose : 0;
    const noteId = wrapMidiToPianoRange(shifted - transpose);

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

  events.sort((a, b) => a.atMs - b.atMs);

  // Drop exact same-time duplicates after wrap. Melody and bass are merged by
  // now, so a clash need not be adjacent within its onset group.
  const deduped: SongEvent[] = [];
  const seen = new Set<string>();
  for (const event of events) {
    // Transpose is part of the identity: a melody note and an under-voice on
    // the same key sound an octave apart and are both wanted.
    const key = `${event.atMs}:${event.noteId}:${event.transpose ?? 0}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
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

  // A quarter note in ms, from the file's own tempo. The map always opens with
  // a fallback entry at tick 0, so steadiness is about whether anything CHANGES
  // later — a file that speeds up has no single grid to tidy against and is
  // left exactly as performed.
  const openingTempo =
    [...tempoMap].filter((point) => point.tick <= 0).pop() ?? tempoMap[0];
  const quarterMs = openingTempo.microsecondsPerBeat / 1000;
  const steadyTempo = tempoMap.every(
    (point) =>
      point.tick <= 0 ||
      point.microsecondsPerBeat === openingTempo.microsecondsPerBeat,
  );

  if (steadyTempo) {
    events = deJitter(events, quarterMs / 4);
  }

  // 6/8 and 9/8 count in eighths, 2/2 in half notes: the beat is a quarter
  // scaled by the denominator the file declares.
  const meter =
    steadyTempo && timeSignature && timeSignature.denominator > 0
      ? {
          beatMs: (quarterMs * 4) / timeSignature.denominator,
          beatsPerBar: timeSignature.numerator,
        }
      : undefined;

  const lastAtMs = events.length > 0 ? events[events.length - 1].atMs : 0;

  const title =
    trackName ??
    (options?.fileName ? titleFromFileName(options.fileName) : 'Imported MIDI');

  return buildUserSongDefinition({
    title,
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
