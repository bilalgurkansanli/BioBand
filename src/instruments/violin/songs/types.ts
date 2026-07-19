import type { SongBackingTrack } from '../../piano/songs/types';

export type ViolinSongEvent = {
  soundId: string;
  atMs: number;
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
