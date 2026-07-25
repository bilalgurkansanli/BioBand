import type { SongBackingTrack, SongMeter } from '../../piano/songs/types';
import type { SongRole } from '../../shared/songPerformance';

export type ViolinSongEvent = {
  soundId: string;
  atMs: number;
  /**
   * Bow-stroke length. Omit and it is derived from the gap to the next event.
   * On a sustaining instrument this is what separates a whole note from a
   * sixteenth — without it every note is the same stroke.
   */
  durationMs?: number;
  /** 0..1 bow strength. Omit for an accent derived from `meter`. */
  velocity?: number;
  /** Accompaniment is played but never highlighted or scored. */
  role?: SongRole;
};

export type ViolinSongDifficulty = 'easy' | 'medium' | 'hard';

export type ViolinSongScope = 'partial' | 'full';

/** Tutorial wizard: violin-only vs full mix backing. */
export type PlayMode = 'violin' | 'fullBand';

export type ViolinSongDefinition = {
  id: string;
  /** Display title — proper names, not translated. */
  title: string;
  /** Optional artist line in the song picker. */
  artist?: string;
  difficulty: ViolinSongDifficulty;
  /** Full chart events, sorted by atMs. */
  events: ViolinSongEvent[];
  /** Inclusive count for the “part” excerpt. */
  partialCount?: number;
  /** Optional backing track for Band Mode (reuses piano format). */
  backingTrack?: SongBackingTrack;
  /** Enables metrical accents; charts without it still get phrase shaping. */
  meter?: SongMeter;
};

export type ResolvedViolinSession = {
  events: ViolinSongEvent[];
  scope: ViolinSongScope;
  /** True when backing audio should play alongside the chart. */
  useBacking: boolean;
  /** Audio position (ms) where events[0] aligns. */
  audioStartMs: number;
  /** Audio position (ms) where the partial excerpt ends. */
  audioEndMs?: number;
};
