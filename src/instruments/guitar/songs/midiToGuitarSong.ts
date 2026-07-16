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

type RawNote = {
  tick: number;
  noteNumber: number;
  trackIndex: number;
};

function titleFromFileName(fileName: string): string {
  const base = fileName.replace(/\.(mid|midi)$/i, '').trim();
  return base.length > 0 ? base : 'Imported MIDI';
}

/** Wrap any pitch into the fretted guitar range, then pick best string/fret. */
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
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_TRACKS_TO_KEEP);

  const rawNotes = thinChords(ranked.flatMap((entry) => entry.notes));
  if (rawNotes.length === 0) {
    throw new UserGuitarSongParseError('emptySong');
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

  let events: GuitarSongEvent[] = rawNotes.map((note) => ({
    soundId: midiToGuitarSoundId(note.noteNumber),
    atMs: ticksToMs(note.tick),
  }));

  events.sort((a, b) => a.atMs - b.atMs || a.soundId.localeCompare(b.soundId));

  const deduped: GuitarSongEvent[] = [];
  for (const event of events) {
    const prev = deduped[deduped.length - 1];
    if (prev && prev.atMs === event.atMs && prev.soundId === event.soundId) {
      continue;
    }
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
