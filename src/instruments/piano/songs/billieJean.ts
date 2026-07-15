import type { SongDefinition } from './types';
import { BILLIE_JEAN_EVENTS } from './billieJeanEvents';

const LAST_MS = BILLIE_JEAN_EVENTS[BILLIE_JEAN_EVENTS.length - 1]?.atMs ?? 0;

// "Bir kısmı": first vocal chorus (~50 notes), 0-based indices 128–177.
const PARTIAL_START_INDEX = 128;
const PARTIAL_END_INDEX = 177;
const partialFirst = BILLIE_JEAN_EVENTS[PARTIAL_START_INDEX];
const partialLast = BILLIE_JEAN_EVENTS[PARTIAL_END_INDEX];

export const billieJeanSong: SongDefinition = {
  id: 'billie-jean',
  title: 'Billie Jean',
  artist: 'Michael Jackson',
  descriptionKey: 'tutorial.songs.billieJean.description',
  previewDurationMs: Math.min(12000, LAST_MS + 500),
  events: BILLIE_JEAN_EVENTS,
  partialWindowMs:
    partialFirst && partialLast
      ? {
          startMs: partialFirst.atMs,
          endMs: partialLast.atMs,
        }
      : undefined,
};
