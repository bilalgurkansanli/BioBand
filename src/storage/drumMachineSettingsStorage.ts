import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  isDrumMachineTypeId,
  type DrumMachineTypeId,
} from '../instruments/drumMachine/drumMachineBanks';

const STORAGE_KEY = '@bioband/drum-machine-settings.v1';

export type DrumMachineSettings = {
  machineType: DrumMachineTypeId;
};

const DEFAULT_SETTINGS: DrumMachineSettings = {
  machineType: 'drums',
};

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
    const type = (parsed as DrumMachineSettings).machineType;
    if (!isDrumMachineTypeId(type)) {
      return { ...DEFAULT_SETTINGS };
    }
    return { machineType: type };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export async function saveDrumMachineSettings(
  settings: DrumMachineSettings,
): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}
