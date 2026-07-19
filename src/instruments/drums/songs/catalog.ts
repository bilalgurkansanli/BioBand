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
import {
  ANOTHER_ONE_BITES_THE_DUST_EVENTS,
  BACK_IN_BLACK_EVENTS,
  DONENCE_EVENTS,
  IN_THE_AIR_TONIGHT_EVENTS,
  STAYIN_ALIVE_EVENTS,
  SUPERSTITION_EVENTS,
  UPTOWN_FUNK_EVENTS,
  WALK_THIS_WAY_EVENTS,
  WHEN_THE_LEVEE_BREAKS_EVENTS,
  WIPE_OUT_EVENTS,
} from './patternsExtra';
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
    id: 'in-the-air-tonight',
    title: 'In the Air Tonight',
    difficulty: 'hard',
    events: IN_THE_AIR_TONIGHT_EVENTS,
    /** 2 intro bars + THE tom fill. */
    partialCount: 28,
  },
  {
    id: 'back-in-black',
    title: 'Back in Black',
    difficulty: 'medium',
    events: BACK_IN_BLACK_EVENTS,
    /** First 2 bars of the rock pocket. */
    partialCount: 24,
  },
  {
    id: 'another-one-bites-the-dust',
    title: 'Another One Bites the Dust',
    difficulty: 'easy',
    events: ANOTHER_ONE_BITES_THE_DUST_EVENTS,
    /** 2 bass-riff bars on the kick + first groove bar. */
    partialCount: 25,
  },
  {
    id: 'when-the-levee-breaks',
    title: 'When the Levee Breaks',
    difficulty: 'medium',
    events: WHEN_THE_LEVEE_BREAKS_EVENTS,
    /** First 2 bars of the Bonham groove. */
    partialCount: 26,
  },
  {
    id: 'superstition',
    title: 'Superstition',
    difficulty: 'hard',
    events: SUPERSTITION_EVENTS,
    /** First 2 funk bars (straight + pushed). */
    partialCount: 27,
  },
  {
    id: 'wipe-out',
    title: 'Wipe Out',
    difficulty: 'hard',
    events: WIPE_OUT_EVENTS,
    /** Snare roll-in + first surf groove bar. */
    partialCount: 22,
  },
  {
    id: 'walk-this-way',
    title: 'Walk This Way',
    difficulty: 'medium',
    events: WALK_THIS_WAY_EVENTS,
    /** The 2-bar opening drum break. */
    partialCount: 26,
  },
  {
    id: 'stayin-alive',
    title: "Stayin' Alive",
    difficulty: 'easy',
    events: STAYIN_ALIVE_EVENTS,
    /** First 2 disco bars. */
    partialCount: 28,
  },
  {
    id: 'uptown-funk',
    title: 'Uptown Funk',
    difficulty: 'medium',
    events: UPTOWN_FUNK_EVENTS,
    /** First 2 funk bars. */
    partialCount: 24,
  },
  {
    id: 'donence',
    title: 'Dönence',
    difficulty: 'medium',
    events: DONENCE_EVENTS,
    /** First 2 disco bars. */
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
    /** Exactly bar 1 (8 hats + 2 kicks + 2 snares). */
    partialCount: 12,
  },
  {
    id: 'disco-floor',
    title: 'Disco Floor',
    difficulty: 'medium',
    events: DISCO_FLOOR_EVENTS,
    /** Exactly bar 1 (4 kicks + 2 snares + 4 open hats). */
    partialCount: 10,
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
    /** Exactly bar 1 (8 rides + 3 kicks + 2 snares). */
    partialCount: 13,
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
