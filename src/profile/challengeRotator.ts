import { PIANO_SONGS } from '../instruments/piano/songs/catalog';
import { getPracticeMsForDay, todayKey } from '../storage/profileProgressStorage';
import type { InstrumentId } from '../types/recording';
import {
  CHALLENGE_PRACTICE_MS,
  type DailyChallengeKind,
  type DayKey,
  type ProfileChallenge,
  type ProfileProgress,
  type WeeklyChallengeKind,
} from '../types/profile';

const INSTRUMENTS: InstrumentId[] = ['piano', 'drums', 'guitar', 'violin', 'pads'];

type DailySlot =
  | { type: 'practice-2min'; instrument: InstrumentId }
  | { type: 'finish-any-song' };

function dayOfYear(dayKey: DayKey): number {
  const [y, m, d] = dayKey.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  const start = new Date(y, 0, 0);
  return Math.floor((date.getTime() - start.getTime()) / 86_400_000);
}

/** ISO week key `YYYY-Www`. */
export function isoWeekKey(date: Date = new Date()): string {
  const tmp = new Date(date.getTime());
  tmp.setHours(0, 0, 0, 0);
  tmp.setDate(tmp.getDate() + 3 - ((tmp.getDay() + 6) % 7));
  const week1 = new Date(tmp.getFullYear(), 0, 4);
  const week =
    1 +
    Math.round(
      ((tmp.getTime() - week1.getTime()) / 86_400_000 -
        3 +
        ((week1.getDay() + 6) % 7)) /
        7,
    );
  const y = tmp.getFullYear();
  return `${y}-W${week < 10 ? `0${week}` : week}`;
}

function isoWeekNumber(date: Date = new Date()): number {
  const key = isoWeekKey(date);
  return Number(key.split('-W')[1]);
}

function dailyPool(): DailySlot[] {
  return [
    ...INSTRUMENTS.map(
      (instrument): DailySlot => ({ type: 'practice-2min', instrument }),
    ),
    { type: 'finish-any-song' },
  ];
}

export function getDailyChallengeKind(day: DayKey = todayKey()): DailyChallengeKind {
  const pool = dailyPool();
  const slot = pool[dayOfYear(day) % pool.length];
  return slot;
}

export function getWeeklyChallengeKind(date: Date = new Date()): WeeklyChallengeKind {
  if (PIANO_SONGS.length === 0) {
    return { type: 'finish-any-song-week' };
  }
  const song = PIANO_SONGS[isoWeekNumber(date) % PIANO_SONGS.length];
  return {
    type: 'song-of-week',
    songId: song.id,
    songTitle: song.title,
  };
}

export function dailyChallengeId(day: DayKey, kind: DailyChallengeKind): string {
  if (kind.type === 'practice-2min') {
    return `daily:${day}:practice-2min-${kind.instrument}`;
  }
  return `daily:${day}:finish-any-song`;
}

export function weeklyChallengeId(weekKey: string, kind: WeeklyChallengeKind): string {
  if (kind.type === 'song-of-week') {
    return `weekly:${weekKey}:song-of-week:${kind.songId}`;
  }
  return `weekly:${weekKey}:finish-any-song`;
}

export function buildActiveChallenges(
  progress: ProfileProgress,
  day: DayKey = todayKey(),
  date: Date = new Date(),
): ProfileChallenge[] {
  const dailyKind = getDailyChallengeKind(day);
  const weeklyKind = getWeeklyChallengeKind(date);
  const weekKey = isoWeekKey(date);
  const dailyId = dailyChallengeId(day, dailyKind);
  const weeklyId = weeklyChallengeId(weekKey, weeklyKind);

  const dailyCompleted = progress.completedChallengeIds.includes(dailyId);
  const weeklyCompleted = progress.completedChallengeIds.includes(weeklyId);

  let dailyProgress = dailyCompleted ? 1 : 0;
  let currentMs: number | undefined;
  let targetMs: number | undefined;

  if (dailyKind.type === 'practice-2min') {
    targetMs = CHALLENGE_PRACTICE_MS;
    currentMs = getPracticeMsForDay(progress, day, dailyKind.instrument);
    dailyProgress = Math.min(1, currentMs / targetMs);
  }

  return [
    {
      id: dailyId,
      period: 'daily',
      kind: dailyKind,
      progress: dailyProgress,
      completed: dailyCompleted || dailyProgress >= 1,
      targetMs,
      currentMs,
    },
    {
      id: weeklyId,
      period: 'weekly',
      kind: weeklyKind,
      progress: weeklyCompleted ? 1 : 0,
      completed: weeklyCompleted,
    },
  ];
}
