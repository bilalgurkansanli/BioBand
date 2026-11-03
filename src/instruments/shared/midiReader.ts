import { parseMidi, type MidiHeader } from 'midi-file';

// One MIDI reader for all five importers. Each converter used to carry its own
// copy of the track walk and the tempo map; the copies drifted (only two of them
// skipped the drum channel), none survived a zero or SMPTE time division, and
// every note re-walked the whole tempo map to find its time.

/** General MIDI's percussion channel — "channel 10", 0-based. */
export const GM_DRUM_CHANNEL = 9;

/**
 * Notes kept per part (one channel of one track) and per file. A song keeps at
 * most a few hundred events, and a part's notes arrive in time order, so the
 * opening of each part is all that can ever reach the chart. Without a cap a
 * dense multi-track file costs hundreds of thousands of objects on the JS
 * thread before anything is thrown away.
 */
export const MAX_NOTES_PER_PART = 4096;
export const MAX_NOTES_PER_FILE = 32_768;

/** The MIDI default when a file never sets a tempo: 120 BPM. */
const DEFAULT_MICROSECONDS_PER_BEAT = 500_000;

export type MidiNote = {
  tick: number;
  /** Tick the note was released — null when the file never closes it. */
  endTick: number | null;
  noteNumber: number;
  /** 0..1, from the MIDI strike velocity. */
  velocity: number;
  /** 0-based; 9 is the General MIDI drum channel. */
  channel: number;
  trackIndex: number;
};

export type MidiTiming = {
  /** File tick → ms from the start of the file, rounded. Always finite. */
  toMs: (tick: number) => number;
  /** Quarter note (ms) at the start of the file; null for SMPTE-timed files. */
  openingQuarterMs: number | null;
  /**
   * True when the tempo never changes after tick 0 — only then does a beat
   * grid mean anything for de-jittering or a meter.
   */
  steadyTempo: boolean;
};

export type MidiFileContent = {
  /** Every collected note-on, in file order (track by track). */
  notes: MidiNote[];
  timing: MidiTiming;
  /** First non-empty track name in the file, untrimmed of length. */
  trackName?: string;
  /** The first time signature the file declares. */
  timeSignature?: { numerator: number; denominator: number };
  /** True when anything plays on the General MIDI drum channel. */
  hasDrumChannel: boolean;
};

type TempoPoint = { tick: number; microsecondsPerBeat: number };

type TempoSegment = TempoPoint & { startMs: number };

/**
 * Tempo-mapped timing in O(log n) per lookup: cumulative ms is computed once
 * per tempo change, and each tick binary-searches the segment it falls in.
 */
function metricalTiming(ticksPerBeat: number, points: TempoPoint[]): MidiTiming {
  // Stable sort keeps file order within a tick, so the last change written at
  // a given tick is the one that holds — as the previous linear walk did.
  const sorted = [
    { tick: 0, microsecondsPerBeat: DEFAULT_MICROSECONDS_PER_BEAT },
    ...points,
  ].sort((a, b) => a.tick - b.tick);

  const segments: TempoSegment[] = [];
  for (const point of sorted) {
    const last = segments[segments.length - 1];
    if (last && last.tick === point.tick) {
      last.microsecondsPerBeat = point.microsecondsPerBeat;
      continue;
    }
    const startMs = last
      ? last.startMs +
        ((point.tick - last.tick) / ticksPerBeat) * (last.microsecondsPerBeat / 1000)
      : 0;
    segments.push({ ...point, startMs });
  }

  const toMs = (tick: number): number => {
    let lo = 0;
    let hi = segments.length - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (segments[mid].tick <= tick) {
        lo = mid;
      } else {
        hi = mid - 1;
      }
    }
    const segment = segments[lo];
    const ms =
      segment.startMs +
      ((Math.max(segment.tick, tick) - segment.tick) / ticksPerBeat) *
        (segment.microsecondsPerBeat / 1000);
    return Math.round(ms);
  };

  const opening = segments[0].microsecondsPerBeat;
  return {
    toMs,
    openingQuarterMs: opening / 1000,
    steadyTempo: segments.every((segment) => segment.microsecondsPerBeat === opening),
  };
}

/**
 * Pick the clock the file's header asks for. A zero or missing division used
 * to fall through to `?? 480` (or divide by zero) and produce Infinity/NaN
 * onsets; SMPTE files were silently timed as if metrical.
 */
function timingFor(header: MidiHeader, tempoPoints: TempoPoint[]): MidiTiming {
  const ticksPerBeat = header.ticksPerBeat;
  if (typeof ticksPerBeat === 'number' && Number.isFinite(ticksPerBeat) && ticksPerBeat > 0) {
    return metricalTiming(ticksPerBeat, tempoPoints);
  }

  const fps = header.framesPerSecond;
  const ticksPerFrame = header.ticksPerFrame;
  if (
    typeof fps === 'number' &&
    typeof ticksPerFrame === 'number' &&
    Number.isFinite(fps) &&
    Number.isFinite(ticksPerFrame) &&
    fps > 0 &&
    ticksPerFrame > 0
  ) {
    // SMPTE time is absolute: ticks are fractions of a frame and tempo
    // events do not apply.
    const msPerTick = 1000 / (fps * ticksPerFrame);
    return {
      toMs: (tick) => Math.round(Math.max(0, tick) * msPerTick),
      openingQuarterMs: null,
      steadyTempo: false,
    };
  }

  throw new Error('MIDI file has no usable time division');
}

/**
 * Parse a Standard MIDI File into channel-tagged notes plus a timing function.
 * Throws on anything that is not a readable MIDI file; callers turn that into
 * their own `midiParseFailed`.
 */
export function readMidiFile(bytes: ArrayLike<number>): MidiFileContent {
  const midi = parseMidi(bytes);

  const tempoPoints: TempoPoint[] = [];
  const notes: MidiNote[] = [];
  let trackName: string | undefined;
  let timeSignature: MidiFileContent['timeSignature'];
  let hasDrumChannel = false;

  midi.tracks.forEach((track, trackIndex) => {
    let absTick = 0;
    /** Notes sounding now, keyed by channel and pitch so channels never close each other's notes. */
    const open = new Map<number, MidiNote>();
    const perChannel = new Map<number, number>();

    const close = (key: number, tick: number): void => {
      const note = open.get(key);
      if (note) {
        note.endTick = tick;
        open.delete(key);
      }
    };

    for (const event of track) {
      absTick += Number.isFinite(event.deltaTime) && event.deltaTime > 0 ? event.deltaTime : 0;

      switch (event.type) {
        case 'setTempo':
          if (Number.isFinite(event.microsecondsPerBeat) && event.microsecondsPerBeat > 0) {
            tempoPoints.push({ tick: absTick, microsecondsPerBeat: event.microsecondsPerBeat });
          }
          break;
        case 'trackName':
          if (!trackName && event.text.trim()) {
            trackName = event.text.trim();
          }
          break;
        case 'timeSignature':
          // The bar line the file itself declares — better than assuming 4/4.
          if (!timeSignature && event.numerator > 0 && event.denominator > 0) {
            timeSignature = { numerator: event.numerator, denominator: event.denominator };
          }
          break;
        case 'noteOn':
        case 'noteOff': {
          const key = event.channel * 128 + event.noteNumber;
          if (event.type === 'noteOff' || event.velocity === 0) {
            close(key, absTick);
            break;
          }
          if (event.channel === GM_DRUM_CHANNEL) {
            hasDrumChannel = true;
          }
          // A retrigger without an intervening note-off ends the previous one.
          close(key, absTick);
          const kept = perChannel.get(event.channel) ?? 0;
          if (kept >= MAX_NOTES_PER_PART || notes.length >= MAX_NOTES_PER_FILE) {
            break;
          }
          perChannel.set(event.channel, kept + 1);
          const note: MidiNote = {
            tick: absTick,
            endTick: null,
            noteNumber: event.noteNumber,
            velocity: Math.min(1, Math.max(0.05, event.velocity / 127)),
            channel: event.channel,
            trackIndex,
          };
          open.set(key, note);
          notes.push(note);
          break;
        }
        default:
          break;
      }
    }
  });

  return {
    notes,
    timing: timingFor(midi.header, tempoPoints),
    trackName,
    timeSignature,
    hasDrumChannel,
  };
}

/** Onset and written length of a note in ms; length only when the file closes it. */
export function noteTimes(
  note: MidiNote,
  timing: MidiTiming,
): { atMs: number; durationMs?: number } {
  const atMs = timing.toMs(note.tick);
  if (note.endTick === null) {
    return { atMs };
  }
  return { atMs, durationMs: Math.max(1, timing.toMs(note.endTick) - atMs) };
}
