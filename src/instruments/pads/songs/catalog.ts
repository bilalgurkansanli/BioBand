import {
  BASIC_ROCK_EVENTS,
  DISCO_FLOOR_EVENTS,
  KICK_SNARE_EVENTS,
  RIDE_GROOVE_EVENTS,
  SIMPLE_SAMBA_EVENTS,
  STAB_RIFF_EVENTS,
  TOM_FILL_EVENTS,
  WE_WILL_ROCK_YOU_EVENTS,
} from './patterns';
import type { PadSongDefinition } from './types';

export const PAD_SONGS: PadSongDefinition[] = [
  {
    id: 'pad-kick-snare',
    title: 'Kick & Snare',
    difficulty: 'easy',
    events: KICK_SNARE_EVENTS,
    partialCount: 5,
  },
  {
    id: 'pad-basic-rock',
    title: 'Basic Rock',
    difficulty: 'easy',
    events: BASIC_ROCK_EVENTS,
    partialCount: 16,
  },
  {
    id: 'pad-disco-floor',
    title: 'Disco Floor',
    difficulty: 'medium',
    events: DISCO_FLOOR_EVENTS,
    partialCount: 12,
  },
  {
    id: 'pad-tom-fill',
    title: 'Tom Fill',
    difficulty: 'medium',
    events: TOM_FILL_EVENTS,
    partialCount: 6,
  },
  {
    id: 'pad-ride-groove',
    title: 'Ride Groove',
    difficulty: 'medium',
    events: RIDE_GROOVE_EVENTS,
    partialCount: 16,
  },
  {
    id: 'pad-simple-samba',
    title: 'Simple Samba',
    difficulty: 'hard',
    events: SIMPLE_SAMBA_EVENTS,
    partialCount: 14,
  },
  {
    id: 'pad-stab-riff',
    title: 'Stab Riff',
    difficulty: 'medium',
    events: STAB_RIFF_EVENTS,
    partialCount: 10,
  },
  {
    id: 'pad-we-will-rock-you',
    title: 'We Will Rock You',
    difficulty: 'easy',
    events: WE_WILL_ROCK_YOU_EVENTS,
    partialCount: 6,
  },
];

export const PAD_SONG_CATALOG = PAD_SONGS;

export function getPadSongById(id: string): PadSongDefinition | undefined {
  return PAD_SONGS.find((song) => song.id === id);
}
