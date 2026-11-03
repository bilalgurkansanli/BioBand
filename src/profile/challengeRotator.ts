import { getSongById } from '../instruments/piano/songs/catalog';
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

/**
 * The song of the week is drawn from the piano catalog, so only a piano
 * play-along can complete it. Song ids are only unique within one instrument —
 * drums have their own `billie-jean` — and matching on the id alone let a
 * drum lesson tick off the piano challenge.
 */
const SONG_OF_WEEK_INSTRUMENT: InstrumentId = 'piano';

/** True when finishing `songId` on `instrument` completes this week's song challenge. */
export function completesSongOfWeek(
  kind: WeeklyChallengeKind,
  instrument: InstrumentId,
  songId: string | null,
): boolean {
  return (
    kind.type === 'song-of-week' &&
    instrument === SONG_OF_WEEK_INSTRUMENT &&
    songId !== null &&
    songId === kind.songId
  );
}

/**
 * The song-of-the-week rotation, frozen in the order it shipped in 1.0.0.
 *
 * It used to index the live catalog, so adding a song anywhere in the list
 * reshuffled every week — including the current one, on the day the update
 * landed, for someone half-way through it. New songs join here only by
 * appending, and appending still shifts later weeks, so do it deliberately.
 */
export const SONG_OF_WEEK_ROTATION: readonly string[] = [
  'turk-marsi',
  'jingle-bells',
  'uskudara-giderken',
  'ode-to-joy',
  'fur-elise',
  'river-flows-in-you',
  'canon-in-d',
  'clair-de-lune',
  'chopin-nocturne',
  'shape-of-you',
  'someone-like-you',
  'billie-jean',
  'neyleyim-istanbul',
  'mesafe',
  'simarik',
  'biliyorsun',
  'gulpembe',
  'tutamiyorum-zamani',
  'olsun',
  'aya-benzer',
  'yasanacaksa',
  'kusura-bakma',
  'ayy-ben-hala-ruyada',
  'ahu',
];

export function getWeeklyChallengeKind(date: Date = new Date()): WeeklyChallengeKind {
  const songId = SONG_OF_WEEK_ROTATION[isoWeekNumber(date) % SONG_OF_WEEK_ROTATION.length];
  const song = getSongById(songId);
  if (!song) {
    return { type: 'finish-any-song-week' };
  }
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
