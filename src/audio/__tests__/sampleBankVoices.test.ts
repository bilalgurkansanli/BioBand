import {
  registerActiveVoice,
  stopVoicesByTagPrefix,
  stopVoicesOwnedBy,
  withVoiceOwner,
} from '../sampleBank';

// jest.mock calls are hoisted above the import. Only the clock is needed: the
// voices registered below are stubs that record how they were stopped.
const mockClock = { now: 10 };

jest.mock('../audioApi', () => ({
  AudioContext: jest.fn().mockImplementation(() => ({
    get currentTime() {
      return mockClock.now;
    },
    state: 'running',
  })),
}));

jest.mock('../initAudio', () => ({
  restorePlaybackAudioMode: jest.fn(() => Promise.resolve(true)),
}));

type StubVoice = { stop: jest.Mock; fadeAt: jest.Mock };

function addVoice(options: { tag: string; startsAt?: number; owner?: string }): StubVoice {
  const stop = jest.fn();
  const fadeAt = jest.fn();
  const stealGain = {
    gain: { setValueAtTime: fadeAt, linearRampToValueAtTime: jest.fn() },
  };
  const register = () =>
    registerActiveVoice(
      { stop },
      stealGain as unknown as Parameters<typeof registerActiveVoice>[1],
      mockClock.now + 30,
      options.tag,
      options.startsAt ?? mockClock.now,
    );
  if (options.owner) {
    withVoiceOwner(options.owner, register);
  } else {
    register();
  }
  return { stop, fadeAt };
}

let serial = 0;
const tag = (prefix: string) => `${prefix}:note#${serial++}`;

describe('owner-scoped voice stops', () => {
  beforeEach(() => {
    mockClock.now += 100;
  });

  it('stops only the voices of the owner asked for', () => {
    const studio = addVoice({ tag: tag('piano'), owner: 'studio' });
    const take = addVoice({ tag: tag('drums'), owner: 'recording' });
    const finger = addVoice({ tag: tag('guitar') });

    stopVoicesOwnedBy('studio');

    expect(studio.stop).toHaveBeenCalled();
    expect(take.stop).not.toHaveBeenCalled();
    expect(finger.stop).not.toHaveBeenCalled();

    stopVoicesOwnedBy('recording');
    stopVoicesByTagPrefix(['guitar:']);
  });

  it('never lets a pending note of a stopped owner sound', () => {
    const pending = addVoice({ tag: tag('piano'), owner: 'studio', startsAt: mockClock.now + 0.1 });
    stopVoicesOwnedBy('studio');
    // Ended at its own start: no fade is scheduled, it simply never plays.
    expect(pending.stop).toHaveBeenCalledWith(mockClock.now + 0.1);
    expect(pending.fadeAt).not.toHaveBeenCalled();
  });

  it('cuts a loop pass at its boundary but spares the next pass', () => {
    const boundary = mockClock.now + 0.12;
    const tail = addVoice({ tag: tag('piano'), owner: 'studio' });
    const nextPass = addVoice({ tag: tag('piano'), owner: 'studio', startsAt: boundary });

    stopVoicesOwnedBy('studio', { at: boundary });

    expect(tail.fadeAt).toHaveBeenCalledWith(1, boundary);
    expect(nextPass.stop).not.toHaveBeenCalled();

    stopVoicesOwnedBy('studio');
  });

  it('with pendingOnly, lets sounding notes ring', () => {
    const sounding = addVoice({ tag: tag('pads'), owner: 'looper' });
    const pending = addVoice({ tag: tag('pads'), owner: 'looper', startsAt: mockClock.now + 0.05 });

    stopVoicesOwnedBy('looper', { pendingOnly: true });

    expect(sounding.stop).not.toHaveBeenCalled();
    expect(pending.stop).toHaveBeenCalled();

    stopVoicesOwnedBy('looper');
  });

  it('releases an engine by its tag prefixes only', () => {
    const organ = addVoice({ tag: tag('organ') });
    const violin = addVoice({ tag: tag('violin') });

    stopVoicesByTagPrefix(['piano:', 'organ:']);

    expect(organ.stop).toHaveBeenCalled();
    expect(violin.stop).not.toHaveBeenCalled();

    stopVoicesByTagPrefix(['violin:']);
  });
});
