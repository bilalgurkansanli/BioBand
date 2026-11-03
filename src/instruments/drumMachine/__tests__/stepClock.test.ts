import { createCurrentStepStore } from '../currentStepStore';
import { advanceStepTimeline, stepIntervalMs } from '../stepClock';

// The clock itself needs the native audio context; only its pure timeline is
// exercised here.
jest.mock('../../../audio/sampleBank', () => ({
  getSharedAudioContext: jest.fn(),
}));

const params = (bpm = 120, swing = 0, stepCount = 16) => () => ({ bpm, swing, stepCount });

describe('advanceStepTimeline', () => {
  it('queues every step up to the horizon at exact 16th-note times', () => {
    const { steps, state } = advanceStepTimeline({ step: 0, time: 10 }, 10, 10.5, params());
    // 120 BPM: a 16th is 125 ms, so 10.000, 10.125, 10.250, 10.375.
    expect(steps.map((s) => s.step)).toEqual([0, 1, 2, 3]);
    expect(steps.map((s) => s.time)).toEqual([10, 10.125, 10.25, 10.375]);
    expect(state).toEqual({ step: 4, time: 10.5 });
  });

  it('continues seamlessly from where the last call stopped — no drift', () => {
    let state = { step: 0, time: 10 };
    const times: number[] = [];
    for (let horizon = 10.02; horizon < 14; horizon += 0.025) {
      const advanced = advanceStepTimeline(state, horizon - 0.12, horizon, params());
      times.push(...advanced.steps.map((s) => s.time));
      state = advanced.state;
    }
    times.forEach((time, i) => expect(time).toBeCloseTo(10 + i * 0.125, 9));
  });

  it('wraps at the step count and swings the off-beats', () => {
    const { steps } = advanceStepTimeline(
      { step: 2, time: 0 },
      0,
      0.5,
      params(120, 0.2, 4),
    );
    expect(steps.map((s) => s.step)).toEqual([2, 3, 0, 1]);
    // Even→odd gap stretched by 20 %, odd→even shrunk by 20 %.
    expect(steps[1].time - steps[0].time).toBeCloseTo(0.15, 9);
    expect(steps[2].time - steps[1].time).toBeCloseTo(0.1, 9);
  });

  it('resyncs after a stall instead of firing the missed steps at once', () => {
    // The JS thread stalled for two seconds: the clock was due at 10.0.
    const { steps } = advanceStepTimeline({ step: 5, time: 10 }, 12, 12.12, params());
    expect(steps.length).toBeLessThanOrEqual(1);
    expect(steps[0].step).toBe(5);
    expect(steps[0].time).toBeGreaterThan(12);
  });

  it('starts a count-in downbeat exactly when asked, not before', () => {
    const downbeat = 13.08;
    const early = advanceStepTimeline({ step: 0, time: downbeat }, 11, 11.12, params());
    expect(early.steps).toHaveLength(0);
    const due = advanceStepTimeline(early.state, 13, 13.12, params());
    expect(due.steps[0]).toEqual({ step: 0, time: downbeat });
  });

  it('matches the documented 16th-note interval', () => {
    expect(stepIntervalMs(120)).toBe(125);
  });
});

describe('createCurrentStepStore', () => {
  it('notifies subscribers only when the step changes', () => {
    const store = createCurrentStepStore();
    const listener = jest.fn();
    const unsubscribe = store.subscribe(listener);

    store.set(0);
    store.set(0);
    store.set(1);
    expect(listener).toHaveBeenCalledTimes(2);
    expect(store.get()).toBe(1);

    unsubscribe();
    store.set(2);
    expect(listener).toHaveBeenCalledTimes(2);
  });
});
