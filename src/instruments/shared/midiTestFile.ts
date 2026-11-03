import { writeMidi, type MidiEvent, type MidiHeader } from 'midi-file';

// Builds small Standard MIDI Files for the importer tests. Events are written
// at absolute ticks and converted to the deltas the format stores.

export type TestEvent =
  | { tick: number; type: 'note'; channel: number; noteNumber: number; length: number; velocity?: number }
  | { tick: number; type: 'tempo'; microsecondsPerBeat: number }
  | { tick: number; type: 'name'; text: string }
  | { tick: number; type: 'timeSignature'; numerator: number; denominator: number };

function toMidiEvents(events: TestEvent[]): MidiEvent[] {
  const flat: { tick: number; order: number; event: Record<string, unknown> }[] = [];
  events.forEach((entry, order) => {
    switch (entry.type) {
      case 'note':
        flat.push({
          tick: entry.tick,
          order,
          event: {
            type: 'noteOn',
            channel: entry.channel,
            noteNumber: entry.noteNumber,
            velocity: entry.velocity ?? 100,
          },
        });
        flat.push({
          tick: entry.tick + entry.length,
          // Releases sort before onsets at the same tick, so a repeated pitch
          // closes before it is struck again.
          order: -1,
          event: { type: 'noteOff', channel: entry.channel, noteNumber: entry.noteNumber, velocity: 0 },
        });
        break;
      case 'tempo':
        flat.push({
          tick: entry.tick,
          order,
          event: { type: 'setTempo', meta: true, microsecondsPerBeat: entry.microsecondsPerBeat },
        });
        break;
      case 'name':
        flat.push({ tick: entry.tick, order, event: { type: 'trackName', meta: true, text: entry.text } });
        break;
      case 'timeSignature':
        flat.push({
          tick: entry.tick,
          order,
          event: {
            type: 'timeSignature',
            meta: true,
            numerator: entry.numerator,
            denominator: entry.denominator,
            metronome: 24,
            thirtyseconds: 8,
          },
        });
        break;
    }
  });
  flat.sort((a, b) => a.tick - b.tick || a.order - b.order);

  let previous = 0;
  const out = flat.map(({ tick, event }) => {
    const deltaTime = tick - previous;
    previous = tick;
    return { ...event, deltaTime } as unknown as MidiEvent;
  });
  out.push({ deltaTime: 0, type: 'endOfTrack', meta: true });
  return out;
}

export function buildMidi(
  tracks: TestEvent[][],
  header: Partial<MidiHeader> = { ticksPerBeat: 480 },
): Uint8Array {
  const bytes = writeMidi({
    header: { format: 1, numTracks: tracks.length, ...header },
    tracks: tracks.map(toMidiEvents),
  });
  return Uint8Array.from(bytes);
}

/** Overwrite the header's time division — writeMidi will not emit a zero. */
export function withTimeDivision(bytes: Uint8Array, division: number): Uint8Array {
  const copy = Uint8Array.from(bytes);
  copy[12] = (division >> 8) & 0xff;
  copy[13] = division & 0xff;
  return copy;
}

/** `count` notes on one channel, one per beat, cycling through `pitches`. */
export function noteRun(
  channel: number,
  pitches: number[],
  count: number,
  options?: { startTick?: number; stepTicks?: number },
): TestEvent[] {
  const step = options?.stepTicks ?? 480;
  const start = options?.startTick ?? 0;
  return Array.from({ length: count }, (_, i) => ({
    tick: start + i * step,
    type: 'note' as const,
    channel,
    noteNumber: pitches[i % pitches.length],
    length: Math.max(1, step - 10),
  }));
}
