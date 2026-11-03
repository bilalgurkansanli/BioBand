// How a play-along press is judged against the chart. Pure and shared by all
// five instruments: the judging used to be written out in each hook, and the
// copies had drifted — only drums let a chord be hit in any order, and none of
// them could recover from a single missed note in a fast passage.
//
// The chart is a list of `{ atMs }` sorted by onset. `pointer` is the first
// note not yet resolved; everything before it is a hit or a miss.

/** How far either side of a note's onset a press still counts. */
export const HIT_WINDOW_MS = 350;
/** Slightly wider window when playing over a live mix (latency + distraction). */
export const HIT_WINDOW_BAND_MS = 480;

/**
 * Onsets closer than this are struck together — a chord, kick + crash on a
 * downbeat — and may be played in any order. Not zero: charts computed from a
 * tempo carry float noise (Smells Like Teen Spirit has kick/hat pairs about
 * 1e-12 ms apart), and exact equality split those into "kick first, then hat".
 */
export const SIMULTANEOUS_EPSILON_MS = 1;

export type Stars = 0 | 1 | 2 | 3;

export type PlayAlongStats = {
  hits: number;
  misses: number;
  wrongPresses: number;
};

export type PlayAlongResults = PlayAlongStats & {
  totalNotes: number;
  accuracy: number;
  stars: Stars;
};

type Timed = { atMs: number };

export function computeStars(accuracy: number): Stars {
  if (accuracy >= 0.9) {
    return 3;
  }
  if (accuracy >= 0.7) {
    return 2;
  }
  if (accuracy >= 0.45) {
    return 1;
  }
  return 0;
}

/** Practice-award ceiling per session — step mode can sit idle indefinitely. */
export const MAX_AWARD_ELAPSED_MS = 30 * 60_000;

/**
 * Practice time a finished session earns: real time between the session's
 * start and now, both read off the shared audio clock (seconds).
 *
 * Not the song clock. That one is tempo-scaled — a slow run would earn less
 * than it took — and in Band Mode it is the backing track's position, which
 * reads 0 once the track has been stopped at the end of the session.
 */
export function sessionElapsedMs(startSeconds: number, nowSeconds: number): number {
  const elapsed = (nowSeconds - startSeconds) * 1000;
  if (!Number.isFinite(elapsed)) {
    return 0;
  }
  return Math.min(MAX_AWARD_ELAPSED_MS, Math.max(0, elapsed));
}

/** Accuracy counts wrong presses against the player, so mashing cannot score. */
export function summarizeResults(stats: PlayAlongStats, totalNotes: number): PlayAlongResults {
  const scored = stats.hits + stats.misses + stats.wrongPresses;
  const accuracy = scored > 0 ? stats.hits / scored : 0;
  return {
    totalNotes,
    hits: stats.hits,
    misses: stats.misses,
    wrongPresses: stats.wrongPresses,
    accuracy,
    stars: computeStars(accuracy),
  };
}

function together(a: Timed, b: Timed): boolean {
  return Math.abs(a.atMs - b.atMs) < SIMULTANEOUS_EPSILON_MS;
}

/** Exclusive end of the simultaneous group that starts at `start`. */
export function groupEnd(chart: readonly Timed[], start: number): number {
  let end = start + 1;
  while (end < chart.length && together(chart[end], chart[start])) {
    end += 1;
  }
  return end;
}

/** First index (not below `floor`) of the simultaneous group containing `index`. */
function groupStart(chart: readonly Timed[], index: number, floor: number): number {
  let start = index;
  while (start - 1 >= floor && together(chart[start - 1], chart[index])) {
    start -= 1;
  }
  return start;
}

export type PressJudgement =
  /**
   * The press plays `chart[index]`. The `skipped` notes before its group were
   * passed over and are misses.
   */
  | { kind: 'hit'; index: number; skipped: number }
  /** Right note for the current group, but outside its window. */
  | { kind: 'mistimed' }
  /** Nothing the press could be playing. */
  | { kind: 'wrong' };

const WRONG: PressJudgement = { kind: 'wrong' };

/**
 * Step mode: no clock, the user plays the chart in order. Any member of the
 * current simultaneous group is accepted.
 */
export function judgeStepPress<E extends Timed>(
  chart: readonly E[],
  pointer: number,
  pressedId: string,
  idOf: (event: E) => string,
): PressJudgement {
  if (pointer >= chart.length) {
    return WRONG;
  }
  const end = groupEnd(chart, pointer);
  for (let i = pointer; i < end; i++) {
    if (idOf(chart[i]) === pressedId) {
      return { kind: 'hit', index: i, skipped: 0 };
    }
  }
  return WRONG;
}

/**
 * Free mode: the press at `nowMs` is matched against the earliest unresolved
 * note with the same id whose window (`±windowMs`) is open.
 *
 * Looking past the current note is the point. When notes are closer together
 * than the window — runs in Gülpembe sit ~70 ms apart — a single missed note
 * used to leave the pointer behind, and every correct press after it was
 * judged against the stale note and scored as wrong until a long rest let the
 * tick loop catch up. Now the passed-over notes become misses and the hit
 * counts.
 *
 * It only skips when the press is at least as close in time to the matched
 * note as to every note it would skip. Without that, a wrong key pressed right
 * on a note's beat would "steal" a later note of that pitch, costing a miss
 * and a hit instead of one wrong press.
 */
export function judgeTimedPress<E extends Timed>(
  chart: readonly E[],
  pointer: number,
  pressedId: string,
  idOf: (event: E) => string,
  nowMs: number,
  windowMs: number,
): PressJudgement {
  if (pointer >= chart.length || !Number.isFinite(nowMs)) {
    return WRONG;
  }

  for (let i = pointer; i < chart.length; i++) {
    const atMs = chart[i].atMs;
    if (atMs - windowMs > nowMs) {
      // Sorted: this note and everything after it is still in the future.
      break;
    }
    if (Math.abs(nowMs - atMs) > windowMs || idOf(chart[i]) !== pressedId) {
      continue;
    }

    const start = groupStart(chart, i, pointer);
    const distance = Math.abs(nowMs - atMs);
    for (let k = pointer; k < start; k++) {
      if (Math.abs(nowMs - chart[k].atMs) < distance) {
        return WRONG;
      }
    }
    return { kind: 'hit', index: i, skipped: start - pointer };
  }

  const end = groupEnd(chart, pointer);
  for (let i = pointer; i < end; i++) {
    if (idOf(chart[i]) === pressedId) {
      return { kind: 'mistimed' };
    }
  }
  return WRONG;
}

/** How many notes from `pointer` on have had their window close by `nowMs`. */
export function countOverdue(
  chart: readonly Timed[],
  pointer: number,
  nowMs: number,
  windowMs: number,
): number {
  let index = pointer;
  while (index < chart.length && nowMs > chart[index].atMs + windowMs) {
    index += 1;
  }
  return index - pointer;
}

/**
 * Score a judged hit in place: the skipped notes become misses, the matched
 * note is swapped to the front of its group (which can only reorder notes that
 * share an onset) and the pointer moves past it. `chart` must be the session's
 * own copy, never a catalog array.
 */
export function applyHit<E>(
  chart: E[],
  state: { pointer: number } & PlayAlongStats,
  judgement: { index: number; skipped: number },
): void {
  const front = state.pointer + judgement.skipped;
  if (judgement.index !== front) {
    const moved = chart[judgement.index];
    chart[judgement.index] = chart[front];
    chart[front] = moved;
  }
  state.misses += judgement.skipped;
  state.hits += 1;
  state.pointer = front + 1;
}
