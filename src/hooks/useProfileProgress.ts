import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useMemo, useState } from 'react';

import { buildBadges } from '../profile/badges';
import {
  buildActiveChallenges,
  dailyChallengeId,
  getDailyChallengeKind,
} from '../profile/challengeRotator';
import {
  getPracticeMsForDay,
  getPracticeMsForDays,
  getTotalPracticeMs,
  hadPracticeOnDay,
  currentWeekKeys,
  last7DayKeys,
  loadProfileProgress,
  markChallengeComplete,
  previous7DayKeys,
  todayKey,
} from '../storage/profileProgressStorage';
import type { InstrumentId } from '../types/recording';
import {
  CHALLENGE_PRACTICE_MS,
  DAILY_PRACTICE_GOAL_MS,
  EMPTY_PROFILE_PROGRESS,
  type ProfileChallenge,
  type ProfileProgress,
} from '../types/profile';

const INSTRUMENTS: InstrumentId[] = ['piano', 'drums', 'guitar', 'violin', 'pads'];

/** Persist daily 2-min challenge if practice already crossed the threshold. */
async function syncPracticeChallenge(progress: ProfileProgress): Promise<ProfileProgress> {
  const day = todayKey();
  const kind = getDailyChallengeKind(day);
  if (kind.type !== 'practice-2min') {
    return progress;
  }
  const id = dailyChallengeId(day, kind);
  if (progress.completedChallengeIds.includes(id)) {
    return progress;
  }
  const ms = getPracticeMsForDay(progress, day, kind.instrument);
  if (ms < CHALLENGE_PRACTICE_MS) {
    return progress;
  }
  return markChallengeComplete(id);
}

export function useProfileProgress() {
  const [progress, setProgress] = useState<ProfileProgress>(EMPTY_PROFILE_PROGRESS);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const loaded = await loadProfileProgress();
      setProgress(await syncPracticeChallenge(loaded));
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  const day = todayKey();
  const weekDays = useMemo(() => last7DayKeys(day), [day]);
  const previousWeekDays = useMemo(() => previous7DayKeys(day), [day]);
  const challenges: ProfileChallenge[] = useMemo(
    () => buildActiveChallenges(progress, day),
    [progress, day],
  );

  const totalPracticeMs = getTotalPracticeMs(progress);
  const badges = useMemo(() => buildBadges(progress, totalPracticeMs), [progress, totalPracticeMs]);
  const thisWeekMs = getPracticeMsForDays(progress, weekDays);
  // The rolling window above drives the trend arrow; the goal needs the
  // calendar week, which is the one that resets and gives the target its edge.
  const calendarWeekMs = getPracticeMsForDays(progress, currentWeekKeys(day));
  const lastWeekMs = getPracticeMsForDays(progress, previousWeekDays);
  const weekTrendRatio = lastWeekMs > 0 ? (thisWeekMs - lastWeekMs) / lastWeekMs : null;

  const todayTotalMs = getPracticeMsForDay(progress, day);
  const todayByInstrumentAll = INSTRUMENTS.map((instrument) => ({
    instrument,
    ms: getPracticeMsForDay(progress, day, instrument),
  }));
  const todayByInstrument = todayByInstrumentAll.filter((entry) => entry.ms > 0);

  const weekDots = weekDays.map((key) => ({
    dayKey: key,
    active: hadPracticeOnDay(progress, key),
    isToday: key === day,
  }));

  return {
    progress,
    loading,
    refresh,
    streakCount: progress.streakCount,
    longestStreak: progress.longestStreak,
    totalPracticeMs,
    thisWeekMs,
    calendarWeekMs,
    lastWeekMs,
    weekTrendRatio,
    todayTotalMs,
    todayByInstrument,
    todayByInstrumentAll,
    dailyGoalMs: DAILY_PRACTICE_GOAL_MS,
    dailyGoalProgress: Math.min(1, todayTotalMs / DAILY_PRACTICE_GOAL_MS),
    weekDots,
    challenges,
    badges,
  };
}
