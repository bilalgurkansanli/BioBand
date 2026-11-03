import { act, createElement } from 'react';
import { create, type ReactTestRenderer } from 'react-test-renderer';

import { useDrumsPlayAlong } from '../hooks/useDrumsPlayAlong';
import { useGuitarPlayAlong } from '../hooks/useGuitarPlayAlong';
import { usePadsPlayAlong } from '../hooks/usePadsPlayAlong';
import { usePianoPlayAlong } from '../hooks/usePianoPlayAlong';
import { useViolinPlayAlong } from '../hooks/useViolinPlayAlong';
import { awardPlayAlongCompletion } from '../profile/awardPlayAlong';
import {
  playBackingFrom,
  prepareBackingTrack,
} from '../instruments/piano/songs/songBackingPlayer';
import {
  usePlayAlongSession,
  type PlayAlongAdapter,
  type PlayAlongSong,
} from './usePlayAlongSession';

// --- audio, storage and profile are replaced with controllable fakes --------

const mockCtx = { currentTime: 0, state: 'running', resume: jest.fn(() => Promise.resolve()) };
jest.mock('../audio/sampleBank', () => ({
  getSharedAudioContext: () => mockCtx,
  prepareSamplePlayback: jest.fn(() => Promise.resolve()),
}));

jest.mock('../audio/songScheduler', () => ({
  startSongScheduler: jest.fn(() => ({ stop: jest.fn(), getElapsedMs: () => 0 })),
}));

const mockBacking: {
  positionMs: number;
  finished: (() => void) | null;
  prepareGate: Promise<void> | null;
} = { positionMs: 0, finished: null, prepareGate: null };
jest.mock('../instruments/piano/songs/songBackingPlayer', () => ({
  prepareBackingTrack: jest.fn(() => mockBacking.prepareGate ?? Promise.resolve()),
  playBackingFrom: jest.fn(() => Promise.resolve()),
  stopBackingTrack: jest.fn(() => Promise.resolve()),
  pauseBackingTrack: jest.fn(),
  setBackingPlaybackRate: jest.fn(),
  onBackingFinished: jest.fn((callback: () => void) => {
    mockBacking.finished = callback;
  }),
  getBackingCurrentTimeMs: jest.fn(() => mockBacking.positionMs),
  getBackingElapsedMs: jest.fn((startMs: number) => Math.max(0, mockBacking.positionMs - startMs)),
  hasPianoLessTrack: jest.fn(() => false),
}));

jest.mock('../storage/songAudioBindingsStorage', () => ({
  mergeSongWithAudioBinding: jest.fn((song: unknown) => Promise.resolve(song)),
  copySongAudioFile: jest.fn(),
  copySongPianoLessFile: jest.fn(),
  getSongAudioBinding: jest.fn(() => Promise.resolve(null)),
  saveSongAudioBinding: jest.fn(() => Promise.resolve()),
}));

jest.mock('../profile/awardPlayAlong', () => ({
  awardPlayAlongCompletion: jest.fn(() => Promise.resolve()),
}));

jest.mock('../storage/profileProgressStorage', () => ({
  recordFeatureUse: jest.fn(() => Promise.resolve()),
}));

// --- a tiny instrument ---------------------------------------------------------

type Ev = { id: string; atMs: number; role?: 'melody' | 'accompaniment' };
type Song = PlayAlongSong<Ev>;

/** Four notes 70 ms apart — closer than the hit window, like Gülpembe's runs. */
const RUN: Song = {
  id: 'run',
  title: 'Run',
  events: [
    { id: 'a', atMs: 1000 },
    { id: 'b', atMs: 1070 },
    { id: 'c', atMs: 1140 },
    { id: 'd', atMs: 1210 },
  ],
};
const BAND_RUN: Song = { ...RUN, id: 'band-run', backingTrack: { uri: 'file:///mix.mp3', eventsStartMs: 0 } };

function adapter(overrides: Partial<PlayAlongAdapter<Ev, Song, 'solo'>> = {}) {
  const value: PlayAlongAdapter<Ev, Song, 'solo'> = {
    instrument: 'guitar',
    soloMode: 'solo',
    catalog: [],
    findCatalogSong: () => undefined,
    resolveSession: (song, mode) => ({
      events: song.events,
      useBacking: mode === 'fullBand' && !!song.backingTrack,
      audioStartMs: 0,
    }),
    idOf: (event) => event.id,
    sustains: true,
    penalizeMistimed: true,
    activeDuringWizard: true,
    replayRestarts: false,
    bandSkipsLevelPick: false,
    pressAlwaysSounds: false,
    ...overrides,
  };
  return value;
}

function renderHook<T>(hook: () => T) {
  const result = { current: undefined as unknown as T };
  function Probe() {
    result.current = hook();
    return null;
  }
  let renderer: ReactTestRenderer | null = null;
  act(() => {
    renderer = create(createElement(Probe));
  });
  return {
    result,
    unmount: () =>
      act(() => {
        renderer?.unmount();
      }),
  };
}

/** Run `fn` inside act and let every promise it started settle. */
async function settle(fn?: () => unknown): Promise<void> {
  await act(async () => {
    fn?.();
    for (let i = 0; i < 10; i++) {
      await Promise.resolve();
    }
  });
}

function advance(ms: number): void {
  act(() => {
    jest.advanceTimersByTime(ms);
  });
}

const SONGS = [RUN, BAND_RUN];

beforeAll(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
});

beforeEach(() => {
  jest.useFakeTimers();
  jest.clearAllMocks();
  mockCtx.currentTime = 0;
  mockBacking.positionMs = 0;
  mockBacking.finished = null;
  mockBacking.prepareGate = null;
});

afterEach(() => {
  jest.useRealTimers();
});

async function pickSong(
  hook: { current: ReturnType<typeof usePlayAlongSession<Ev, Song, 'solo'>> },
  songId: string,
) {
  await settle(() => hook.current.open());
  await settle(() => hook.current.selectSong(songId));
  await settle(() => hook.current.selectScope('full'));
}

describe('free mode', () => {
  it('a missed note in a fast run costs one miss, and the award is wall-clock time', async () => {
    const play = jest.fn();
    const { result } = renderHook(() => usePlayAlongSession(adapter(), play, SONGS));
    await pickSong(result, 'run');
    await settle(() => result.current.selectLevel('free'));
    advance(3 * 800);
    expect(result.current.phase).toBe('playing');

    for (const [id, atSeconds] of [['a', 1.0], ['c', 1.14], ['d', 1.21]] as const) {
      mockCtx.currentTime = atSeconds;
      await settle(() => result.current.handlePress(id));
    }

    expect(result.current.results).toMatchObject({ hits: 3, misses: 1, wrongPresses: 0 });
    expect(awardPlayAlongCompletion).toHaveBeenCalledTimes(1);
    expect(awardPlayAlongCompletion).toHaveBeenCalledWith(
      expect.objectContaining({ instrument: 'guitar', songId: 'run', elapsedMs: 1210 }),
    );
    advance(700);
    expect(result.current.phase).toBe('results');
  });

  it('the tick loop scores notes nobody played as misses', async () => {
    const { result } = renderHook(() => usePlayAlongSession(adapter(), jest.fn(), SONGS));
    await pickSong(result, 'run');
    await settle(() => result.current.selectLevel('free'));
    advance(3 * 800);
    mockCtx.currentTime = 5;
    advance(60);
    expect(result.current.results).toMatchObject({ hits: 0, misses: 4 });
  });
});

describe('band mode', () => {
  it('step mode: the track ending counts every unplayed note as missed', async () => {
    const { result } = renderHook(() => usePlayAlongSession(adapter(), jest.fn(), SONGS));
    await pickSong(result, 'band-run');
    await settle(() => result.current.selectPlayMode('fullBand'));
    expect(result.current.phase).toBe('pickLevel');
    await settle(() => result.current.selectLevel('medium'));
    expect(playBackingFrom).toHaveBeenCalled();

    await settle(() => result.current.handlePress('a'));
    mockCtx.currentTime = 42;
    await settle(() => mockBacking.finished?.());
    // A second end signal must not score or award the session again.
    await settle(() => mockBacking.finished?.());

    expect(result.current.results).toMatchObject({ hits: 1, misses: 3, stars: 0 });
    expect(result.current.progress).toEqual({ resolved: 4, total: 4, hits: 1 });
    expect(awardPlayAlongCompletion).toHaveBeenCalledTimes(1);
    expect(awardPlayAlongCompletion).toHaveBeenCalledWith(
      expect.objectContaining({ stars: 0, elapsedMs: 42_000 }),
    );
  });

  it('Stop while the demo track is loading starts nothing afterwards', async () => {
    let release: () => void = () => {};
    mockBacking.prepareGate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const { result } = renderHook(() => usePlayAlongSession(adapter(), jest.fn(), SONGS));
    await pickSong(result, 'band-run');
    await settle(() => result.current.selectPlayMode('fullBand'));
    await settle(() => result.current.selectLevel('guided'));
    expect(result.current.phase).toBe('demo');
    expect(prepareBackingTrack).toHaveBeenCalled();

    await settle(() => result.current.close());
    const intervals = jest.spyOn(globalThis, 'setInterval');
    await settle(() => release());

    expect(result.current.phase).toBe('idle');
    expect(playBackingFrom).not.toHaveBeenCalled();
    // No demo tick interval was installed once the load finished.
    expect(intervals).not.toHaveBeenCalled();
    intervals.mockRestore();
  });

  it('leaving the screen while the countdown loads starts nothing afterwards', async () => {
    let release: () => void = () => {};
    mockBacking.prepareGate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const { result, unmount } = renderHook(() => usePlayAlongSession(adapter(), jest.fn(), SONGS));
    await pickSong(result, 'band-run');
    await settle(() => result.current.selectPlayMode('fullBand'));
    await settle(() => result.current.selectLevel('free'));
    unmount();
    const timeouts = jest.spyOn(globalThis, 'setTimeout');
    await settle(() => release());
    // The countdown's step timers were never installed.
    expect(timeouts.mock.calls.filter(([, delay]) => (delay ?? 0) >= 800)).toHaveLength(0);
    timeouts.mockRestore();
  });

  it('a band-first instrument skips the level picker and plays free', async () => {
    const { result } = renderHook(() =>
      usePlayAlongSession(adapter({ bandSkipsLevelPick: true }), jest.fn(), SONGS),
    );
    await pickSong(result, 'band-run');
    await settle(() => result.current.selectPlayMode('fullBand'));
    expect(result.current.phase).toBe('countdown');
    expect(result.current.level).toBe('free');
  });
});

describe('press sounds', () => {
  it('instrument-style: silent during the demo, audible in the wizard', async () => {
    const play = jest.fn();
    const { result } = renderHook(() => usePlayAlongSession(adapter(), play, SONGS));
    await pickSong(result, 'run');
    await settle(() => result.current.handlePress('a'));
    expect(play).toHaveBeenCalledWith('a');
    play.mockClear();
    await settle(() => result.current.selectLevel('guided'));
    await settle(() => result.current.handlePress('a'));
    expect(play).not.toHaveBeenCalled();
  });

  it('keyboard-style: every press sounds, even during the demo', async () => {
    const play = jest.fn();
    const { result } = renderHook(() =>
      usePlayAlongSession(adapter({ pressAlwaysSounds: true }), play, SONGS),
    );
    await pickSong(result, 'run');
    await settle(() => result.current.selectLevel('guided'));
    await settle(() => result.current.handlePress('a'));
    expect(play).toHaveBeenCalledWith('a');
  });
});

describe('replay', () => {
  it('returns to the level picker, or restarts at once where the screen wants that', async () => {
    const back = renderHook(() => usePlayAlongSession(adapter(), jest.fn(), SONGS));
    await pickSong(back.result, 'run');
    await settle(() => back.result.current.replay());
    expect(back.result.current.phase).toBe('pickLevel');

    const again = renderHook(() =>
      usePlayAlongSession(adapter({ replayRestarts: true }), jest.fn(), SONGS),
    );
    await pickSong(again.result, 'run');
    await settle(() => again.result.current.selectLevel('medium'));
    await settle(() => again.result.current.replay());
    expect(again.result.current.phase).toBe('playing');
  });
});

describe('instrument hooks keep their public shape', () => {
  const COMMON = [
    'phase',
    'selectedSong',
    'playMode',
    'songScope',
    'level',
    'tempo',
    'countdownValue',
    'progress',
    'results',
    'demoJustFinished',
    'isActive',
    'isListeningOutro',
    'hasBackingAudio',
    'calibrateOffsetMs',
    'calibratePreviewing',
    'audioBusy',
    'offsetMinMs',
    'offsetMaxMs',
    'songs',
    'open',
    'close',
    'selectSong',
    'selectPlayMode',
    'selectScope',
    'selectLevel',
    'setTempo',
    'goBack',
    'backToSongList',
    'replay',
    'pickBackingAudio',
    'setCalibrateOffset',
    'previewCalibrate',
    'stopCalibratePreview',
    'confirmCalibrate',
  ];
  const keysOf = (value: object) => Object.keys(value).sort();

  const hooks: [string, () => { songs: unknown[] }, string[]][] = [
    ['guitar', () => useGuitarPlayAlong(jest.fn()), ['guideSoundId', 'handleSoundPress']],
    ['violin', () => useViolinPlayAlong(jest.fn()), ['guideSoundId', 'handleSoundPress']],
    ['drums', () => useDrumsPlayAlong(jest.fn()), ['guidePadId', 'handlePadPress']],
    [
      'pads',
      () => usePadsPlayAlong(jest.fn()),
      ['guidePadId', 'handlePadPress', 'hasPadLessBacking', 'pickPadLessBacking', 'openRecalibrate'],
    ],
    [
      'piano',
      () => usePianoPlayAlong(jest.fn()),
      [
        'guideNoteId',
        'handleNotePress',
        'hasPianoLessBacking',
        'pickPianoLessBacking',
        'openRecalibrate',
      ],
    ],
  ];

  it.each(hooks)('%s', (_name, hook, extra) => {
    const { result } = renderHook(hook);
    expect(keysOf(result.current)).toEqual([...COMMON, ...extra].sort());
    expect(result.current.songs.length).toBeGreaterThan(0);
  });

  it('isActive covers the wizard on guitar but only the session on piano', async () => {
    const guitar = renderHook(() => useGuitarPlayAlong(jest.fn()));
    const piano = renderHook(() => usePianoPlayAlong(jest.fn()));
    await settle(() => guitar.result.current.open());
    await settle(() => piano.result.current.open());
    expect(guitar.result.current.isActive).toBe(true);
    expect(piano.result.current.isActive).toBe(false);
  });
});
