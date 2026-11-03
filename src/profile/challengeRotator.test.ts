import { getSongById } from '../instruments/piano/songs/catalog';
import { getWeeklyChallengeKind, SONG_OF_WEEK_ROTATION } from './challengeRotator';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

describe('song of the week', () => {
  it('only names songs the piano can play', () => {
    for (const id of SONG_OF_WEEK_ROTATION) {
      expect(getSongById(id)).toBeDefined();
    }
  });

  it('does not move when a song is added to the catalog', () => {
    // ISO week 45 of 2026 — the week 1.1.0 ships. The rotation is frozen, so
    // this is the song 1.0.0 already showed that week.
    const kind = getWeeklyChallengeKind(new Date('2026-11-04T12:00:00Z'));
    expect(kind).toMatchObject({
      type: 'song-of-week',
      songId: SONG_OF_WEEK_ROTATION[45 % SONG_OF_WEEK_ROTATION.length],
    });
  });
});
