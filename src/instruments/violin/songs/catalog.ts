import {
  CROSS_STRING_EVENTS,
  G_SCALE_EVENTS,
  MIXED_WARMUP_EVENTS,
  OPEN_STRINGS_EVENTS,
  TWINKLE_MOTIF_EVENTS,
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
  },
  {
    id: 'g-scale',
    title: 'G String Scale',
    difficulty: 'easy',
    events: G_SCALE_EVENTS,
    partialCount: 5,
  },
  {
    id: 'twinkle-motif',
    title: 'Twinkle Motif',
    difficulty: 'easy',
    events: TWINKLE_MOTIF_EVENTS,
    partialCount: 7,
  },
  {
    id: 'cross-string',
    title: 'Cross-String Arpeggio',
    difficulty: 'medium',
    events: CROSS_STRING_EVENTS,
    partialCount: 7,
  },
  {
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
