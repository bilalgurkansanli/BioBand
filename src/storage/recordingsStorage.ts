import AsyncStorage from '@react-native-async-storage/async-storage';

import type { SavedRecording } from '../types/recording';

const STORAGE_KEY = '@bioband/recordings';

export async function saveRecording(recording: SavedRecording): Promise<void> {
  const existing = await loadRecordings();
  existing.unshift(recording);
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(existing));
}

export async function loadRecordings(): Promise<SavedRecording[]> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return [];
  }

  try {
    return JSON.parse(raw) as SavedRecording[];
  } catch {
    return [];
  }
}
