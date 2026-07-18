import AsyncStorage from '@react-native-async-storage/async-storage';

import type { InstrumentId } from '../types/recording';
import {
  EMPTY_PROFILE_PROGRESS,
  type DayKey,
  type ProfileProgress,
} from '../types/profile';

const STORAGE_KEY = '@bioband/profile-progress.v1';

function pad2(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

export function dayKeyFromDate(date: Date): DayKey {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

export function todayKey(): DayKey {
  return dayKeyFromDate(new Date());
}

export function addDays(dayKey: DayKey, delta: number): DayKey {
  const [y, m, d] = dayKey.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() + delta);
  return dayKeyFromDate(date);
}

export function yesterdayKey(from: DayKey = todayKey()): DayKey {
  return addDays(from, -1);
}

function isProfileProgress(value: unknown): value is ProfileProgress {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const entry = value as ProfileProgress;
  return (
    typeof entry.streakCount === 'number' &&
    (entry.lastPracticeDay === null || typeof entry.lastPracticeDay === 'string') &&
    typeof entry.practiceByDay === 'object' &&
    entry.practiceByDay !== null &&
    Array.isArray(entry.completedChallengeIds)
  );
}

/** If streak was broken (gap > 1 day), zero it out when loading. */
export function normalizeStreak(progress: ProfileProgress, today: DayKey = todayKey()): ProfileProgress {
  const last = progress.lastPracticeDay;
  if (!last) {
    return { ...progress, streakCount: 0 };
  }
  if (last === today || last === yesterdayKey(today)) {
    return progress;
  }
  return { ...progress, streakCount: 0 };
}

export async function loadProfileProgress(): Promise<ProfileProgress> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return { ...EMPTY_PROFILE_PROGRESS };
    }
    const parsed = JSON.parse(raw) as unknown;
    if (!isProfileProgress(parsed)) {
      return { ...EMPTY_PROFILE_PROGRESS };
    }
    const normalized = normalizeStreak({
      ...EMPTY_PROFILE_PROGRESS,
      ...parsed,
      practiceByDay: parsed.practiceByDay ?? {},
      completedChallengeIds: parsed.completedChallengeIds ?? [],
    });
    if (normalized.streakCount !== parsed.streakCount) {
      await persist(normalized);
    }
    return normalized;
  } catch {
    return { ...EMPTY_PROFILE_PROGRESS };
  }
}

async function persist(progress: ProfileProgress): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
}

function touchStreak(progress: ProfileProgress, day: DayKey): ProfileProgress {
  if (progress.lastPracticeDay === day) {
    return progress;
  }
  const nextStreak =
    progress.lastPracticeDay === yesterdayKey(day)
      ? progress.streakCount + 1
      : 1;
  return {
    ...progress,
    streakCount: nextStreak,
    lastPracticeDay: day,
  };
}

export async function addPracticeMs(
  instrument: InstrumentId,
  ms: number,
): Promise<ProfileProgress> {
  if (ms <= 0) {
    return loadProfileProgress();
  }
  const day = todayKey();
  const progress = await loadProfileProgress();
  const dayMap = { ...(progress.practiceByDay[day] ?? {}) };
  dayMap[instrument] = (dayMap[instrument] ?? 0) + ms;
  const next = touchStreak(
    {
      ...progress,
      practiceByDay: {
        ...progress.practiceByDay,
        [day]: dayMap,
      },
    },
    day,
  );
  await persist(next);
  return next;
}

export async function markChallengeComplete(challengeId: string): Promise<ProfileProgress> {
  const progress = await loadProfileProgress();
  if (progress.completedChallengeIds.includes(challengeId)) {
    return progress;
  }
  const next: ProfileProgress = {
    ...progress,
    completedChallengeIds: [...progress.completedChallengeIds, challengeId],
  };
  await persist(next);
  return next;
}

export function getPracticeMsForDay(
  progress: ProfileProgress,
  day: DayKey,
  instrument?: InstrumentId,
): number {
  const dayMap = progress.practiceByDay[day];
  if (!dayMap) {
    return 0;
  }
  if (instrument) {
    return dayMap[instrument] ?? 0;
  }
  return Object.values(dayMap).reduce((sum, value) => sum + (value ?? 0), 0);
}

/** Last 7 day keys ending today (oldest → newest). */
export function last7DayKeys(today: DayKey = todayKey()): DayKey[] {
  return Array.from({ length: 7 }, (_, index) => addDays(today, index - 6));
}

export function hadPracticeOnDay(progress: ProfileProgress, day: DayKey): boolean {
  return getPracticeMsForDay(progress, day) > 0 || progress.lastPracticeDay === day;
}
