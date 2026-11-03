import { loadSample } from '../sampleBank';

// jest.mock calls are hoisted above the import, so the stubs are in place
// before the sample bank loads.
//
// The sample bank talks to the native audio module; only the decode is needed
// here, so the context is replaced by a stub whose decodes we control.
const mockDecodeAudioData = jest.fn();

jest.mock('../audioApi', () => ({
  AudioContext: jest.fn().mockImplementation(() => ({
    decodeAudioData: mockDecodeAudioData,
    currentTime: 0,
    state: 'running',
  })),
}));

jest.mock('../initAudio', () => ({
  restorePlaybackAudioMode: jest.fn(() => Promise.resolve(true)),
}));

describe('loadSample', () => {
  beforeEach(() => {
    mockDecodeAudioData.mockReset();
  });

  it('shares one decode between callers', async () => {
    const buffer = { sampleRate: 48000 };
    mockDecodeAudioData.mockResolvedValue(buffer);

    const [a, b] = await Promise.all([loadSample(101), loadSample(101)]);

    expect(a).toBe(buffer);
    expect(b).toBe(buffer);
    expect(mockDecodeAudioData).toHaveBeenCalledTimes(1);
  });

  it('retries after a failed decode instead of caching the failure', async () => {
    const buffer = { sampleRate: 48000 };
    mockDecodeAudioData
      .mockRejectedValueOnce(new Error('decoder busy'))
      .mockResolvedValueOnce(buffer);

    await expect(loadSample(202)).rejects.toThrow('decoder busy');
    await expect(loadSample(202)).resolves.toBe(buffer);
    expect(mockDecodeAudioData).toHaveBeenCalledTimes(2);
  });
});
