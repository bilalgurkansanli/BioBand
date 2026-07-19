import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  getDrumMachineBank,
  isDrumMachineTypeId,
  type DrumMachineTypeId,
} from '../instruments/drumMachine/drumMachineBanks';
import {
  BPM_DEFAULT,
  BPM_MAX,
  BPM_MIN,
  createEmptyGrid,
  isValidGrid,
  normalizeGrid,
  type DrumMachineGrid,
} from '../instruments/drumMachine/drumMachineRows';
import { patternToSavedRecording } from '../instruments/drumMachine/patternToRecording';
import { awardRecordingPractice } from '../profile/awardPlayAlong';
import { deleteRecording, loadRecordings, saveRecording } from './recordingsStorage';

const STORAGE_KEY = '@bioband/drum-machine-patterns.v1';

export type DrumMachinePattern = {
  id: string;
  title: string;
  bpm: number;
  machineType: DrumMachineTypeId;
  grid: DrumMachineGrid;
  createdAt: number;
};

function clampBpm(bpm: number): number {
  return Math.min(BPM_MAX, Math.max(BPM_MIN, Math.round(bpm)));
}

function isPattern(value: unknown): value is DrumMachinePattern {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const entry = value as DrumMachinePattern;
  const type = entry.machineType ?? 'drums';
  if (!isDrumMachineTypeId(type)) {
    return false;
  }
  const expectedRows = getDrumMachineBank(type).rows.length;
  return (
    typeof entry.id === 'string' &&
    typeof entry.title === 'string' &&
    typeof entry.bpm === 'number' &&
    typeof entry.createdAt === 'number' &&
    isValidGrid(entry.grid, expectedRows)
  );
}

async function persist(patterns: DrumMachinePattern[]): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(patterns));
}

export async function loadDrumMachinePatterns(): Promise<DrumMachinePattern[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed
      .filter(isPattern)
      .map((pattern) => ({
        ...pattern,
        machineType: pattern.machineType ?? 'drums',
        bpm: clampBpm(pattern.bpm),
        // Legacy boolean grids from older versions become velocity grids.
        grid: normalizeGrid(pattern.grid),
      }))
      .sort((a, b) => b.createdAt - a.createdAt);
  } catch {
    return [];
  }
}

export async function saveDrumMachinePattern(input: {
  title: string;
  bpm: number;
  machineType: DrumMachineTypeId;
  grid: DrumMachineGrid;
  /** How many loops to bake into the mirrored take (settings default: 2). */
  loops?: number;
  /** Active drum kit — stamped onto the mirrored take for drums patterns. */
  drumKitId?: string;
}): Promise<DrumMachinePattern> {
  const pattern: DrumMachinePattern = {
    id: `dm-${Date.now()}`,
    title: input.title.trim() || 'Pattern',
    bpm: clampBpm(input.bpm),
    machineType: input.machineType,
    grid: normalizeGrid(input.grid),
    createdAt: Date.now(),
  };
  const all = await loadDrumMachinePatterns();
  all.unshift(pattern);
  await persist(all);

  // Mirror into Kayıtlarım so patterns show up with other takes.
  const take = patternToSavedRecording(pattern, input.loops, input.drumKitId);
  await saveRecording(take);
  void awardRecordingPractice(take.instrument, take.durationMs);

  return pattern;
}

export async function deleteDrumMachinePattern(id: string): Promise<void> {
  const all = await loadDrumMachinePatterns();
  await persist(all.filter((pattern) => pattern.id !== id));
}

/** Removes both the pattern store entry and the mirrored Kayıtlarım take. */
export async function deleteDrumMachineTake(id: string): Promise<void> {
  await deleteDrumMachinePattern(id);
  await deleteRecording(id);
}

/** One-time style sync: older patterns that only lived in DM storage. */
export async function syncDrumMachinePatternsToRecordings(): Promise<void> {
  const patterns = await loadDrumMachinePatterns();
  if (patterns.length === 0) {
    return;
  }
  const recordings = await loadRecordings();
  const existingIds = new Set(recordings.map((entry) => entry.id));
  for (const pattern of patterns) {
    if (!existingIds.has(pattern.id)) {
      await saveRecording(patternToSavedRecording(pattern));
      existingIds.add(pattern.id);
    }
  }
}

/**
 * Validates a parsed beat share-file payload and saves it as a new pattern.
 * Accepts both the wrapped `bioband-beat-v1` format and a bare pattern object.
 */
export async function importDrumMachinePattern(
  payload: unknown,
): Promise<DrumMachinePattern | null> {
  if (!payload || typeof payload !== 'object') {
    return null;
  }
  const wrapper = payload as { format?: unknown; pattern?: unknown };
  const candidate = (
    wrapper.format === 'bioband-beat-v1' ? wrapper.pattern : payload
  ) as Partial<DrumMachinePattern> | undefined;
  if (!candidate || typeof candidate !== 'object') {
    return null;
  }
  const type = isDrumMachineTypeId(candidate.machineType)
    ? candidate.machineType
    : 'drums';
  const expectedRows = getDrumMachineBank(type).rows.length;
  if (typeof candidate.bpm !== 'number' || !isValidGrid(candidate.grid, expectedRows)) {
    return null;
  }
  return saveDrumMachinePattern({
    title:
      typeof candidate.title === 'string' && candidate.title.trim()
        ? candidate.title.trim()
        : 'Beat',
    bpm: candidate.bpm,
    machineType: type,
    grid: normalizeGrid(candidate.grid),
  });
}

export function emptyPatternDraft(
  machineType: DrumMachineTypeId = 'drums',
  bpm: number = BPM_DEFAULT,
): { bpm: number; machineType: DrumMachineTypeId; grid: DrumMachineGrid } {
  return {
    bpm: clampBpm(bpm),
    machineType,
    grid: createEmptyGrid(getDrumMachineBank(machineType).rows.length),
  };
}
