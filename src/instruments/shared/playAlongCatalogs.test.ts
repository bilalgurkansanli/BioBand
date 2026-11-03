import { DRUM_SONGS } from '../drums/songs/catalog';
import { GUITAR_SONGS } from '../guitar/songs/catalog';
import { PAD_SONGS } from '../pads/songs/catalog';
import { PIANO_SONGS } from '../piano/songs/catalog';
import { VIOLIN_SONGS } from '../violin/songs/catalog';
import {
  applyHit,
  countOverdue,
  HIT_WINDOW_MS,
  judgeStepPress,
  judgeTimedPress,
  type PlayAlongStats,
} from './playAlongScoring';
import { melodyEvents } from './songPerformance';

// Every shipped chart, played through the shared judging. A perfect player
// must score perfectly, in step and in free mode, and one skipped note must
// cost exactly one miss — the property the old per-hook judging lacked in
// fast passages.

type Note = { atMs: number; id: string };

const CHARTS: [string, Note[]][] = [
  ...PIANO_SONGS.map((song) => [
    `piano/${song.id}`,
    song.events.map((event) => ({ ...event, id: event.noteId })),
  ]),
  ...GUITAR_SONGS.map((song) => [
    `guitar/${song.id}`,
    song.events.map((event) => ({ ...event, id: event.soundId })),
  ]),
  ...VIOLIN_SONGS.map((song) => [
    `violin/${song.id}`,
    song.events.map((event) => ({ ...event, id: event.soundId })),
  ]),
  ...DRUM_SONGS.map((song) => [
    `drums/${song.id}`,
    song.events.map((event) => ({ ...event, id: event.padId })),
  ]),
  ...PAD_SONGS.map((song) => [
    `pads/${song.id}`,
    song.events.map((event) => ({ ...event, id: event.padId })),
  ]),
].map(([name, events]) => [
  name as string,
  melodyEvents(events as Note[]).sort((a, b) => a.atMs - b.atMs),
]);

const idOf = (note: Note) => note.id;

function newState(): { pointer: number } & PlayAlongStats {
  return { pointer: 0, hits: 0, misses: 0, wrongPresses: 0 };
}

function playTimed(chart: Note[], presses: Note[]) {
  const events = [...chart];
  const state = newState();
  for (const press of presses) {
    const overdue = countOverdue(events, state.pointer, press.atMs, HIT_WINDOW_MS);
    state.misses += overdue;
    state.pointer += overdue;
    const judgement = judgeTimedPress(events, state.pointer, press.id, idOf, press.atMs, HIT_WINDOW_MS);
    if (judgement.kind === 'hit') {
      applyHit(events, state, judgement);
    } else {
      state.wrongPresses += 1;
    }
  }
  state.misses += events.length - state.pointer;
  return state;
}

it('covers every catalog', () => {
  expect(CHARTS.length).toBeGreaterThan(50);
});

describe.each(CHARTS)('%s', (_name, chart) => {
  it('a perfect step-mode run scores every note', () => {
    const events = [...chart];
    const state = newState();
    for (const note of chart) {
      const judgement = judgeStepPress(events, state.pointer, note.id, idOf);
      expect(judgement.kind).toBe('hit');
      if (judgement.kind === 'hit') {
        applyHit(events, state, judgement);
      }
    }
    expect(state.hits).toBe(chart.length);
  });

  it('a perfect free-mode run scores every note', () => {
    expect(playTimed(chart, chart)).toMatchObject({
      hits: chart.length,
      misses: 0,
      wrongPresses: 0,
    });
  });

  it('a stacked onset can be played in reverse order', () => {
    const reversedGroups: Note[] = [];
    let start = 0;
    while (start < chart.length) {
      let end = start + 1;
      while (end < chart.length && Math.abs(chart[end].atMs - chart[start].atMs) < 1) {
        end += 1;
      }
      reversedGroups.push(...chart.slice(start, end).reverse());
      start = end;
    }
    expect(playTimed(chart, reversedGroups).hits).toBe(chart.length);
  });

  it('one skipped note in the middle costs exactly one miss', () => {
    const skip = Math.floor(chart.length / 2);
    const presses = chart.filter((_, index) => index !== skip);
    expect(playTimed(chart, presses)).toMatchObject({
      hits: chart.length - 1,
      misses: 1,
      wrongPresses: 0,
    });
  });
});
