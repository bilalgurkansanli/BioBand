import type { InstrumentId } from './recording';

/** Local calendar day `YYYY-MM-DD`. */
export type DayKey = string;

export type ProfileProgress = {
  streakCount: number;
  longestStreak: number;
  lastPracticeDay: DayKey | null;
  practiceByDay: Record<DayKey, Partial<Record<InstrumentId, number>>>;
  completedChallengeIds: string[];
  /** Lifetime count of play-along finishes with 1+ star, independent of challenge rotation. */
  totalSongCompletions: number;
  /**
   * How many times each tracked feature has been reached, ever.
   *
   * Counters only — no timestamps, no sequence, nothing about *when* or in
   * what order. The question this answers is "which features does nobody
   * find", which is a product question, not a surveillance one. It rides along
   * in the row the user already syncs and that only they can read.
   *
   * Optional because every profile saved before this existed has no counters.
   */
  featureUse?: Partial<Record<TrackedFeature, number>>;
};

/**
 * The closed set of things worth counting.
 *
 * Deliberately a fixed union rather than free-form strings: an open map would
 * drift into logging whatever anyone felt like, which is exactly the line this
 * is meant not to cross.
 */
export type TrackedFeature =
  | 'tutorialOpened'
  | 'tutorialFinished'
  | 'studioOpened'
  | 'drumMachineOpened'
  | 'recordingSaved'
  | 'songImported'
  | 'backupExported'
  | 'backupRestored';

export type DailyChallengeKind =
  | { type: 'practice-2min'; instrument: InstrumentId }
  | { type: 'finish-any-song' };

export type WeeklyChallengeKind =
  | { type: 'song-of-week'; songId: string; songTitle: string }
  | { type: 'finish-any-song-week' };

export type ProfileChallenge = {
  id: string;
  period: 'daily' | 'weekly';
  kind: DailyChallengeKind | WeeklyChallengeKind;
  /** 0..1 for UI bars when measurable; else 0/1 via completed. */
  progress: number;
  completed: boolean;
  targetMs?: number;
  currentMs?: number;
};

export const DAILY_PRACTICE_GOAL_MS = 5 * 60 * 1000;
export const CHALLENGE_PRACTICE_MS = 2 * 60 * 1000;

export const EMPTY_PROFILE_PROGRESS: ProfileProgress = {
  streakCount: 0,
  longestStreak: 0,
  lastPracticeDay: null,
  practiceByDay: {},
  completedChallengeIds: [],
  totalSongCompletions: 0,
  featureUse: {},
};
