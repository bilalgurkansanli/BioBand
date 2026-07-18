import type { PadSoundId } from '../padsSounds';
import type { SongBackingTrack } from '../../piano/songs/types';

export type PadSongEvent = {
  padId: PadSoundId;
  atMs: number;
};

export type PadSongDifficulty = 'easy' | 'medium' | 'hard';

export type PadSongScope = 'partial' | 'full';

export type PlayMode = 'pads' | 'fullBand';

export type PadSongDefinition = {
  id: string;
  /** Display title — proper names, not translated. */
  title: string;
  difficulty: PadSongDifficulty;
  /** Full chart events, sorted by atMs. */
  events: PadSongEvent[];
  /** Inclusive first-N events for the "partial" excerpt. */
  partialCount?: number;
  /** Optional backing track for Band Mode (reuses piano format). */
  backingTrack?: SongBackingTrack;
};

export type ResolvedPadSession = {
  events: PadSongEvent[];
  scope: PadSongScope;
  /** True when backing audio should play alongside the chart. */
  useBacking: boolean;
  /** Audio position (ms) where events[0] aligns. */
  audioStartMs: number;
  /** Audio position (ms) where the partial excerpt ends. */
  audioEndMs?: number;
};
