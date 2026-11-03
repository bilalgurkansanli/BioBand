import AsyncStorage from '@react-native-async-storage/async-storage';

import { notifyAppDataChanged } from './appDataChangeSignal';
import { isSameJson, readJson } from './jsonStorage';
import type { InstrumentId } from '../types/recording';
import {
  EMPTY_PROFILE_PROGRESS,
  type DayKey,
  type ProfileProgress,
  type TrackedFeature,
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

/**
 * True while a locked operation is running.
 *
 * The queue is not re-entrant: taking the lock from inside a locked body waits
 * on a promise that cannot settle until that same body finishes, which hangs
 * silently and poisons the queue for every later read and write. Callers must
 * use the `…Unlocked` helpers internally; this catches the mistake in
 * development instead of letting it ship as a frozen Profile tab.
 */
let lockHeld = false;

function withProgressLock<T>(operation: () => Promise<T>): Promise<T> {
  if (__DEV__ && lockHeld) {
    console.error(
      '[profileProgress] withProgressLock re-entered — use loadProfileProgressUnlocked ' +
        'inside a locked body. This deadlocks in production.',
    );
  }
  const guarded = async () => {
    lockHeld = true;
    try {
      return await operation();
    } finally {
      lockHeld = false;
    }
  };
  const run = writeQueue.then(guarded, guarded);
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

/**
 * For screens. A storage failure shows as empty progress rather than an error,
 * which is safe only because nothing writes this result back — every mutator
 * reads through the strict loader below instead.
 */
export function loadProfileProgress(): Promise<ProfileProgress> {
  return withProgressLock(loadProfileProgressUnlocked).catch((error: unknown) => {
    console.warn('[profileProgress] could not be read', error);
    return { ...EMPTY_PROFILE_PROGRESS };
  });
}

/**
 * Rejects when storage cannot be read. Every mutator builds on this, and
 * carrying on with empty progress would persist it over the real streak.
 */
async function loadProfileProgressUnlocked(): Promise<ProfileProgress> {
  const parsed = await readJson<ProfileProgress | null>(
    STORAGE_KEY,
    (value) => (isProfileProgress(value) ? value : null),
    () => null,
  );
  if (!parsed) {
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
}

async function persist(progress: ProfileProgress): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  notifyAppDataChanged();
}

/**
 * Folds the cloud copy into local progress and returns the result, which is
 * also what the cloud should hold afterwards.
 *
 * Written without the change signal: this *is* the sync, and announcing it as
 * a fresh local edit would schedule another sync to push it straight back.
 */
export function mergeRemoteProfileProgress(
  remote: ProfileProgress | null,
): Promise<ProfileProgress> {
  return withProgressLock(async () => {
    const local = await loadProfileProgressUnlocked();
    const merged = withLongestStreakFloor(
      normalizeStreak(remote ? mergeProfileProgress(local, remote) : local),
    );
    if (!isSameJson(merged, local)) {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
    }
    return merged;
  });
}

const DAY_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function nonNegativeCount(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
}

/**
 * Makes a progress blob from outside the app — the cloud row — safe to merge.
 *
 * Every field is repaired on its own instead of the blob being all-or-nothing:
 * one bad value from an older build must not throw away the rest. Fields this
 * build does not know are carried through untouched, so a newer build's data
 * survives a round trip through an older one.
 */
export function coerceProfileProgress(value: unknown): ProfileProgress | null {
  if (!isRecord(value)) {
    return null;
  }
  const rawDays = isRecord(value.practiceByDay) ? value.practiceByDay : {};
  const days: ProfileProgress['practiceByDay'] = {};
  for (const [day, dayMap] of Object.entries(rawDays)) {
    if (DAY_KEY_PATTERN.test(day) && isRecord(dayMap)) {
      days[day] = dayMap as Partial<Record<InstrumentId, number>>;
    }
  }
  const featureUse: Partial<Record<TrackedFeature, number>> = {};
  if (isRecord(value.featureUse)) {
    for (const [feature, count] of Object.entries(value.featureUse)) {
      if (typeof count === 'number' && Number.isFinite(count) && count >= 0) {
        featureUse[feature as TrackedFeature] = Math.floor(count);
      }
    }
  }
  return {
    ...value,
    streakCount: nonNegativeCount(value.streakCount),
    longestStreak: nonNegativeCount(value.longestStreak),
    lastPracticeDay:
      typeof value.lastPracticeDay === 'string' && DAY_KEY_PATTERN.test(value.lastPracticeDay)
        ? value.lastPracticeDay
        : null,
    practiceByDay: sanitizePracticeByDay(days).practiceByDay,
    completedChallengeIds: Array.isArray(value.completedChallengeIds)
      ? value.completedChallengeIds.filter((id): id is string => typeof id === 'string')
      : [],
    totalSongCompletions: nonNegativeCount(value.totalSongCompletions),
    featureUse,
  };
}

function maxPerKey<K extends string>(
  a: Partial<Record<K, number>>,
  b: Partial<Record<K, number>>,
): Partial<Record<K, number>> {
  const merged: Partial<Record<K, number>> = { ...a };
  for (const [key, value] of Object.entries(b) as [K, number | undefined][]) {
    merged[key] = Math.max(merged[key] ?? 0, value ?? 0);
  }
  return merged;
}

/**
 * The streak at `lastDay` once both copies' practice is known.
 *
 * Walks back over consecutive practised days. Where the walk reaches the day a
 * copy last practised, that copy's own count takes over from there — its
 * history may reach further back than the per-day log, which only covers days
 * this data has seen. Days phone A practised and days phone B practised join
 * into one run, which neither phone could have counted alone.
 */
function mergedStreak(
  lastDay: DayKey | null,
  practiceByDay: ProfileProgress['practiceByDay'],
  copies: ProfileProgress[],
): number {
  if (!lastDay) {
    return 0;
  }
  const practised = new Set(
    Object.keys(practiceByDay).filter((day) =>
      Object.values(practiceByDay[day] ?? {}).some((ms) => (ms ?? 0) > 0),
    ),
  );
  for (const copy of copies) {
    if (copy.lastPracticeDay) {
      practised.add(copy.lastPracticeDay);
    }
  }
  let best = 0;
  let walked = 0;
  let day = lastDay;
  while (practised.has(day)) {
    for (const copy of copies) {
      if (copy.lastPracticeDay === day) {
        best = Math.max(best, walked + copy.streakCount);
      }
    }
    walked += 1;
    day = addDays(day, -1);
  }
  return Math.max(best, walked);
}

/**
 * Combines two copies of the same user's progress — this device's and the
 * cloud's — without losing what either one earned.
 *
 * Every field only ever grows (time is added, challenges and badges are
 * completed, counters go up), so each merges with max or union. That makes the
 * merge order-independent and safe to repeat, which is what lets two phones
 * converge instead of the last one to sync erasing the other. The price is
 * that the same day's practice on the same instrument on two phones counts
 * once, as the larger of the two, rather than as their sum: an undercount the
 * user can earn back, instead of a double count that can never be taken out.
 */
export function mergeProfileProgress(
  local: ProfileProgress,
  remote: ProfileProgress,
): ProfileProgress {
  const practiceByDay: ProfileProgress['practiceByDay'] = { ...local.practiceByDay };
  for (const [day, dayMap] of Object.entries(remote.practiceByDay)) {
    practiceByDay[day] = maxPerKey(practiceByDay[day] ?? {}, dayMap ?? {});
  }
  const lastPracticeDay =
    !local.lastPracticeDay || (remote.lastPracticeDay && remote.lastPracticeDay > local.lastPracticeDay)
      ? remote.lastPracticeDay
      : local.lastPracticeDay;
  const streakCount = mergedStreak(lastPracticeDay, practiceByDay, [local, remote]);
  return {
    ...remote,
    ...local,
    streakCount,
    longestStreak: Math.max(local.longestStreak ?? 0, remote.longestStreak ?? 0, streakCount),
    lastPracticeDay,
    practiceByDay,
    // Sorted so both devices arrive at the identical list, whatever order
    // each completed things in — nothing reads this list in order.
    completedChallengeIds: [
      ...new Set([...local.completedChallengeIds, ...remote.completedChallengeIds]),
    ].sort(),
    totalSongCompletions: Math.max(local.totalSongCompletions ?? 0, remote.totalSongCompletions ?? 0),
    featureUse: maxPerKey(local.featureUse ?? {}, remote.featureUse ?? {}),
  };
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

/**
 * Bumps a feature counter by one.
 *
 * Fire-and-forget on purpose: this is diagnostics riding along with real data,
 * and a counter that fails to save must never interrupt what the user was
 * actually doing.
 */
export async function recordFeatureUse(feature: TrackedFeature): Promise<void> {
  try {
    // Through the same lock as every other write: two counters bumped in the
    // same moment would otherwise read the same snapshot and one would be lost.
    // The *unlocked* loader is mandatory here — `loadProfileProgress` takes the
    // same lock, and taking it from inside is a circular wait that never
    // settles, poisoning the queue for every later read and write.
    await withProgressLock(async () => {
      const progress = await loadProfileProgressUnlocked();
      const featureUse = { ...(progress.featureUse ?? {}) };
      featureUse[feature] = (featureUse[feature] ?? 0) + 1;
      await persist({ ...progress, featureUse });
      return progress;
    });
  } catch (error) {
    console.warn('[profileProgress] could not record feature use', error);
  }
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

/**
 * Day keys for the calendar week containing `today`, Monday first.
 *
 * A calendar week rather than a rolling seven days on purpose: "this week"
 * means something specific to the person setting the goal, and the Monday
 * reset is what makes a weekly target feel like a target rather than a
 * running average. Monday-first because that is the week the app's languages
 * use.
 */
export function currentWeekKeys(today: DayKey = todayKey()): DayKey[] {
  const [year, month, day] = today.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  // getDay(): 0 is Sunday, so Sunday sits at the end of the week, not the start.
  const offsetToMonday = (date.getDay() + 6) % 7;
  const monday = addDays(today, -offsetToMonday);
  return Array.from({ length: 7 }, (_, index) => addDays(monday, index));
}

export function hadPracticeOnDay(progress: ProfileProgress, day: DayKey): boolean {
  return getPracticeMsForDay(progress, day) > 0 || progress.lastPracticeDay === day;
}
