import type { InstrumentEvent, InstrumentId, SavedRecording } from '../../types/recording';
import {
  getDrumMachineBank,
  type DrumMachineTypeId,
} from './drumMachineBanks';
import { STEP_COUNT, type DrumMachineGrid } from './drumMachineRows';

const MACHINE_TO_INSTRUMENT: Record<DrumMachineTypeId, InstrumentId> = {
  drums: 'drums',
  piano: 'piano',
  guitar: 'guitar',
  violin: 'violin',
  pads: 'pads',
};

/** How many 16-step loops to bake into a take for playback length. */
const PLAYBACK_LOOPS = 2;

export function machineTypeToInstrument(type: DrumMachineTypeId): InstrumentId {
  return MACHINE_TO_INSTRUMENT[type];
}

export function gridToInstrumentEvents(
  machineType: DrumMachineTypeId,
  grid: DrumMachineGrid,
  bpm: number,
  loops: number = PLAYBACK_LOOPS,
): { events: InstrumentEvent[]; durationMs: number } {
  const bank = getDrumMachineBank(machineType);
  const stepMs = 60_000 / bpm / 4;
  const events: InstrumentEvent[] = [];

  for (let loop = 0; loop < loops; loop += 1) {
    const loopOffset = loop * STEP_COUNT * stepMs;
    grid.forEach((row, rowIndex) => {
      const playKey = bank.rows[rowIndex]?.playKey;
      if (!playKey) {
        return;
      }
      row.forEach((on, step) => {
        if (on) {
          events.push({
            soundId: playKey,
            atMs: Math.round(loopOffset + step * stepMs),
          });
        }
      });
    });
  }

  events.sort((a, b) => a.atMs - b.atMs);
  return {
    events,
    durationMs: Math.round(loops * STEP_COUNT * stepMs),
  };
}

export function patternToSavedRecording(pattern: {
  id: string;
  title: string;
  bpm: number;
  machineType: DrumMachineTypeId;
  grid: DrumMachineGrid;
  createdAt: number;
}): SavedRecording {
  const { events, durationMs } = gridToInstrumentEvents(
    pattern.machineType,
    pattern.grid,
    pattern.bpm,
  );

  return {
    id: pattern.id,
    createdAt: pattern.createdAt,
    instrument: machineTypeToInstrument(pattern.machineType),
    mode: 'instrument',
    durationMs,
    events,
    title: pattern.title,
    source: 'drumMachine',
  };
}
