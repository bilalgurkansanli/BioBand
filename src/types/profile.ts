import type { InstrumentId } from './recording';

/** Local calendar day `YYYY-MM-DD`. */
export type DayKey = string;

export type ProfileProgress = {
  streakCount: number;
  lastPracticeDay: DayKey | null;
  practiceByDay: Record<DayKey, Partial<Record<InstrumentId, number>>>;
  completedChallengeIds: string[];
};

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
  lastPracticeDay: null,
  practiceByDay: {},
  completedChallengeIds: [],
};
