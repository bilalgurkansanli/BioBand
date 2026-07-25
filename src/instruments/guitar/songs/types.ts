import type { SongBackingTrack, SongMeter } from '../../piano/songs/types';
import type { SongRole } from '../../shared/songPerformance';

export type GuitarSongEvent = {
  soundId: string;
  atMs: number;
  /** Ring time. Omit and it is derived from the gap to the next event. */
  durationMs?: number;
  /** 0..1 pick strength. Omit for an accent derived from `meter`. */
  velocity?: number;
  /** Accompaniment is played but never highlighted or scored. */
  role?: SongRole;
};

export type GuitarSongDifficulty = 'easy' | 'medium' | 'hard';

export type GuitarSongScope = 'partial' | 'full';

/** Tutorial wizard: guitar-only vs full mix backing. */
export type PlayMode = 'guitar' | 'fullBand';

export type GuitarSongDefinition = {
  id: string;
  /** Display title — proper names, not translated. */
  title: string;
  /** Optional artist line in the song picker. */
  artist?: string;
  difficulty: GuitarSongDifficulty;
  /** Full chart events, sorted by atMs. */
  events: GuitarSongEvent[];
  /** Inclusive count for the “part” excerpt. */
  partialCount?: number;
  /** Optional backing track for Band Mode (reuses piano format). */
  backingTrack?: SongBackingTrack;
  /** Enables metrical accents; charts without it still get phrase shaping. */
  meter?: SongMeter;
};

export type ResolvedGuitarSession = {
  events: GuitarSongEvent[];
  scope: GuitarSongScope;
  /** True when backing audio should play alongside the chart. */
  useBacking: boolean;
  /** Audio position (ms) where events[0] aligns. */
  audioStartMs: number;
  /** Audio position (ms) where the partial excerpt ends. */
  audioEndMs?: number;
};
