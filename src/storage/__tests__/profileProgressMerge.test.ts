import {
  coerceProfileProgress,
  mergeProfileProgress,
} from '../profileProgressStorage';
import { EMPTY_PROFILE_PROGRESS, type ProfileProgress } from '../../types/profile';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

function progress(overrides: Partial<ProfileProgress>): ProfileProgress {
  return { ...EMPTY_PROFILE_PROGRESS, ...overrides };
}

describe('mergeProfileProgress', () => {
  it('keeps practice from both copies, taking the larger per day and instrument', () => {
    const merged = mergeProfileProgress(
      progress({ practiceByDay: { '2026-11-01': { piano: 600 }, '2026-11-02': { drums: 100 } } }),
      progress({ practiceByDay: { '2026-11-01': { piano: 900, violin: 50 } } }),
    );
    expect(merged.practiceByDay).toEqual({
      '2026-11-01': { piano: 900, violin: 50 },
      '2026-11-02': { drums: 100 },
    });
  });

  it('unions completed challenges and keeps the highest counters', () => {
    const merged = mergeProfileProgress(
      progress({
        completedChallengeIds: ['daily-b', 'daily-a'],
        totalSongCompletions: 4,
        featureUse: { studioOpened: 2, tutorialOpened: 7 },
      }),
      progress({
        completedChallengeIds: ['daily-a', 'weekly-c'],
        totalSongCompletions: 9,
        featureUse: { studioOpened: 5, backupExported: 1 },
      }),
    );
    expect(merged.completedChallengeIds).toEqual(['daily-a', 'daily-b', 'weekly-c']);
    expect(merged.totalSongCompletions).toBe(9);
    expect(merged.featureUse).toEqual({ studioOpened: 5, tutorialOpened: 7, backupExported: 1 });
  });

  it('is order-independent, so two devices converge on the same value', () => {
    const a = progress({
      streakCount: 3,
      longestStreak: 5,
      lastPracticeDay: '2026-11-02',
      practiceByDay: { '2026-11-02': { piano: 10 } },
      completedChallengeIds: ['x'],
    });
    const b = progress({
      streakCount: 1,
      longestStreak: 8,
      lastPracticeDay: '2026-10-20',
      practiceByDay: { '2026-10-20': { drums: 20 } },
      completedChallengeIds: ['y'],
    });
    expect(mergeProfileProgress(a, b)).toEqual(mergeProfileProgress(b, a));
  });

  it('is idempotent', () => {
    const a = progress({
      streakCount: 2,
      lastPracticeDay: '2026-11-02',
      practiceByDay: { '2026-11-01': { piano: 5 }, '2026-11-02': { piano: 5 } },
    });
    const once = mergeProfileProgress(a, a);
    expect(mergeProfileProgress(once, a)).toEqual(once);
  });

  it('joins a streak practised across two devices', () => {
    // Phone A practised Oct 30 – Nov 1 (streak 3); phone B, last synced
    // before that, practised Nov 2 and saw only a fresh streak of 1.
    const phoneA = progress({
      streakCount: 3,
      longestStreak: 3,
      lastPracticeDay: '2026-11-01',
      practiceByDay: {
        '2026-10-30': { piano: 1 },
        '2026-10-31': { piano: 1 },
        '2026-11-01': { piano: 1 },
      },
    });
    const phoneB = progress({
      streakCount: 1,
      longestStreak: 1,
      lastPracticeDay: '2026-11-02',
      practiceByDay: { '2026-11-02': { guitar: 1 } },
    });
    const merged = mergeProfileProgress(phoneB, phoneA);
    expect(merged.lastPracticeDay).toBe('2026-11-02');
    expect(merged.streakCount).toBe(4);
    expect(merged.longestStreak).toBe(4);
  });

  it("extends a copy's streak beyond the days its log still covers", () => {
    // A long streak whose early days are not in the per-day log any more.
    const old = progress({
      streakCount: 100,
      longestStreak: 100,
      lastPracticeDay: '2026-11-01',
      practiceByDay: { '2026-11-01': { piano: 1 } },
    });
    const fresh = progress({
      streakCount: 1,
      longestStreak: 1,
      lastPracticeDay: '2026-11-02',
      practiceByDay: { '2026-11-02': { piano: 1 } },
    });
    expect(mergeProfileProgress(fresh, old).streakCount).toBe(101);
  });

  it('does not join runs separated by a missed day', () => {
    const merged = mergeProfileProgress(
      progress({
        streakCount: 5,
        lastPracticeDay: '2026-10-30',
        practiceByDay: { '2026-10-30': { piano: 1 } },
      }),
      progress({
        streakCount: 1,
        lastPracticeDay: '2026-11-01',
        practiceByDay: { '2026-11-01': { piano: 1 } },
      }),
    );
    expect(merged.streakCount).toBe(1);
    expect(merged.longestStreak).toBe(1);
  });

  it('never lowers the longest streak either copy recorded', () => {
    const merged = mergeProfileProgress(
      progress({ longestStreak: 30 }),
      progress({ longestStreak: 12 }),
    );
    expect(merged.longestStreak).toBe(30);
  });
});

describe('coerceProfileProgress', () => {
  it('rejects values that are not objects', () => {
    expect(coerceProfileProgress(null)).toBeNull();
    expect(coerceProfileProgress('progress')).toBeNull();
    expect(coerceProfileProgress([])).toBeNull();
  });

  it('turns an empty object into empty progress, which merges harmlessly', () => {
    expect(coerceProfileProgress({})).toEqual({ ...EMPTY_PROFILE_PROGRESS });
  });

  it('repairs each field on its own instead of discarding the blob', () => {
    const coerced = coerceProfileProgress({
      streakCount: -3,
      longestStreak: 'many',
      lastPracticeDay: 'yesterday',
      practiceByDay: {
        '2026-11-01': { piano: 1e12, drums: 'x' },
        'not-a-day': { piano: 5 },
        '2026-11-02': null,
      },
      completedChallengeIds: ['ok', 7, null],
      totalSongCompletions: Number.NaN,
      featureUse: { studioOpened: 3, tutorialOpened: -1 },
    });
    expect(coerced).toEqual({
      streakCount: 0,
      longestStreak: 0,
      lastPracticeDay: null,
      practiceByDay: { '2026-11-01': { piano: 24 * 60 * 60 * 1000, drums: 0 } },
      completedChallengeIds: ['ok'],
      totalSongCompletions: 0,
      featureUse: { studioOpened: 3 },
    });
  });

  it('carries fields this build does not know through untouched', () => {
    expect(coerceProfileProgress({ futureField: { level: 3 } })).toMatchObject({
      futureField: { level: 3 },
    });
  });
});
