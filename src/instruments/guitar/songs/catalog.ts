import {
  BALLAD_CHORDS_EVENTS,
  CAMPFIRE_CHORDS_EVENTS,
  FRET_SPRINT_EVENTS,
  GROOVE_A_EVENTS,
  LEAD_AND_CHORDS_EVENTS,
  OPEN_STRINGS_EVENTS,
  POWER_RIFF_EVENTS,
} from './patterns';
import type { GuitarSongDefinition } from './types';

export const GUITAR_SONGS: GuitarSongDefinition[] = [
  {
    id: 'open-strings',
    title: 'Open Strings',
    difficulty: 'easy',
    events: OPEN_STRINGS_EVENTS,
    partialCount: 6,
  },
  {
    id: 'campfire-chords',
    title: 'Campfire Chords',
    difficulty: 'easy',
    events: CAMPFIRE_CHORDS_EVENTS,
    partialCount: 8,
  },
  {
    id: 'power-riff',
    title: 'Power Riff',
    difficulty: 'easy',
    events: POWER_RIFF_EVENTS,
    partialCount: 7,
  },
  {
    id: 'groove-a',
    title: 'Groove on A',
    difficulty: 'medium',
    events: GROOVE_A_EVENTS,
    partialCount: 8,
  },
  {
    id: 'ballad-chords',
    title: 'Ballad Chords',
    difficulty: 'medium',
    events: BALLAD_CHORDS_EVENTS,
    partialCount: 8,
  },
  {
    id: 'lead-and-chords',
    title: 'Lead & Chords',
    difficulty: 'hard',
    events: LEAD_AND_CHORDS_EVENTS,
    partialCount: 10,
  },
  {
    id: 'fret-sprint',
    title: 'Fret Sprint',
    difficulty: 'hard',
    events: FRET_SPRINT_EVENTS,
    partialCount: 12,
  },
];

export const GUITAR_SONG_CATALOG = GUITAR_SONGS;

export function getGuitarSongById(id: string): GuitarSongDefinition | undefined {
  return GUITAR_SONGS.find((song) => song.id === id);
}
