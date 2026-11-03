import { createSynthVoiceCounter } from '../synthVoiceCount';

/** Audio clock that advances together with Jest's fake timers. */
function setup() {
  jest.useFakeTimers();
  const start = Date.now();
  const now = () => (Date.now() - start) / 1000;
  const changes: number[] = [];
  const counter = createSynthVoiceCounter({ now, onChange: (n) => changes.push(n) });
  return { counter, changes, now };
}

afterEach(() => {
  jest.useRealTimers();
});

describe('createSynthVoiceCounter', () => {
  it('counts a voice until its natural end', () => {
    const { counter } = setup();
    counter.add(0.5);
    expect(counter.count()).toBe(1);

    jest.advanceTimersByTime(499);
    expect(counter.count()).toBe(1);
    jest.advanceTimersByTime(2);
    expect(counter.count()).toBe(0);
  });

  it('drops a held note as soon as it is released, not 24 s later', () => {
    const { counter, now } = setup();
    // Eight taps on a held synth voice, each released after a quarter second.
    for (let tap = 0; tap < 8; tap++) {
      const endEarly = counter.add(now() + 24.3);
      jest.advanceTimersByTime(100);
      endEarly(now() + 0.28);
      jest.advanceTimersByTime(400);
    }
    // One more note held down: it must be the only one counted.
    counter.add(now() + 24.3);
    expect(counter.count()).toBe(1);
  });

  it('counts each voice down exactly once', () => {
    const { counter, now } = setup();
    const endEarly = counter.add(now() + 1);
    counter.add(now() + 5);

    endEarly(now() + 0.1);
    endEarly(now() + 0.05);
    endEarly();
    expect(counter.count()).toBe(1);

    jest.advanceTimersByTime(2000);
    expect(counter.count()).toBe(1);
  });

  it('never lengthens a voice', () => {
    const { counter, now } = setup();
    const endEarly = counter.add(now() + 0.2);
    endEarly(now() + 10);
    jest.advanceTimersByTime(250);
    expect(counter.count()).toBe(0);
  });

  it('ignores voices from before a reset', () => {
    const { counter, now } = setup();
    const stale = counter.add(now() + 3);
    counter.reset();
    counter.add(now() + 3);

    stale();
    jest.advanceTimersByTime(1000);
    expect(counter.count()).toBe(1);
  });
});
