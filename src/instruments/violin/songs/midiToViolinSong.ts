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
  noteNumber: number;
  trackIndex: number;
};

function titleFromFileName(fileName: string): string {
  const base = fileName.replace(/\.(mid|midi)$/i, '').trim();
  return base.length > 0 ? base : 'Imported MIDI';
}

/** Wrap any pitch into the violin's playable range, then pick best string/position. */
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
    throw new UserViolinSongParseError('emptySong');
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

  let events: ViolinSongEvent[] = rawNotes.map((note) => ({
    soundId: midiToViolinSoundId(note.noteNumber),
    atMs: ticksToMs(note.tick),
  }));

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
