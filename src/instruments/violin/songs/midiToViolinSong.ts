import { parseMidi } from 'midi-file';

import { formatNoteSoundId, POSITION_COUNT, VIOLIN_STRINGS, type ViolinStringId } from '../violinSounds';
import type { ViolinSongDefinition, ViolinSongEvent } from './types';
import {
  buildUserViolinSongDefinition,
  MAX_USER_VIOLIN_EVENTS,
  UserViolinSongParseError,
} from './userViolinSongSchema';

const DEFAULT_MICROSECONDS_PER_BEAT = 500_000;
const MAX_TRACKS_TO_KEEP = 2;
const CHORD_TICK_WINDOW = 8;
const VIOLIN_MIDI_MIN = Math.min(...VIOLIN_STRINGS.map((s) => s.openMidi));
const VIOLIN_MIDI_MAX = Math.max(...VIOLIN_STRINGS.map((s) => s.openMidi)) + POSITION_COUNT - 1;

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
 * One octave shift for the whole piece — the one leaving the fewest notes
 * outside the violin's compass, breaking ties toward the middle of it.
 *
 * Folding each note into range on its own is what makes an imported tune stop
 * sounding like itself: a descending line suddenly leaps an octave up, and
 * contour is the most recognisable thing a melody has. Moving the whole piece
 * keeps every interval intact.
 */
export function chooseOctaveShift(midiNumbers: number[]): number {
  if (midiNumbers.length === 0) {
    return 0;
  }

  const centre = (VIOLIN_MIDI_MIN + VIOLIN_MIDI_MAX) / 2;
  const mean = midiNumbers.reduce((sum, n) => sum + n, 0) / midiNumbers.length;

  let bestShift = 0;
  let bestOutside = Infinity;
  let bestDistance = Infinity;

  for (let shift = -72; shift <= 72; shift += 12) {
    let outside = 0;
    for (const n of midiNumbers) {
      const shifted = n + shift;
      if (shifted < VIOLIN_MIDI_MIN || shifted > VIOLIN_MIDI_MAX) {
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
 * Land a pitch on the fingerboard, folding only what the whole-piece shift
 * missed, then pick the best string/position for it.
 */
export function midiToViolinSoundId(midiNumber: number): string {
  let n = Math.round(midiNumber);
  while (n < VIOLIN_MIDI_MIN) {
    n += 12;
  }
  while (n > VIOLIN_MIDI_MAX) {
    n -= 12;
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

function scoreTrack(notes: RawNote[]): number {
  if (notes.length === 0) {
    return -Infinity;
  }
  const avgPitch =
    notes.reduce((sum, note) => sum + note.noteNumber, 0) / notes.length;
  return notes.length * 2 + avgPitch;
}

/**
 * One bow, one note: simultaneous pitches collapse to the top line. An
 * under-voice would only be reachable as a double stop on an adjacent string,
 * which arbitrary imported intervals cannot promise.
 */
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

export function midiBytesToViolinSong(
  bytes: ArrayLike<number>,
  options?: { fileName?: string },
): ViolinSongDefinition & { artist?: string } {
  let midi;
  try {
    midi = parseMidi(bytes);
  } catch {
    throw new UserViolinSongParseError('midiParseFailed');
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
    /** Notes sounding right now, so a note-off can give them their bow length. */
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

  const rawNotes = thinChords(ranked.flatMap((entry) => entry.notes));
  if (rawNotes.length === 0) {
    throw new UserViolinSongParseError('emptySong');
  }

  const octaveShift = chooseOctaveShift(rawNotes.map((note) => note.noteNumber));

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

  let events: ViolinSongEvent[] = rawNotes.map((note) => {
    const atMs = ticksToMs(note.tick);
    const durationMs =
      note.endTick !== null ? Math.max(1, ticksToMs(note.endTick) - atMs) : undefined;
    return {
      soundId: midiToViolinSoundId(note.noteNumber + octaveShift),
      atMs,
      ...(durationMs !== undefined ? { durationMs } : {}),
      velocity: note.velocity,
    };
  });

  events.sort((a, b) => a.atMs - b.atMs || a.soundId.localeCompare(b.soundId));

  const deduped: ViolinSongEvent[] = [];
  for (const event of events) {
    const prev = deduped[deduped.length - 1];
    if (prev && prev.atMs === event.atMs && prev.soundId === event.soundId) {
      continue;
    }
    deduped.push(event);
  }
  events = deduped;

  if (events.length > MAX_USER_VIOLIN_EVENTS) {
    events = events.slice(0, MAX_USER_VIOLIN_EVENTS);
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

  return buildUserViolinSongDefinition({ title, events });
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
