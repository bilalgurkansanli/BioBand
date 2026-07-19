import type { DrumSoundId } from '../drumsSounds';
import type { SongBackingTrack } from '../../piano/songs/types';

export type DrumSongEvent = {
  padId: DrumSoundId;
  atMs: number;
};

export type DrumSongDifficulty = 'easy' | 'medium' | 'hard';

export type DrumSongScope = 'partial' | 'full';

/** Tutorial wizard: drums-only vs full mix backing. */
export type PlayMode = 'drums' | 'fullBand';

export type DrumSongDefinition = {
  id: string;
  /** Display title — proper names, not translated. */
  title: string;
  difficulty: DrumSongDifficulty;
  /** Full chart events, sorted by atMs. */
  events: DrumSongEvent[];
  /** Inclusive index range for the “part” excerpt, or first N events. */
  partialCount?: number;
  /** Optional backing track for Band Mode (reuses piano format). */
  backingTrack?: SongBackingTrack;
};

export type ResolvedDrumSession = {
  events: DrumSongEvent[];
  scope: DrumSongScope;
  /** True when backing audio should play alongside the chart. */
  useBacking: boolean;
  /** Audio position (ms) where events[0] aligns. */
  audioStartMs: number;
  /** Audio position (ms) where the partial excerpt ends. */
  audioEndMs?: number;
};
