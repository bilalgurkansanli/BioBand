import { awardPlayAlongCompletion } from './awardPlayAlong';
import {
  completesSongOfWeek,
  getWeeklyChallengeKind,
  isoWeekKey,
  weeklyChallengeId,
} from './challengeRotator';
import { markChallengeComplete } from '../storage/profileProgressStorage';

jest.mock('../storage/profileProgressStorage', () => ({
  addPracticeMs: jest.fn(() => Promise.resolve()),
  getPracticeMsForDay: jest.fn(() => 0),
  loadProfileProgress: jest.fn(() => Promise.resolve({})),
  markChallengeComplete: jest.fn(() => Promise.resolve()),
  recordSongCompletion: jest.fn(() => Promise.resolve()),
  todayKey: jest.fn(() => '2026-11-03'),
}));

jest.mock('./challengeRotator', () => ({
  ...jest.requireActual('./challengeRotator'),
  getWeeklyChallengeKind: jest.fn(() => ({
    type: 'song-of-week',
    songId: 'billie-jean',
    songTitle: 'Billie Jean',
  })),
}));

const SONG_OF_WEEK = { type: 'song-of-week', songId: 'billie-jean', songTitle: 'Billie Jean' } as const;

describe('completesSongOfWeek', () => {
  it('matches the piano song by id', () => {
    expect(completesSongOfWeek(SONG_OF_WEEK, 'piano', 'billie-jean')).toBe(true);
  });

  it('ignores the same id on another instrument', () => {
    // Drums, guitar and violin all ship songs whose ids collide with piano's.
    expect(completesSongOfWeek(SONG_OF_WEEK, 'drums', 'billie-jean')).toBe(false);
    expect(completesSongOfWeek(SONG_OF_WEEK, 'violin', 'billie-jean')).toBe(false);
  });

  it('needs the right song and a song-of-week challenge', () => {
    expect(completesSongOfWeek(SONG_OF_WEEK, 'piano', 'fur-elise')).toBe(false);
    expect(completesSongOfWeek(SONG_OF_WEEK, 'piano', null)).toBe(false);
    expect(completesSongOfWeek({ type: 'finish-any-song-week' }, 'piano', 'billie-jean')).toBe(false);
  });
});

describe('awardPlayAlongCompletion and the song of the week', () => {
  const calls = () => (markChallengeComplete as jest.Mock).mock.calls.map(([id]) => id as string);

  beforeEach(() => {
    (markChallengeComplete as jest.Mock).mockClear();
  });

  it('a drums run of a same-named song does not complete it', async () => {
    await awardPlayAlongCompletion({ instrument: 'drums', songId: 'billie-jean', stars: 3, elapsedMs: 1000 });
    expect(calls().some((id) => id.includes(':song-of-week:'))).toBe(false);
  });

  it('the piano run does, under the same id as before', async () => {
    await awardPlayAlongCompletion({ instrument: 'piano', songId: 'billie-jean', stars: 2, elapsedMs: 1000 });
    expect(getWeeklyChallengeKind()).toEqual(SONG_OF_WEEK);
    // Stored ids keep their old shape, so past completions still count.
    expect(calls()).toContain(weeklyChallengeId(isoWeekKey(), SONG_OF_WEEK));
    expect(weeklyChallengeId('2026-W45', SONG_OF_WEEK)).toBe('weekly:2026-W45:song-of-week:billie-jean');
  });
});
