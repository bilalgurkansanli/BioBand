import {
  BASIC_ROCK_EVENTS,
  BILLIE_JEAN_EVENTS,
  BIR_DERDIM_VAR_EVENTS,
  DISCO_FLOOR_EVENTS,
  ENTER_SANDMAN_EVENTS,
  KENDIME_YALAN_SOYLEDIM_EVENTS,
  KICK_SNARE_EVENTS,
  RIDE_GROOVE_EVENTS,
  SENI_KENDIME_SAKLADIM_EVENTS,
  SEVEN_NATION_ARMY_EVENTS,
  SIMPLE_SAMBA_EVENTS,
  SMELLS_LIKE_TEEN_SPIRIT_EVENTS,
  TOM_FILL_EVENTS,
  WE_WILL_ROCK_YOU_EVENTS,
} from './patterns';
import type { DrumSongDefinition } from './types';

export const DRUM_SONGS: DrumSongDefinition[] = [
  {
    id: 'enter-sandman',
    title: 'Enter Sandman',
    difficulty: 'hard',
    events: ENTER_SANDMAN_EVENTS,
    /** First 2 bars of the main groove (~24 hits). */
    partialCount: 24,
  },
  {
    id: 'billie-jean',
    title: 'Billie Jean',
    difficulty: 'medium',
    events: BILLIE_JEAN_EVENTS,
    /** First 2 bars of the pocket groove. */
    partialCount: 24,
  },
  {
    id: 'seven-nation-army',
    title: 'Seven Nation Army',
    difficulty: 'easy',
    events: SEVEN_NATION_ARMY_EVENTS,
    /** First 2 bars: kick + hat only (before snare enters). */
    partialCount: 24,
  },
  {
    id: 'smells-like-teen-spirit',
    title: 'Smells Like Teen Spirit',
    difficulty: 'hard',
    events: SMELLS_LIKE_TEEN_SPIRIT_EVENTS,
    /** First 2 bars of the main Grohl groove. */
    partialCount: 28,
  },
  {
    id: 'we-will-rock-you',
    title: 'We Will Rock You',
    difficulty: 'easy',
    events: WE_WILL_ROCK_YOU_EVENTS,
    /** First 2 bars of stomp–stomp–clap (6 hits). */
    partialCount: 6,
  },
  {
    id: 'bir-derdim-var',
    title: 'Bir Derdim Var',
    difficulty: 'medium',
    events: BIR_DERDIM_VAR_EVENTS,
    /** Intro open hats + first 2 C-groove bars. */
    partialCount: 28,
  },
  {
    id: 'seni-kendime-sakladim',
    title: 'Seni Kendime Sakladım',
    difficulty: 'easy',
    events: SENI_KENDIME_SAKLADIM_EVENTS,
    /** Intro + first 2 slow-pocket bars. */
    partialCount: 30,
  },
  {
    id: 'kendime-yalan-soyledim',
    title: 'Kendime Yalan Söyledim',
    difficulty: 'medium',
    events: KENDIME_YALAN_SOYLEDIM_EVENTS,
    /** Intro kicks + first 2 groove bars. */
    partialCount: 28,
  },
  {
    id: 'kick-snare',
    title: 'Kick & Snare',
    difficulty: 'easy',
    events: KICK_SNARE_EVENTS,
    partialCount: 5,
  },

  {
    id: 'basic-rock',
    title: 'Basic Rock',
    difficulty: 'easy',
    events: BASIC_ROCK_EVENTS,
    partialCount: 16,
  },
  {
    id: 'disco-floor',
    title: 'Disco Floor',
    difficulty: 'medium',
    events: DISCO_FLOOR_EVENTS,
    partialCount: 12,
  },
  {
    id: 'tom-fill',
    title: 'Tom Fill',
    difficulty: 'medium',
    events: TOM_FILL_EVENTS,
    partialCount: 6,
  },
  {
    id: 'ride-groove',
    title: 'Ride Groove',
    difficulty: 'medium',
    events: RIDE_GROOVE_EVENTS,
    partialCount: 16,
  },
  {
    id: 'simple-samba',
    title: 'Simple Samba',
    difficulty: 'hard',
    events: SIMPLE_SAMBA_EVENTS,
    partialCount: 14,
  },
];

export const DRUM_SONG_CATALOG = DRUM_SONGS;

export function getDrumSongById(id: string): DrumSongDefinition | undefined {
  return DRUM_SONGS.find((song) => song.id === id);
}
