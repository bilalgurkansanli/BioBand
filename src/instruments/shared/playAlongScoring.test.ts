import {
  applyHit,
  computeStars,
  countOverdue,
  groupEnd,
  HIT_WINDOW_MS,
  judgeStepPress,
  judgeTimedPress,
  MAX_AWARD_ELAPSED_MS,
  sessionElapsedMs,
  summarizeResults,
  type PlayAlongStats,
} from './playAlongScoring';

type Note = { id: string; atMs: number };
const idOf = (note: Note) => note.id;

function chart(spec: [string, number][]): Note[] {
  return spec.map(([id, atMs]) => ({ id, atMs }));
}

/**
 * Plays a free-mode session the way the hooks do: the tick expires overdue
 * notes between presses, each press is judged and applied, and anything still
 * open at the end is a miss.
 */
function simulate(notes: Note[], presses: [string, number][], windowMs = HIT_WINDOW_MS) {
  const events = [...notes];
  const state: { pointer: number } & PlayAlongStats = {
    pointer: 0,
    hits: 0,
    misses: 0,
    wrongPresses: 0,
  };
  for (const [id, atMs] of presses) {
    const overdue = countOverdue(events, state.pointer, atMs, windowMs);
    state.misses += overdue;
    state.pointer += overdue;
    const judgement = judgeTimedPress(events, state.pointer, id, idOf, atMs, windowMs);
    if (judgement.kind === 'hit') {
      applyHit(events, state, judgement);
    } else {
      state.wrongPresses += 1;
    }
  }
  state.misses += events.length - state.pointer;
  return state;
}

describe('stars and results', () => {
  it('maps accuracy onto stars', () => {
    expect(computeStars(0.95)).toBe(3);
    expect(computeStars(0.9)).toBe(3);
    expect(computeStars(0.7)).toBe(2);
    expect(computeStars(0.45)).toBe(1);
    expect(computeStars(0.44)).toBe(0);
  });

  it('counts wrong presses against accuracy', () => {
    const results = summarizeResults({ hits: 8, misses: 1, wrongPresses: 1 }, 9);
    expect(results.accuracy).toBeCloseTo(0.8);
    expect(results.stars).toBe(2);
    expect(summarizeResults({ hits: 0, misses: 0, wrongPresses: 0 }, 0).accuracy).toBe(0);
  });
});

describe('judgeStepPress', () => {
  it('accepts the current note and rejects anything else', () => {
    const notes = chart([['a', 0], ['b', 500]]);
    expect(judgeStepPress(notes, 0, 'a', idOf)).toEqual({ kind: 'hit', index: 0, skipped: 0 });
    expect(judgeStepPress(notes, 0, 'b', idOf)).toEqual({ kind: 'wrong' });
    expect(judgeStepPress(notes, 2, 'a', idOf)).toEqual({ kind: 'wrong' });
  });

  it('accepts a chord in any order', () => {
    const notes = chart([['kick', 0], ['crash', 0], ['snare', 500]]);
    expect(judgeStepPress(notes, 0, 'crash', idOf)).toEqual({ kind: 'hit', index: 1, skipped: 0 });
  });
});

describe('judgeTimedPress', () => {
  it('hits the current note inside its window', () => {
    const notes = chart([['a', 1000]]);
    expect(judgeTimedPress(notes, 0, 'a', idOf, 1200, HIT_WINDOW_MS)).toEqual({
      kind: 'hit',
      index: 0,
      skipped: 0,
    });
  });

  it('looks past a missed note in a fast run (Gülpembe, ~70 ms apart)', () => {
    const notes = chart([['a', 0], ['b', 70], ['c', 140], ['d', 210]]);
    // a played, b missed, c on time.
    expect(judgeTimedPress(notes, 1, 'c', idOf, 140, HIT_WINDOW_MS)).toEqual({
      kind: 'hit',
      index: 2,
      skipped: 1,
    });
  });

  it('does not let a wrong key on the beat steal a later note', () => {
    const notes = chart([['b', 0], ['a', 200]]);
    expect(judgeTimedPress(notes, 0, 'a', idOf, 0, HIT_WINDOW_MS)).toEqual({ kind: 'wrong' });
  });

  it('reports the right note pressed too early as mistimed', () => {
    const notes = chart([['a', 1000]]);
    expect(judgeTimedPress(notes, 0, 'a', idOf, 0, HIT_WINDOW_MS)).toEqual({ kind: 'mistimed' });
  });

  it('treats onsets a float-noise apart as one group (Teen Spirit kick/hat)', () => {
    const t = 3 * (60000 / 116);
    const notes = chart([['kick', t], ['hat', t + 1e-12], ['snare', t + 500]]);
    expect(groupEnd(notes, 0)).toBe(2);
    expect(judgeTimedPress(notes, 0, 'hat', idOf, t, HIT_WINDOW_MS)).toEqual({
      kind: 'hit',
      index: 1,
      skipped: 0,
    });
  });

  it('skips only the notes before the matched group, never its partners', () => {
    const notes = chart([['x', 0], ['a', 100], ['b', 100]]);
    expect(judgeTimedPress(notes, 0, 'b', idOf, 100, HIT_WINDOW_MS)).toEqual({
      kind: 'hit',
      index: 2,
      skipped: 1,
    });
  });

  it('is wrong when nothing with that id is in reach', () => {
    const notes = chart([['a', 0], ['b', 2000]]);
    expect(judgeTimedPress(notes, 0, 'c', idOf, 0, HIT_WINDOW_MS)).toEqual({ kind: 'wrong' });
    expect(judgeTimedPress(notes, 0, 'b', idOf, 0, HIT_WINDOW_MS)).toEqual({ kind: 'wrong' });
  });

  it('passes over a note whose window has closed but the tick has not expired yet', () => {
    const notes = chart([['a', 0], ['b', 500]]);
    expect(judgeTimedPress(notes, 0, 'b', idOf, 420, HIT_WINDOW_MS)).toEqual({
      kind: 'hit',
      index: 1,
      skipped: 1,
    });
  });
});

describe('countOverdue and applyHit', () => {
  it('counts notes whose window has closed', () => {
    const notes = chart([['a', 0], ['b', 100], ['c', 1000]]);
    expect(countOverdue(notes, 0, 349, HIT_WINDOW_MS)).toBe(0);
    expect(countOverdue(notes, 0, 451, HIT_WINDOW_MS)).toBe(2);
    expect(countOverdue(notes, 2, 451, HIT_WINDOW_MS)).toBe(0);
  });

  it('moves the matched note to the front of its group and scores the skip', () => {
    const notes = chart([['x', 0], ['a', 100], ['b', 100]]);
    const state = { pointer: 0, hits: 0, misses: 0, wrongPresses: 0 };
    applyHit(notes, state, { index: 2, skipped: 1 });
    expect(notes.map(idOf)).toEqual(['x', 'b', 'a']);
    expect(state).toEqual({ pointer: 2, hits: 1, misses: 1, wrongPresses: 0 });
  });
});

describe('a whole free-mode run', () => {
  const run = chart(Array.from({ length: 12 }, (_, i) => [`n${i % 5}`, i * 70] as [string, number]));

  it('one missed note costs one miss, not the rest of the passage', () => {
    const presses = run
      .filter((_, i) => i !== 3)
      .map((note) => [note.id, note.atMs + 20] as [string, number]);
    expect(simulate(run, presses)).toMatchObject({ hits: 11, misses: 1, wrongPresses: 0 });
  });

  it('a perfect run is perfect', () => {
    const presses = run.map((note) => [note.id, note.atMs] as [string, number]);
    expect(simulate(run, presses)).toMatchObject({ hits: 12, misses: 0, wrongPresses: 0 });
  });

  it('a chord can be played in either order', () => {
    const notes = chart([['c', 0], ['e', 0], ['g', 0], ['c', 600]]);
    expect(
      simulate(notes, [['g', 10], ['c', 15], ['e', 20], ['c', 600]]),
    ).toMatchObject({ hits: 4, misses: 0, wrongPresses: 0 });
  });

  it('mashing does not score', () => {
    const notes = chart([['a', 0], ['b', 500]]);
    const presses: [string, number][] = [['z', 0], ['y', 10], ['x', 20], ['w', 30]];
    expect(simulate(notes, presses)).toMatchObject({ hits: 0, misses: 2, wrongPresses: 4 });
  });
});

describe('sessionElapsedMs', () => {
  it('is real time on the audio clock, in ms', () => {
    expect(sessionElapsedMs(10, 70)).toBe(60_000);
  });

  it('never goes negative, never passes the cap, never NaN', () => {
    expect(sessionElapsedMs(70, 10)).toBe(0);
    expect(sessionElapsedMs(0, 100_000)).toBe(MAX_AWARD_ELAPSED_MS);
    expect(sessionElapsedMs(Number.NaN, 5)).toBe(0);
  });
});
