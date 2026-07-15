import type { DrumSoundId } from '../drumsSounds';

export type DrumSongEvent = {
  padId: DrumSoundId;
  atMs: number;
};

export type DrumSongDifficulty = 'easy' | 'medium' | 'hard';

export type DrumSongScope = 'partial' | 'full';

export type DrumSongDefinition = {
  id: string;
  /** Display title — proper names, not translated. */
  title: string;
  difficulty: DrumSongDifficulty;
  /** Full chart events, sorted by atMs. */
  events: DrumSongEvent[];
  /** Inclusive index range for the “part” excerpt, or first N events. */
  partialCount?: number;
};

export type ResolvedDrumSession = {
  events: DrumSongEvent[];
  scope: DrumSongScope;
};
