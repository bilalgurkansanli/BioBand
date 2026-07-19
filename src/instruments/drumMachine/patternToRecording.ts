import type { InstrumentEvent, InstrumentId, SavedRecording } from '../../types/recording';
import {
  getDrumMachineBank,
  type DrumMachineTypeId,
} from './drumMachineBanks';
import {
  gridStepCount,
  velocityForLevel,
  type DrumMachineGrid,
} from './drumMachineRows';

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
  const stepCount = gridStepCount(grid);
  const stepMs = 60_000 / bpm / 4;
  const events: InstrumentEvent[] = [];

  for (let loop = 0; loop < loops; loop += 1) {
    const loopOffset = loop * stepCount * stepMs;
    grid.forEach((row, rowIndex) => {
      const playKey = bank.rows[rowIndex]?.playKey;
      if (!playKey) {
        return;
      }
      row.forEach((level, step) => {
        if (level > 0) {
          events.push({
            soundId: playKey,
            atMs: Math.round(loopOffset + step * stepMs),
            velocity: velocityForLevel(level),
          });
        }
      });
    });
  }

  events.sort((a, b) => a.atMs - b.atMs);
  return {
    events,
    durationMs: Math.round(loops * stepCount * stepMs),
  };
}

export function patternToSavedRecording(
  pattern: {
    id: string;
    title: string;
    bpm: number;
    machineType: DrumMachineTypeId;
    grid: DrumMachineGrid;
    createdAt: number;
  },
  loops: number = PLAYBACK_LOOPS,
  drumKitId?: string,
): SavedRecording {
  const { events, durationMs } = gridToInstrumentEvents(
    pattern.machineType,
    pattern.grid,
    pattern.bpm,
    loops,
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
    // The sequencer always triggers the pads 'drums' bank — pin it so
    // playback keeps the same timbre even if the player default changes.
    padBankId: pattern.machineType === 'pads' ? 'drums' : undefined,
    // Kit active at save time — playback restores the same drum timbre.
    drumKitId: pattern.machineType === 'drums' ? drumKitId : undefined,
  };
}
