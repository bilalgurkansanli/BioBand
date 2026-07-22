import {
  addPracticeMs,
  getPracticeMsForDay,
  loadProfileProgress,
  markChallengeComplete,
  recordSongCompletion,
  todayKey,
} from '../storage/profileProgressStorage';
import type { InstrumentId } from '../types/recording';
import { CHALLENGE_PRACTICE_MS } from '../types/profile';
import {
  dailyChallengeId,
  getDailyChallengeKind,
  getWeeklyChallengeKind,
  isoWeekKey,
  weeklyChallengeId,
} from './challengeRotator';

export type PlayAlongAwardInput = {
  instrument: InstrumentId;
  songId: string | null;
  stars: 0 | 1 | 2 | 3;
  elapsedMs: number;
};

/**
 * Backstop cap for a single play-along completion, independent of each
 * instrument hook's own cap — protects profile stats even if a hook forgets
 * to set its step-mode startTimeRef (as usePianoPlayAlong's did, which made
 * getElapsedMs() return a huge wall-clock delta for a few-minute session).
 */
const MAX_AWARD_ELAPSED_MS = 30 * 60_000;

async function maybeCompletePracticeChallenge(instrument: InstrumentId): Promise<void> {
  const day = todayKey();
  const dailyKind = getDailyChallengeKind(day);
  if (dailyKind.type !== 'practice-2min' || dailyKind.instrument !== instrument) {
    return;
  }
  const progress = await loadProfileProgress();
  const ms = getPracticeMsForDay(progress, day, instrument);
  if (ms >= CHALLENGE_PRACTICE_MS) {
    await markChallengeComplete(dailyChallengeId(day, dailyKind));
  }
}

/**
 * Award practice time + check daily/weekly song challenges after a play-along finish.
 */
export async function awardPlayAlongCompletion(input: PlayAlongAwardInput): Promise<void> {
  const elapsed = Math.min(Math.max(0, Math.round(input.elapsedMs)), MAX_AWARD_ELAPSED_MS);
  if (elapsed > 0) {
    await addPracticeMs(input.instrument, elapsed);
  }

  await maybeCompletePracticeChallenge(input.instrument);

  if (input.stars < 1) {
    return;
  }

  await recordSongCompletion();

  const day = todayKey();
  const dailyKind = getDailyChallengeKind(day);
  if (dailyKind.type === 'finish-any-song') {
    await markChallengeComplete(dailyChallengeId(day, dailyKind));
  }

  const weeklyKind = getWeeklyChallengeKind();
  const weekKey = isoWeekKey();
  if (weeklyKind.type === 'finish-any-song-week') {
    await markChallengeComplete(weeklyChallengeId(weekKey, weeklyKind));
  } else if (
    weeklyKind.type === 'song-of-week' &&
    input.songId &&
    input.songId === weeklyKind.songId
  ) {
    await markChallengeComplete(weeklyChallengeId(weekKey, weeklyKind));
  }
}

/** After a recording save — practice + maybe daily 2min challenge. */
export async function awardRecordingPractice(
  instrument: InstrumentId,
  durationMs: number,
): Promise<void> {
  if (durationMs <= 0) {
    return;
  }
  await addPracticeMs(instrument, durationMs);
  await maybeCompletePracticeChallenge(instrument);
}
