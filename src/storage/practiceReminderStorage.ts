import AsyncStorage from '@react-native-async-storage/async-storage';

import { notifyAppDataChanged } from './appDataChangeSignal';

const STORAGE_KEY = '@bioband/practice-reminder.v1';

export type PracticeReminderSettings = {
  enabled: boolean;
  hour: number;
  minute: number;
};

export const DEFAULT_PRACTICE_REMINDER_SETTINGS: PracticeReminderSettings = {
  enabled: false,
  hour: 19,
  minute: 0,
};

function isPracticeReminderSettings(value: unknown): value is PracticeReminderSettings {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const entry = value as PracticeReminderSettings;
  return (
    typeof entry.enabled === 'boolean' &&
    typeof entry.hour === 'number' &&
    typeof entry.minute === 'number'
  );
}

export async function loadPracticeReminderSettings(): Promise<PracticeReminderSettings> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return { ...DEFAULT_PRACTICE_REMINDER_SETTINGS };
    }
    const parsed = JSON.parse(raw) as unknown;
    if (!isPracticeReminderSettings(parsed)) {
      return { ...DEFAULT_PRACTICE_REMINDER_SETTINGS };
    }
    return parsed;
  } catch {
    return { ...DEFAULT_PRACTICE_REMINDER_SETTINGS };
  }
}

export async function savePracticeReminderSettings(
  settings: PracticeReminderSettings,
): Promise<PracticeReminderSettings> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  notifyAppDataChanged();
  return settings;
}
