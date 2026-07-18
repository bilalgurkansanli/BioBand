import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useMemo, useState } from 'react';

import {
  buildActiveChallenges,
  dailyChallengeId,
  getDailyChallengeKind,
} from '../profile/challengeRotator';
import {
  getPracticeMsForDay,
  hadPracticeOnDay,
  last7DayKeys,
  loadProfileProgress,
  markChallengeComplete,
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
  const challenges: ProfileChallenge[] = useMemo(
    () => buildActiveChallenges(progress, day),
    [progress, day],
  );

  const todayTotalMs = getPracticeMsForDay(progress, day);
  const todayByInstrument = INSTRUMENTS.map((instrument) => ({
    instrument,
    ms: getPracticeMsForDay(progress, day, instrument),
  })).filter((entry) => entry.ms > 0);

  const weekDots = weekDays.map((key) => ({
    dayKey: key,
    active: hadPracticeOnDay(progress, key),
  }));

  return {
    progress,
    loading,
    refresh,
    streakCount: progress.streakCount,
    todayTotalMs,
    todayByInstrument,
    dailyGoalMs: DAILY_PRACTICE_GOAL_MS,
    dailyGoalProgress: Math.min(1, todayTotalMs / DAILY_PRACTICE_GOAL_MS),
    weekDots,
    challenges,
  };
}
