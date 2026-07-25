import { parseMidi } from 'midi-file';

import type { DrumSoundId } from '../drumsSounds';
import type { DrumSongDefinition, DrumSongEvent } from './types';
import {
  buildUserDrumSongDefinition,
  MAX_USER_DRUM_EVENTS,
  UserDrumSongParseError,
} from './userDrumSongSchema';

const DEFAULT_MICROSECONDS_PER_BEAT = 500_000;

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

type RawHit = {
  tick: number;
  padId: DrumSoundId;
  /** 0..1, from the MIDI strike velocity. A struck drum has no written length. */
  velocity: number;
};

function titleFromFileName(fileName: string): string {
  const base = fileName.replace(/\.(mid|midi)$/i, '').trim();
  return base.length > 0 ? base : 'Imported MIDI';
}

function mapNoteToPad(noteNumber: number): DrumSoundId | null {
  return GM_NOTE_TO_PAD[noteNumber] ?? null;
}

/**
 * Convert a MIDI file into a drums chart using General MIDI percussion
 * note numbers (kick/snare/hats/toms/cymbals). Melodic-only MIDIs yield emptySong.
 */
export function midiBytesToDrumSong(
  bytes: ArrayLike<number>,
  options?: { fileName?: string },
): DrumSongDefinition & { artist?: string } {
  let midi;
  try {
    midi = parseMidi(bytes);
  } catch {
    throw new UserDrumSongParseError('midiParseFailed');
  }

  const ticksPerBeat = midi.header.ticksPerBeat ?? 480;
  const tempoMap: { tick: number; microsecondsPerBeat: number }[] = [
    { tick: 0, microsecondsPerBeat: DEFAULT_MICROSECONDS_PER_BEAT },
  ];

  const hits: RawHit[] = [];
  let trackName: string | undefined;

  midi.tracks.forEach((track) => {
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

      if (event.type === 'noteOn' && event.velocity > 0) {
        const padId = mapNoteToPad(event.noteNumber);
        if (!padId) {
          continue;
        }
        hits.push({
          tick: absTick,
          padId,
          velocity: Math.min(1, Math.max(0.05, event.velocity / 127)),
        });
      }
    }
  });

  if (hits.length === 0) {
    throw new UserDrumSongParseError('emptySong');
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

  let events: DrumSongEvent[] = hits.map((hit) => ({
    padId: hit.padId,
    atMs: ticksToMs(hit.tick),
    velocity: hit.velocity,
  }));

  events.sort((a, b) => a.atMs - b.atMs || a.padId.localeCompare(b.padId));

  const deduped: DrumSongEvent[] = [];
  for (const event of events) {
    const prev = deduped[deduped.length - 1];
    if (prev && prev.atMs === event.atMs && prev.padId === event.padId) {
      continue;
    }
    deduped.push(event);
  }
  events = deduped;

  if (events.length > MAX_USER_DRUM_EVENTS) {
    events = events.slice(0, MAX_USER_DRUM_EVENTS);
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

  return buildUserDrumSongDefinition({ title, events });
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
