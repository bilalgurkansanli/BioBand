import AsyncStorage from '@react-native-async-storage/async-storage';

import { notifyAppDataChanged } from './appDataChangeSignal';
import { readJson } from './jsonStorage';

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

function wholeNumberIn(value: unknown, min: number, max: number, fallback: number): number {
  return typeof value === 'number' && Number.isInteger(value) && value >= min && value <= max
    ? value
    : fallback;
}

/**
 * Turns anything — stored JSON, a cloud blob — into valid reminder settings,
 * or null when it is not reminder settings at all (no `enabled` flag). An
 * out-of-range time falls back to the default rather than reaching the OS
 * scheduler, which rejects it.
 */
export function coercePracticeReminderSettings(value: unknown): PracticeReminderSettings | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }
  const entry = value as Record<string, unknown>;
  if (typeof entry.enabled !== 'boolean') {
    return null;
  }
  return {
    enabled: entry.enabled,
    hour: wholeNumberIn(entry.hour, 0, 23, DEFAULT_PRACTICE_REMINDER_SETTINGS.hour),
    minute: wholeNumberIn(entry.minute, 0, 59, DEFAULT_PRACTICE_REMINDER_SETTINGS.minute),
  };
}

/** Rejects when storage cannot be read — for callers that send the result on. */
export function readStoredPracticeReminderSettings(): Promise<PracticeReminderSettings> {
  return readJson(STORAGE_KEY, coercePracticeReminderSettings, () => ({
    ...DEFAULT_PRACTICE_REMINDER_SETTINGS,
  }));
}

export async function loadPracticeReminderSettings(): Promise<PracticeReminderSettings> {
  try {
    return await readStoredPracticeReminderSettings();
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

/**
 * Replaces local reminder settings with the cloud copy. No change signal: this
 * is the sync writing, not the user editing.
 */
export async function restorePracticeReminderSettings(
  settings: PracticeReminderSettings,
): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}
