import { parseMidi } from 'midi-file';

import type { PadSoundId } from '../padsSounds';
import type { PadSongDefinition, PadSongEvent } from './types';
import {
  buildUserPadSongDefinition,
  MAX_USER_PAD_EVENTS,
  UserPadSongParseError,
} from './userPadSongSchema';

const DEFAULT_MICROSECONDS_PER_BEAT = 500_000;

/**
 * General MIDI percussion note -> PadSoundId.
 * Same drum mapping as drums, but targeting pad01–pad08.
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

type RawHit = {
  tick: number;
  padId: PadSoundId;
};

function titleFromFileName(fileName: string): string {
  const base = fileName.replace(/\.(mid|midi)$/i, '').trim();
  return base.length > 0 ? base : 'Imported MIDI';
}

function mapNoteToPad(noteNumber: number): PadSoundId | null {
  return GM_NOTE_TO_PAD[noteNumber] ?? null;
}

export function midiBytesToPadSong(
  bytes: ArrayLike<number>,
  options?: { fileName?: string },
): PadSongDefinition & { artist?: string } {
  let midi;
  try {
    midi = parseMidi(bytes);
  } catch {
    throw new UserPadSongParseError('midiParseFailed');
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
        hits.push({ tick: absTick, padId });
      }
    }
  });

  if (hits.length === 0) {
    throw new UserPadSongParseError('emptySong');
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

  let events: PadSongEvent[] = hits.map((h) => ({
    padId: h.padId,
    atMs: ticksToMs(h.tick),
  }));

  events.sort((a, b) => a.atMs - b.atMs || a.padId.localeCompare(b.padId));

  const deduped: PadSongEvent[] = [];
  for (const event of events) {
    const prev = deduped[deduped.length - 1];
    if (prev && prev.atMs === event.atMs && prev.padId === event.padId) {
      continue;
    }
    deduped.push(event);
  }
  events = deduped;

  if (events.length > MAX_USER_PAD_EVENTS) {
    events = events.slice(0, MAX_USER_PAD_EVENTS);
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

  return buildUserPadSongDefinition({ title, events });
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
