import AsyncStorage from '@react-native-async-storage/async-storage';

import { notifyAppDataChanged } from './appDataChangeSignal';
import { readJson } from './jsonStorage';
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

/**
 * Turns anything — stored JSON, a cloud blob — into valid settings, or null
 * when it is not settings at all.
 *
 * The display name is the one field every saved copy has always carried, so
 * its absence marks the value as not ours (a stray `{}` is "no settings", not
 * "reset everything to defaults"). Every other field is repaired on its own.
 */
export function coerceProfileSettings(value: unknown): ProfileSettings | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }
  const entry = value as Record<string, unknown>;
  if (typeof entry.displayName !== 'string') {
    return null;
  }
  return {
    displayName: entry.displayName.trim().slice(0, 40),
    favoriteInstrument: isInstrumentId(entry.favoriteInstrument) ? entry.favoriteInstrument : null,
    avatarPhotoUrl: typeof entry.avatarPhotoUrl === 'string' ? entry.avatarPhotoUrl : null,
    // Settings saved before the goal existed have no value here — fall back
    // rather than storing NaN and rendering an empty ring.
    weeklyGoalMinutes: WEEKLY_GOAL_OPTIONS.includes(
      entry.weeklyGoalMinutes as (typeof WEEKLY_GOAL_OPTIONS)[number],
    )
      ? (entry.weeklyGoalMinutes as number)
      : DEFAULT_PROFILE_SETTINGS.weeklyGoalMinutes,
  };
}

/** Rejects when storage cannot be read — for callers that send the result on. */
export function readStoredProfileSettings(): Promise<ProfileSettings> {
  return readJson(STORAGE_KEY, coerceProfileSettings, () => ({ ...DEFAULT_PROFILE_SETTINGS }));
}

export async function loadProfileSettings(): Promise<ProfileSettings> {
  try {
    return await readStoredProfileSettings();
  } catch {
    return { ...DEFAULT_PROFILE_SETTINGS };
  }
}

export async function saveProfileSettings(
  settings: ProfileSettings,
): Promise<ProfileSettings> {
  const next = coerceProfileSettings(settings) ?? { ...DEFAULT_PROFILE_SETTINGS };
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  notifyAppDataChanged();
  return next;
}

/**
 * Replaces local settings with the cloud copy. No change signal: this is the
 * sync writing, not the user editing.
 */
export async function restoreProfileSettings(settings: ProfileSettings): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}
