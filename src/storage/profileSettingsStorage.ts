import AsyncStorage from '@react-native-async-storage/async-storage';

import { notifyAppDataChanged } from './appDataChangeSignal';
import type { InstrumentId } from '../types/recording';

const STORAGE_KEY = '@bioband/profile-settings.v1';

export type ProfileSettings = {
  displayName: string;
  favoriteInstrument: InstrumentId | null;
  /** Hex color for the initial-letter avatar; null falls back to the theme accent. */
  avatarColor: string | null;
};

export const DEFAULT_PROFILE_SETTINGS: ProfileSettings = {
  displayName: '',
  favoriteInstrument: null,
  avatarColor: null,
};

export const AVATAR_COLORS: string[] = [
  '#6C5CE7',
  '#E17055',
  '#00B894',
  '#0984E3',
  '#FDCB6E',
  '#E84393',
  '#00CEC9',
  '#D63031',
];

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
    (entry.avatarColor === null ||
      entry.avatarColor === undefined ||
      typeof entry.avatarColor === 'string')
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
      avatarColor: parsed.avatarColor ?? null,
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
    avatarColor: settings.avatarColor,
  };
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  notifyAppDataChanged();
  return next;
}
