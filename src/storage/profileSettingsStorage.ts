import AsyncStorage from '@react-native-async-storage/async-storage';

import { notifyAppDataChanged } from './appDataChangeSignal';
import type { InstrumentId } from '../types/recording';

const STORAGE_KEY = '@bioband/profile-settings.v1';

export type ProfileSettings = {
  displayName: string;
  favoriteInstrument: InstrumentId | null;
  /** Google account photo URL — wins over the initial-letter avatar when present. */
  avatarPhotoUrl: string | null;
  /** Practice minutes aimed at each calendar week. 0 turns the goal off. */
  weeklyGoalMinutes: number;
};

/** Offered in settings. Sixty is a realistic daily-ish habit, not a marathon. */
export const WEEKLY_GOAL_OPTIONS = [0, 30, 60, 120, 180, 300] as const;

export const DEFAULT_PROFILE_SETTINGS: ProfileSettings = {
  displayName: '',
  favoriteInstrument: null,
  avatarPhotoUrl: null,
  weeklyGoalMinutes: 60,
};

function isInstrumentId(value: unknown): value is InstrumentId {
  return (
    value === 'piano' ||
    value === 'drums' ||
    value === 'guitar' ||
    value === 'violin' ||
    value === 'pads'
  );
}

function isProfileSettings(value: unknown): value is ProfileSettings {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const entry = value as ProfileSettings;
  return (
    typeof entry.displayName === 'string' &&
    (entry.favoriteInstrument === null || isInstrumentId(entry.favoriteInstrument)) &&
    (entry.avatarPhotoUrl === null ||
      entry.avatarPhotoUrl === undefined ||
      typeof entry.avatarPhotoUrl === 'string')
  );
}

export async function loadProfileSettings(): Promise<ProfileSettings> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return { ...DEFAULT_PROFILE_SETTINGS };
    }
    const parsed = JSON.parse(raw) as unknown;
    if (!isProfileSettings(parsed)) {
      return { ...DEFAULT_PROFILE_SETTINGS };
    }
    return {
      displayName: parsed.displayName.trim(),
      favoriteInstrument: parsed.favoriteInstrument,
      avatarPhotoUrl: parsed.avatarPhotoUrl ?? null,
      // Settings saved before the goal existed have no value here — fall back
      // rather than storing NaN and rendering an empty ring.
      weeklyGoalMinutes:
        typeof parsed.weeklyGoalMinutes === 'number'
          ? parsed.weeklyGoalMinutes
          : DEFAULT_PROFILE_SETTINGS.weeklyGoalMinutes,
    };
  } catch {
    return { ...DEFAULT_PROFILE_SETTINGS };
  }
}

export async function saveProfileSettings(
  settings: ProfileSettings,
): Promise<ProfileSettings> {
  const next: ProfileSettings = {
    displayName: settings.displayName.trim().slice(0, 40),
    favoriteInstrument: settings.favoriteInstrument,
    avatarPhotoUrl: settings.avatarPhotoUrl ?? null,
    weeklyGoalMinutes: WEEKLY_GOAL_OPTIONS.includes(
      settings.weeklyGoalMinutes as (typeof WEEKLY_GOAL_OPTIONS)[number],
    )
      ? settings.weeklyGoalMinutes
      : DEFAULT_PROFILE_SETTINGS.weeklyGoalMinutes,
  };
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  notifyAppDataChanged();
  return next;
}
