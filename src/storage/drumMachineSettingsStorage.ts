import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  isDrumMachineTypeId,
  type DrumMachineTypeId,
} from '../instruments/drumMachine/drumMachineBanks';
import {
  BPM_DEFAULT,
  BPM_MAX,
  BPM_MIN,
  isStepCount,
  STEP_COUNT_DEFAULT,
  type StepCount,
} from '../instruments/drumMachine/drumMachineRows';
import { isDrumKitId, type DrumKitId } from '../instruments/drums/drumsKits';

const STORAGE_KEY = '@bioband/drum-machine-settings.v1';

export const SAVE_LOOP_OPTIONS = [1, 2, 4] as const;
export type SaveLoopCount = (typeof SAVE_LOOP_OPTIONS)[number];

/** Swing presets: off / light / medium / heavy. */
export const SWING_OPTIONS = [0, 0.12, 0.2, 0.28] as const;
export type SwingAmount = (typeof SWING_OPTIONS)[number];

export type DrumMachineSettings = {
  machineType: DrumMachineTypeId;
  /** Play the sound when a step is toggled on in the grid. */
  previewOnToggle: boolean;
  /** How many loops get baked into a saved take. */
  saveLoops: SaveLoopCount;
  /** Shuffle amount applied to offbeat 16ths (0 = straight). */
  swing: SwingAmount;
  /** Steps per loop — 9/18 are the Turkish aksak 9/8 meters. */
  stepCount: StepCount;
  /** Click on every beat while the sequencer runs. */
  metronomeOn: boolean;
  /** Four click beats before playback starts. */
  countInOn: boolean;
  /** Vibrate briefly when toggling grid cells. */
  hapticsOn: boolean;
  /** Kit used by the drums bank (and stamped onto saved drum takes). */
  drumKitId: DrumKitId;
  /** Last used tempo — restored on next open. */
  bpm: number;
};

export const DRUM_MACHINE_DEFAULT_SETTINGS: DrumMachineSettings = {
  machineType: 'drums',
  previewOnToggle: true,
  saveLoops: 2,
  swing: 0,
  stepCount: STEP_COUNT_DEFAULT,
  metronomeOn: false,
  countInOn: false,
  hapticsOn: true,
  drumKitId: 'acoustic',
  bpm: BPM_DEFAULT,
};

const DEFAULT_SETTINGS = DRUM_MACHINE_DEFAULT_SETTINGS;

function isSaveLoopCount(value: unknown): value is SaveLoopCount {
  return (SAVE_LOOP_OPTIONS as readonly number[]).includes(value as number);
}

function isSwingAmount(value: unknown): value is SwingAmount {
  return (SWING_OPTIONS as readonly number[]).includes(value as number);
}

export async function loadDrumMachineSettings(): Promise<DrumMachineSettings> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return { ...DEFAULT_SETTINGS };
    }
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object') {
      return { ...DEFAULT_SETTINGS };
    }
    const entry = parsed as Partial<DrumMachineSettings>;
    return {
      machineType: isDrumMachineTypeId(entry.machineType)
        ? entry.machineType
        : DEFAULT_SETTINGS.machineType,
      previewOnToggle:
        typeof entry.previewOnToggle === 'boolean'
          ? entry.previewOnToggle
          : DEFAULT_SETTINGS.previewOnToggle,
      saveLoops: isSaveLoopCount(entry.saveLoops)
        ? entry.saveLoops
        : DEFAULT_SETTINGS.saveLoops,
      swing: isSwingAmount(entry.swing) ? entry.swing : DEFAULT_SETTINGS.swing,
      stepCount: isStepCount(entry.stepCount)
        ? entry.stepCount
        : DEFAULT_SETTINGS.stepCount,
      metronomeOn:
        typeof entry.metronomeOn === 'boolean'
          ? entry.metronomeOn
          : DEFAULT_SETTINGS.metronomeOn,
      countInOn:
        typeof entry.countInOn === 'boolean'
          ? entry.countInOn
          : DEFAULT_SETTINGS.countInOn,
      hapticsOn:
        typeof entry.hapticsOn === 'boolean'
          ? entry.hapticsOn
          : DEFAULT_SETTINGS.hapticsOn,
      drumKitId: isDrumKitId(entry.drumKitId)
        ? entry.drumKitId
        : DEFAULT_SETTINGS.drumKitId,
      bpm:
        typeof entry.bpm === 'number'
          ? Math.min(BPM_MAX, Math.max(BPM_MIN, Math.round(entry.bpm)))
          : DEFAULT_SETTINGS.bpm,
    };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export async function saveDrumMachineSettings(
  settings: DrumMachineSettings,
): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}
