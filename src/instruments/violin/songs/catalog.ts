import {
  CROSS_STRING_EVENTS,
  CROSS_STRING_METER,
  G_SCALE_EVENTS,
  G_SCALE_METER,
  MIXED_WARMUP_EVENTS,
  OPEN_STRINGS_EVENTS,
  OPEN_STRINGS_METER,
  TWINKLE_MOTIF_EVENTS,
  TWINKLE_MOTIF_METER,
} from './patterns';
import { VIOLIN_EXTRA_SONGS } from './patternsExtra';
import type { ViolinSongDefinition } from './types';

/** Warm-up exercises — real songs lead the list, these close it. */
const VIOLIN_EXERCISES: ViolinSongDefinition[] = [
  {
    id: 'open-strings',
    title: 'Open Strings',
    difficulty: 'easy',
    events: OPEN_STRINGS_EVENTS,
    partialCount: 4,
    meter: OPEN_STRINGS_METER,
  },
  {
    id: 'g-scale',
    title: 'G String Scale',
    difficulty: 'easy',
    events: G_SCALE_EVENTS,
    partialCount: 5,
    meter: G_SCALE_METER,
  },
  {
    id: 'twinkle-motif',
    title: 'Twinkle Motif',
    difficulty: 'easy',
    events: TWINKLE_MOTIF_EVENTS,
    partialCount: 7,
    meter: TWINKLE_MOTIF_METER,
  },
  {
    id: 'cross-string',
    title: 'Cross-String Arpeggio',
    difficulty: 'medium',
    events: CROSS_STRING_EVENTS,
    partialCount: 7,
    meter: CROSS_STRING_METER,
  },
  {
    // Free-time by design — the run and the return are twice the speed of the
    // steps around them, so no meter is claimed.
    id: 'mixed-warmup',
    title: 'Mixed Warm-up',
    difficulty: 'hard',
    events: MIXED_WARMUP_EVENTS,
    partialCount: 6,
  },
];

export const VIOLIN_SONGS: ViolinSongDefinition[] = [
  ...VIOLIN_EXTRA_SONGS,
  ...VIOLIN_EXERCISES,
];

/** Alias used by the song picker UI. */
export const VIOLIN_SONG_CATALOG = VIOLIN_SONGS;

export function getViolinSongById(id: string): ViolinSongDefinition | undefined {
  return VIOLIN_SONGS.find((song) => song.id === id);
}
