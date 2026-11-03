import { getSharedAudioContext } from '../../audio/sampleBank';
import {
  SCHEDULER_LOOKAHEAD_MS,
  SCHEDULER_TICK_MS,
  STALE_EVENT_MS,
} from '../../audio/schedulerTiming';

// The drum machine's sequencer clock — the same "notes ride the audio clock"
// lookahead as songScheduler.ts. It used to step on chained setTimeouts against
// Date.now() and play each step's sounds from the timer callback, so every
// 16th note landed whenever the JS thread got to it (and the count-in, already
// on the audio clock, was ~80 ms off the first downbeat). Now a coarse timer
// only decides *when to queue*: each step is handed over a lookahead early with
// the exact audio-clock time it must sound at.

export type StepClockHandle = {
  stop: () => void;
  /**
   * The latest step that has sounded at audio-clock time `contextTime`, and
   * when — or null before the first one. Live recording quantizes against it.
   */
  stepAt: (contextTime: number) => { step: number; time: number } | null;
};

/** 16th-note interval in ms for a given BPM. */
export function stepIntervalMs(bpm: number): number {
  return 60_000 / Math.max(1, bpm) / 4;
}

/** Where the clock stands: the next step to queue, and when it sounds. */
export type StepTimelineState = { step: number; time: number };

export type StepTimelineParams = {
  bpm: number;
  /** 0..~0.3 — stretches even→odd gaps, shrinks odd→even gaps. */
  swing: number;
  stepCount: number;
};

/**
 * Queue every step that sounds before `horizon` (seconds, audio clock).
 * Pure: returns the steps with their times and the state to continue from.
 *
 * BPM, swing and step count are read for each step, so all three change live.
 * A clock that fell behind `now` (a stalled JS thread, the app returning from
 * the background) resyncs instead of firing the missed steps in one burst: it
 * carries on from the step that was due, a short lead after `now`.
 */
export function advanceStepTimeline(
  state: StepTimelineState,
  now: number,
  horizon: number,
  getParams: () => StepTimelineParams,
  resyncLeadSeconds = 0.03,
): { steps: StepTimelineState[]; state: StepTimelineState } {
  let { step, time } = state;
  if (time < now - STALE_EVENT_MS / 1000) {
    time = now + resyncLeadSeconds;
  }
  const steps: StepTimelineState[] = [];
  while (time < horizon) {
    const { bpm, swing, stepCount } = getParams();
    const count = Math.max(1, stepCount);
    if (step >= count) {
      step = 0;
    }
    steps.push({ step, time });
    const base = stepIntervalMs(bpm) / 1000;
    // Gap that follows an even step is lengthened, after an odd step shortened.
    const interval = step % 2 === 0 ? base * (1 + swing) : base * (1 - swing);
    step = (step + 1) % count;
    time += Math.max(0.001, interval);
  }
  return { steps, state: { step, time } };
}

/** Lead before the very first step when starting "now", so it is never late. */
const START_LEAD_SECONDS = 0.03;

/**
 * Looping step clock on the audio clock. `onStep(step, atContextTime)` is
 * called a lookahead before each step sounds — schedule its sounds at that
 * time. `onStepSounding` follows when the step actually sounds (on the next
 * timer tick), for the playhead.
 *
 * @param startAtContextTime when step 0 sounds (default: right away) — a
 * count-in passes its own downbeat.
 */
export function startStepClock(
  getBpm: () => number,
  getSwing: () => number,
  getStepCount: () => number,
  onStep: (stepIndex: number, atContextTime: number) => void,
  options: {
    startAtContextTime?: number;
    onStepSounding?: (stepIndex: number, atContextTime: number) => void;
  } = {},
): StepClockHandle {
  const context = getSharedAudioContext();
  let state: StepTimelineState = {
    step: 0,
    time: options.startAtContextTime ?? context.currentTime + START_LEAD_SECONDS,
  };
  /** Queued steps the playhead has not reached yet, in time order. */
  let pending: StepTimelineState[] = [];
  let lastSounded: StepTimelineState | null = null;
  let timer: ReturnType<typeof setInterval> | null = null;
  const getParams = (): StepTimelineParams => ({
    bpm: getBpm(),
    swing: getSwing(),
    stepCount: getStepCount(),
  });

  const tick = (): void => {
    const now = context.currentTime;
    const advanced = advanceStepTimeline(
      state,
      now,
      now + SCHEDULER_LOOKAHEAD_MS / 1000,
      getParams,
    );
    state = advanced.state;
    for (const queued of advanced.steps) {
      onStep(queued.step, queued.time);
      pending.push(queued);
    }

    let reached: StepTimelineState | null = null;
    while (pending.length > 0 && pending[0].time <= now) {
      reached = pending[0];
      pending = pending.slice(1);
    }
    if (reached) {
      lastSounded = reached;
      // One playhead update per tick, however many steps went by.
      options.onStepSounding?.(reached.step, reached.time);
    }
  };

  timer = setInterval(tick, SCHEDULER_TICK_MS);
  tick();

  return {
    stop: () => {
      if (timer) {
        clearInterval(timer);
        timer = null;
      }
    },
    stepAt: (contextTime: number) => {
      let found = lastSounded;
      for (const queued of pending) {
        if (queued.time > contextTime) {
          break;
        }
        found = queued;
      }
      return found ? { step: found.step, time: found.time } : null;
    },
  };
}
