import AsyncStorage from '@react-native-async-storage/async-storage';

import { notifyAppDataChanged } from './appDataChangeSignal';
import type { InstrumentId } from '../types/recording';
import {
  EMPTY_PROFILE_PROGRESS,
  type DayKey,
  type ProfileProgress,
} from '../types/profile';

const STORAGE_KEY = '@bioband/profile-progress.v1';

/**
 * Every mutator here does its own load → mutate → persist round trip. Two
 * calls firing close together (e.g. a play-along finish and a recording save
 * landing around the same time) can otherwise interleave: the second reads
 * the value before the first's write lands, then overwrites it — silently
 * dropping the first update. Routing every read-modify-write through this
 * queue makes each operation atomic relative to the others.
 */
let writeQueue: Promise<unknown> = Promise.resolve();

function withProgressLock<T>(operation: () => Promise<T>): Promise<T> {
  const run = writeQueue.then(operation, operation);
  writeQueue = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

/**
 * Defensive ceiling per addPracticeMs call — guards against a duration bug
 * (e.g. a raw Date.now() timestamp fed in as an elapsed delta, ~1000x any
 * real session) from ever corrupting today's total again.
 */
const MAX_PRACTICE_MS_PER_CALL = 60 * 60 * 1000;

/**
 * Same ceiling, applied per instrument per day, to heal values already sitting
 * in storage from before the guard above existed (e.g. a corrupted entry
 * showing hundreds of thousands of hours) instead of leaving it on screen.
 */
const MAX_DAILY_PRACTICE_MS = 24 * 60 * 60 * 1000;

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

/** Clamp any per-day per-instrument value to a sane ceiling, healing legacy
 * corrupted entries (see MAX_DAILY_PRACTICE_MS) on load. */
function sanitizePracticeByDay(
  practiceByDay: ProfileProgress['practiceByDay'],
): { practiceByDay: ProfileProgress['practiceByDay']; changed: boolean } {
  let changed = false;
  const sanitized: ProfileProgress['practiceByDay'] = {};
  for (const [day, dayMap] of Object.entries(practiceByDay)) {
    if (!dayMap || typeof dayMap !== 'object' || Array.isArray(dayMap)) {
      // Malformed day entry (e.g. null) — drop it rather than throwing and
      // falling back to EMPTY_PROFILE_PROGRESS, which would wipe every
      // other day's progress too.
      changed = true;
      continue;
    }
    const sanitizedDay: Partial<Record<InstrumentId, number>> = {};
    for (const [instrument, ms] of Object.entries(dayMap) as [InstrumentId, number][]) {
      const safeMs =
        typeof ms === 'number' && Number.isFinite(ms)
          ? Math.min(Math.max(0, ms), MAX_DAILY_PRACTICE_MS)
          : 0;
      if (safeMs !== ms) {
        changed = true;
      }
      sanitizedDay[instrument] = safeMs;
    }
    sanitized[day] = sanitizedDay;
  }
  return { practiceByDay: sanitized, changed };
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

/** Backfills longestStreak for records saved before the field existed. */
function withLongestStreakFloor(progress: ProfileProgress): ProfileProgress {
  const floor = Math.max(progress.longestStreak ?? 0, progress.streakCount);
  if (floor === progress.longestStreak) {
    return progress;
  }
  return { ...progress, longestStreak: floor };
}

export function loadProfileProgress(): Promise<ProfileProgress> {
  return withProgressLock(loadProfileProgressUnlocked);
}

async function loadProfileProgressUnlocked(): Promise<ProfileProgress> {
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
    const { practiceByDay, changed: practiceChanged } = sanitizePracticeByDay(
      normalized.practiceByDay,
    );
    const result = withLongestStreakFloor({ ...normalized, practiceByDay });
    if (
      result.streakCount !== parsed.streakCount ||
      result.longestStreak !== parsed.longestStreak ||
      practiceChanged
    ) {
      await persist(result);
    }
    return result;
  } catch {
    return { ...EMPTY_PROFILE_PROGRESS };
  }
}

async function persist(progress: ProfileProgress): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  notifyAppDataChanged();
}

/** Overwrites local progress wholesale — used to hydrate from a cloud sync on sign-in. */
export function restoreProfileProgress(progress: ProfileProgress): Promise<ProfileProgress> {
  return withProgressLock(async () => {
    const normalized = withLongestStreakFloor(normalizeStreak(progress));
    await persist(normalized);
    return normalized;
  });
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
    longestStreak: Math.max(progress.longestStreak, nextStreak),
    lastPracticeDay: day,
  };
}

export function addPracticeMs(
  instrument: InstrumentId,
  ms: number,
): Promise<ProfileProgress> {
  return withProgressLock(async () => {
    if (ms <= 0) {
      return loadProfileProgressUnlocked();
    }
    const safeMs = Math.min(ms, MAX_PRACTICE_MS_PER_CALL);
    const day = todayKey();
    const progress = await loadProfileProgressUnlocked();
    const dayMap = { ...(progress.practiceByDay[day] ?? {}) };
    dayMap[instrument] = Math.min(
      (dayMap[instrument] ?? 0) + safeMs,
      MAX_DAILY_PRACTICE_MS,
    );
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
  });
}

export function markChallengeComplete(challengeId: string): Promise<ProfileProgress> {
  return withProgressLock(async () => {
    const progress = await loadProfileProgressUnlocked();
    if (progress.completedChallengeIds.includes(challengeId)) {
      return progress;
    }
    const next: ProfileProgress = {
      ...progress,
      completedChallengeIds: [...progress.completedChallengeIds, challengeId],
    };
    await persist(next);
    return next;
  });
}

/** Bumps the lifetime song-completion counter (used by badges), independent of daily/weekly challenges. */
export function recordSongCompletion(): Promise<ProfileProgress> {
  return withProgressLock(async () => {
    const progress = await loadProfileProgressUnlocked();
    const next: ProfileProgress = {
      ...progress,
      totalSongCompletions: progress.totalSongCompletions + 1,
    };
    await persist(next);
    return next;
  });
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

/** Sum of all logged practice time, optionally scoped to one instrument. */
export function getTotalPracticeMs(
  progress: ProfileProgress,
  instrument?: InstrumentId,
): number {
  return Object.keys(progress.practiceByDay).reduce(
    (sum, day) => sum + getPracticeMsForDay(progress, day, instrument),
    0,
  );
}

/** Sum of practice time across a set of day keys (used for week-over-week comparisons). */
export function getPracticeMsForDays(progress: ProfileProgress, days: DayKey[]): number {
  return days.reduce((sum, day) => sum + getPracticeMsForDay(progress, day), 0);
}

/** Last 7 day keys ending today (oldest → newest). */
export function last7DayKeys(today: DayKey = todayKey()): DayKey[] {
  return Array.from({ length: 7 }, (_, index) => addDays(today, index - 6));
}

/** The 7 day keys immediately before the current 7-day window (oldest → newest). */
export function previous7DayKeys(today: DayKey = todayKey()): DayKey[] {
  return Array.from({ length: 7 }, (_, index) => addDays(today, index - 13));
}

export function hadPracticeOnDay(progress: ProfileProgress, day: DayKey): boolean {
  return getPracticeMsForDay(progress, day) > 0 || progress.lastPracticeDay === day;
}
