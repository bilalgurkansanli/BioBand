import {
  isStaleEvent,
  passEndContextTime,
  passTailMs,
  SCHEDULER_LOOKAHEAD_MS,
  STALE_EVENT_MS,
} from '../schedulerTiming';

describe('isStaleEvent', () => {
  it('plays anything still ahead of, at, or barely behind the clock', () => {
    expect(isStaleEvent(1000, 900)).toBe(false);
    expect(isStaleEvent(1000, 1000)).toBe(false);
    expect(isStaleEvent(1000, 1000 + STALE_EVENT_MS)).toBe(false);
  });

  it('drops what a stalled JS thread missed instead of bursting it', () => {
    // Back from the background two seconds later: everything in between is
    // history, not a pile of notes to fire at once.
    expect(isStaleEvent(1000, 3000)).toBe(true);
    expect(isStaleEvent(1000, 1000 + STALE_EVENT_MS + 1)).toBe(true);
  });

  it('measures lateness in real time, not material time', () => {
    // At double speed 80 material ms is only 40 real ms late.
    expect(isStaleEvent(1000, 1080, 2)).toBe(false);
    expect(isStaleEvent(1000, 1080, 1)).toBe(true);
  });
});

describe('passTailMs', () => {
  it('lets a one-shot pass ring briefly past its end', () => {
    expect(passTailMs(4000, 3500, false)).toBe(550);
  });

  it('hands a looping pass over one lookahead before its end', () => {
    // onDone fires at lastAtMs + tail = end - lookahead.
    const tail = passTailMs(4000, 3500, true);
    expect(3500 + tail).toBe(4000 - SCHEDULER_LOOKAHEAD_MS);
  });

  it('copes with a last note sitting right at the end', () => {
    expect(passTailMs(4000, 4000, true)).toBe(-SCHEDULER_LOOKAHEAD_MS);
  });
});

describe('passEndContextTime', () => {
  it('anchors every pass exactly where the previous one ends — no drift', () => {
    const start = 12.5;
    let anchor = start;
    for (let lap = 0; lap < 100; lap++) {
      anchor = passEndContextTime(anchor, 2000, 1);
    }
    expect(anchor).toBeCloseTo(start + 200, 9);
  });

  it('shortens real time at faster tempos', () => {
    expect(passEndContextTime(10, 2000, 2)).toBeCloseTo(11, 9);
    expect(passEndContextTime(10, 2000, 0.5)).toBeCloseTo(14, 9);
  });
});
