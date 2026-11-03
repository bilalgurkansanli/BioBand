import {
  getBackingCurrentTimeMs,
  playBackingFrom,
  prepareBackingTrack,
  stopBackingTrack,
} from './songBackingPlayer';

type FakePlayer = {
  volume: number;
  shouldCorrectPitch: boolean;
  playbackRate: number;
  currentTime: number;
  play: jest.Mock;
  pause: jest.Mock;
  remove: jest.Mock;
  seekTo: jest.Mock;
  addListener: jest.Mock;
};

const mockCreated: FakePlayer[] = [];

jest.mock('expo-audio', () => ({
  createAudioPlayer: jest.fn(() => {
    const player: FakePlayer = {
      volume: 1,
      shouldCorrectPitch: false,
      playbackRate: 1,
      currentTime: 0,
      play: jest.fn(),
      pause: jest.fn(),
      remove: jest.fn(),
      seekTo: jest.fn(() => Promise.resolve()),
      addListener: jest.fn(() => ({ remove: jest.fn() })),
    };
    mockCreated.push(player);
    return player;
  }),
}));

/** The audio-session call every prepare/play awaits — held open by the tests. */
const mockReleaseAudioMode: (() => void)[] = [];
jest.mock('../../../audio/initAudio', () => ({
  restorePlaybackAudioMode: jest.fn(
    () =>
      new Promise<void>((resolve) => {
        mockReleaseAudioMode.push(resolve);
      }),
  ),
}));

jest.mock('../../../audio/sampleBank', () => ({
  getSharedAudioContext: () => ({ state: 'running', resume: jest.fn() }),
}));

const TRACK = { uri: 'file:///song.mp3', eventsStartMs: 0 };

/** Let every pending await run to its next suspension point. */
async function settle(): Promise<void> {
  for (let i = 0; i < 5; i++) {
    mockReleaseAudioMode.splice(0).forEach((resolve) => resolve());
    await Promise.resolve();
    await Promise.resolve();
  }
}

beforeEach(async () => {
  await stopBackingTrack();
  mockCreated.length = 0;
  mockReleaseAudioMode.length = 0;
});

it('prepares and plays a track from the requested position', async () => {
  const prepared = prepareBackingTrack(TRACK);
  await settle();
  await prepared;
  const played = playBackingFrom(1500);
  await settle();
  await played;

  expect(mockCreated).toHaveLength(1);
  expect(mockCreated[0].seekTo).toHaveBeenCalledWith(1.5);
  expect(mockCreated[0].play).toHaveBeenCalledTimes(1);
});

it('a stop during loading wins over the load finishing later', async () => {
  const prepared = prepareBackingTrack(TRACK);
  // The lesson is closed while the audio session is still being set up.
  await stopBackingTrack();
  await settle();
  await prepared;

  expect(mockCreated).toHaveLength(0);
  const played = playBackingFrom(0);
  await settle();
  await played;
  expect(getBackingCurrentTimeMs()).toBe(0);
});

it('a stop while starting playback keeps the track silent', async () => {
  const prepared = prepareBackingTrack(TRACK);
  await settle();
  await prepared;

  const played = playBackingFrom(0);
  await stopBackingTrack();
  await settle();
  await played;

  expect(mockCreated).toHaveLength(1);
  expect(mockCreated[0].play).not.toHaveBeenCalled();
  expect(mockCreated[0].remove).toHaveBeenCalled();
});
