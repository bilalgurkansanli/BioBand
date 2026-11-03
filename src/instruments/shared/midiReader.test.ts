import {
  GM_DRUM_CHANNEL,
  MAX_NOTES_PER_PART,
  noteTimes,
  readMidiFile,
} from './midiReader';
import { buildMidi, noteRun, withTimeDivision } from './midiTestFile';

describe('readMidiFile timing', () => {
  it('follows a tempo map across changes', () => {
    const file = readMidiFile(
      buildMidi([
        [
          { tick: 0, type: 'tempo', microsecondsPerBeat: 500_000 },
          { tick: 960, type: 'tempo', microsecondsPerBeat: 250_000 },
          ...noteRun(0, [60], 4),
        ],
      ]),
    );
    const { toMs } = file.timing;
    expect(toMs(0)).toBe(0);
    expect(toMs(480)).toBe(500);
    expect(toMs(960)).toBe(1000);
    // Twice as fast after tick 960.
    expect(toMs(1440)).toBe(1250);
    expect(file.timing.openingQuarterMs).toBe(500);
    expect(file.timing.steadyTempo).toBe(false);
  });

  it('lets a tempo written at tick 0 replace the 120 BPM default', () => {
    const file = readMidiFile(
      buildMidi([[{ tick: 0, type: 'tempo', microsecondsPerBeat: 600_000 }, ...noteRun(0, [60], 2)]]),
    );
    expect(file.timing.toMs(480)).toBe(600);
    expect(file.timing.openingQuarterMs).toBe(600);
    expect(file.timing.steadyTempo).toBe(true);
  });

  it('stays monotonic and finite over a long tempo map', () => {
    const tempos = Array.from({ length: 2000 }, (_, i) => ({
      tick: i * 120,
      type: 'tempo' as const,
      microsecondsPerBeat: 300_000 + (i % 7) * 50_000,
    }));
    const file = readMidiFile(buildMidi([[...tempos, ...noteRun(0, [60, 62], 400)]]));
    let previous = -1;
    for (const note of file.notes) {
      const ms = file.timing.toMs(note.tick);
      expect(Number.isFinite(ms)).toBe(true);
      expect(ms).toBeGreaterThan(previous);
      previous = ms;
    }
  });

  it('times SMPTE files in absolute frames, ignoring tempo', () => {
    // 25 fps × 40 ticks per frame = 1000 ticks per second.
    const file = readMidiFile(
      buildMidi(
        [[{ tick: 0, type: 'tempo', microsecondsPerBeat: 250_000 }, ...noteRun(0, [60], 3, { stepTicks: 1000 })]],
        { framesPerSecond: 25, ticksPerFrame: 40 },
      ),
    );
    expect(file.timing.toMs(1000)).toBe(1000);
    expect(file.timing.toMs(2500)).toBe(2500);
    expect(file.timing.openingQuarterMs).toBeNull();
    expect(file.timing.steadyTempo).toBe(false);
  });

  it('rejects a zero time division instead of producing Infinity', () => {
    const bytes = withTimeDivision(buildMidi([noteRun(0, [60], 2)]), 0);
    expect(() => readMidiFile(bytes)).toThrow();
  });

  it('rejects bytes that are not MIDI', () => {
    expect(() => readMidiFile(Uint8Array.from([1, 2, 3, 4]))).toThrow();
  });
});

describe('readMidiFile notes', () => {
  it('tags channels, and a note-off on one channel never closes another', () => {
    const file = readMidiFile(
      buildMidi([
        [
          { tick: 0, type: 'note', channel: 0, noteNumber: 60, length: 480 },
          { tick: 0, type: 'note', channel: GM_DRUM_CHANNEL, noteNumber: 60, length: 100 },
        ],
      ]),
    );
    const melodic = file.notes.find((note) => note.channel === 0)!;
    const drum = file.notes.find((note) => note.channel === GM_DRUM_CHANNEL)!;
    expect(melodic.endTick).toBe(480);
    expect(drum.endTick).toBe(100);
    expect(file.hasDrumChannel).toBe(true);
    expect(noteTimes(melodic, file.timing)).toEqual({ atMs: 0, durationMs: 500 });
  });

  it('reports no drum channel when nothing plays on it', () => {
    expect(readMidiFile(buildMidi([noteRun(3, [60], 2)])).hasDrumChannel).toBe(false);
  });

  it('caps how many notes one part can contribute', () => {
    const file = readMidiFile(
      buildMidi([noteRun(0, [60, 64, 67], MAX_NOTES_PER_PART + 500, { stepTicks: 10 })]),
    );
    expect(file.notes).toHaveLength(MAX_NOTES_PER_PART);
    // The cap keeps the opening — the only part a capped song can reach.
    expect(file.notes[0].tick).toBe(0);
  });

  it('reads the first track name and time signature', () => {
    const file = readMidiFile(
      buildMidi([
        [
          { tick: 0, type: 'name', text: '  Song  ' },
          { tick: 0, type: 'timeSignature', numerator: 6, denominator: 8 },
        ],
        [{ tick: 0, type: 'name', text: 'Second' }, ...noteRun(0, [60], 1)],
      ]),
    );
    expect(file.trackName).toBe('Song');
    expect(file.timeSignature).toEqual({ numerator: 6, denominator: 8 });
  });
});
