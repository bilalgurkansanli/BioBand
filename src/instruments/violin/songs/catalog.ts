import {
  CROSS_STRING_EVENTS,
  G_SCALE_EVENTS,
  MIXED_WARMUP_EVENTS,
  OPEN_STRINGS_EVENTS,
  PHRASE_PRACTICE_EVENTS,
  TWINKLE_MOTIF_EVENTS,
} from './patterns';
import type { ViolinSongDefinition } from './types';

export const VIOLIN_SONGS: ViolinSongDefinition[] = [
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
    id: 'phrase-practice',
    title: 'Phrase Practice',
    difficulty: 'medium',
    events: PHRASE_PRACTICE_EVENTS,
    partialCount: 3,
  },
  {
    id: 'mixed-warmup',
    title: 'Mixed Warm-up',
    difficulty: 'hard',
    events: MIXED_WARMUP_EVENTS,
    partialCount: 6,
  },
];

/** Alias used by the song picker UI. */
export const VIOLIN_SONG_CATALOG = VIOLIN_SONGS;

export function getViolinSongById(id: string): ViolinSongDefinition | undefined {
  return VIOLIN_SONGS.find((song) => song.id === id);
}
