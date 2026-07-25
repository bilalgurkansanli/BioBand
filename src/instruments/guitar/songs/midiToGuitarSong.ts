import { parseMidi } from 'midi-file';

import {
  formatPluckSoundId,
  GUITAR_MAX_FRET,
  GUITAR_STRINGS,
  type GuitarStringId,
} from '../guitarSounds';
import type { GuitarSongDefinition, GuitarSongEvent } from './types';
import {
  buildUserGuitarSongDefinition,
  MAX_USER_GUITAR_EVENTS,
  UserGuitarSongParseError,
} from './userGuitarSongSchema';

const DEFAULT_MICROSECONDS_PER_BEAT = 500_000;
const MAX_TRACKS_TO_KEEP = 2;
const CHORD_TICK_WINDOW = 8;
const GUITAR_MIDI_MIN = 40; // E2
const GUITAR_MIDI_MAX = 76; // E5 (12th fret high e)
/** Lowest voice must sit this far under the tune to be worth keeping. */
const BASS_MIN_INTERVAL = 7;

type RawNote = {
  tick: number;
  /** Tick the note was released — null when the file never closes it. */
  endTick: number | null;
  noteNumber: number;
  /** 0..1, from the MIDI strike velocity. */
  velocity: number;
  trackIndex: number;
};

function titleFromFileName(fileName: string): string {
  const base = fileName.replace(/\.(mid|midi)$/i, '').trim();
  return base.length > 0 ? base : 'Imported MIDI';
}

/**
 * One octave shift for the whole piece — the one leaving the fewest notes off
 * the fretboard, breaking ties toward the middle of the neck.
 *
 * Folding each note into range on its own is what makes an imported riff stop
 * sounding like itself: a descending line suddenly leaps an octave up, and
 * contour is the most recognisable thing a line has. Moving the whole piece
 * keeps every interval intact.
 */
export function chooseOctaveShift(midiNumbers: number[]): number {
  if (midiNumbers.length === 0) {
    return 0;
  }

  const centre = (GUITAR_MIDI_MIN + GUITAR_MIDI_MAX) / 2;
  const mean = midiNumbers.reduce((sum, n) => sum + n, 0) / midiNumbers.length;

  let bestShift = 0;
  let bestOutside = Infinity;
  let bestDistance = Infinity;

  for (let shift = -72; shift <= 72; shift += 12) {
    let outside = 0;
    for (const n of midiNumbers) {
      const shifted = n + shift;
      if (shifted < GUITAR_MIDI_MIN || shifted > GUITAR_MIDI_MAX) {
        outside += 1;
      }
    }
    const distance = Math.abs(mean + shift - centre);

    if (
      outside < bestOutside ||
      (outside === bestOutside && distance < bestDistance)
    ) {
      bestOutside = outside;
      bestDistance = distance;
      bestShift = shift;
    }
  }

  return bestShift;
}

/**
 * Land a pitch on the fretboard, folding only what the whole-piece shift
 * missed, then pick the best string/fret for it.
 */
export function midiToGuitarSoundId(midiNumber: number): string {
  let n = Math.round(midiNumber);
  while (n < GUITAR_MIDI_MIN) {
    n += 12;
  }
  while (n > GUITAR_MIDI_MAX) {
    n -= 12;
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

function scoreTrack(notes: RawNote[]): number {
  if (notes.length === 0) {
    return -Infinity;
  }
  const avgPitch =
    notes.reduce((sum, note) => sum + note.noteNumber, 0) / notes.length;
  return notes.length * 2 + avgPitch;
}

/**
 * Split notes that start nearly together into the tune (top note) and the
 * voice under it (bottom note, when it is far enough below to be a real part
 * rather than a doubling). Keeping only the top line is what strips a song of
 * the thing that identifies it — the walking bass of a blues, the low riff of
 * Nothing Else Matters — leaving a correct but unrecognisable melody.
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

export function midiBytesToGuitarSong(
  bytes: ArrayLike<number>,
  options?: { fileName?: string },
): GuitarSongDefinition & { artist?: string } {
  let midi;
  try {
    midi = parseMidi(bytes);
  } catch {
    throw new UserGuitarSongParseError('midiParseFailed');
  }

  const ticksPerBeat = midi.header.ticksPerBeat ?? 480;
  const tempoMap: { tick: number; microsecondsPerBeat: number }[] = [
    { tick: 0, microsecondsPerBeat: DEFAULT_MICROSECONDS_PER_BEAT },
  ];

  const notesByTrack = new Map<number, RawNote[]>();
  let trackName: string | undefined;

  midi.tracks.forEach((track, trackIndex) => {
    let absTick = 0;
    const list: RawNote[] = [];
    /** Notes sounding right now, so a note-off can give them their ring time. */
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

      // Skip GM drum channel 10 (0-based channel 9).
      if (
        event.type === 'noteOn' &&
        event.velocity > 0 &&
        !('channel' in event && event.channel === 9)
      ) {
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
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_TRACKS_TO_KEEP);

  const { melody, bass } = splitChords(ranked.flatMap((entry) => entry.notes));
  if (melody.length === 0) {
    throw new UserGuitarSongParseError('emptySong');
  }

  const octaveShift = chooseOctaveShift(melody.map((note) => note.noteNumber));

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

  const toEvent = (
    note: RawNote,
    role: 'melody' | 'accompaniment',
  ): GuitarSongEvent => {
    const atMs = ticksToMs(note.tick);
    const durationMs =
      note.endTick !== null ? Math.max(1, ticksToMs(note.endTick) - atMs) : undefined;
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
  if (bass.length > 0 && events.length + bass.length <= MAX_USER_GUITAR_EVENTS) {
    events = events.concat(bass.map((note) => toEvent(note, 'accompaniment')));
  }

  events.sort((a, b) => a.atMs - b.atMs || a.soundId.localeCompare(b.soundId));

  // Drop exact same-time duplicates after fitting. Melody and bass are merged
  // by now, so a clash need not be adjacent within its onset group.
  const deduped: GuitarSongEvent[] = [];
  const seen = new Set<string>();
  for (const event of events) {
    const key = `${event.atMs}:${event.soundId}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    deduped.push(event);
  }
  events = deduped;

  if (events.length > MAX_USER_GUITAR_EVENTS) {
    events = events.slice(0, MAX_USER_GUITAR_EVENTS);
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

  return buildUserGuitarSongDefinition({ title, events });
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
