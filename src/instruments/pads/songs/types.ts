import type { PadBankId } from '../padsBanks';
import type { PadSoundId } from '../padsSounds';
import type { SongBackingTrack, SongMeter } from '../../piano/songs/types';
import type { SongRole } from '../../shared/songPerformance';

export type PadSongEvent = {
  padId: PadSoundId;
  atMs: number;
  /** How long the pad rings. Omit and it is derived from the following gap. */
  durationMs?: number;
  /** 0..1 hit strength. Omit for an accent derived from `meter`. */
  velocity?: number;
  /** Accompaniment is played but never highlighted or scored. */
  role?: SongRole;
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
  /**
   * Pad bank the lesson is written for — selecting it auto-switches the
   * bank (Turkish usûl lessons play on the Turkish bank's darbuka/bendir).
   */
  bankId?: PadBankId;
  /** Enables metrical accents; charts without it still get phrase shaping. */
  meter?: SongMeter;
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
