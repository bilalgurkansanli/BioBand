import AsyncStorage from '@react-native-async-storage/async-storage';

import type { InstrumentId } from '../types/recording';

const STORAGE_KEY = '@bioband/profile-settings.v1';

export type ProfileSettings = {
  displayName: string;
  favoriteInstrument: InstrumentId | null;
};

export const DEFAULT_PROFILE_SETTINGS: ProfileSettings = {
  displayName: '',
  favoriteInstrument: null,
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
    (entry.favoriteInstrument === null || isInstrumentId(entry.favoriteInstrument))
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
  };
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return next;
}
