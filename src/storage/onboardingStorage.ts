import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@bioband/onboarding.v1';

/**
 * Whether the first-run tour has been shown.
 *
 * Deliberately *not* in `APP_DATA_KEYS`: that list is wiped on sign-out, and
 * having the tour reappear because someone signed out would be a bug, not a
 * feature. This is a property of the install, not of the account.
 */
export async function hasSeenOnboarding(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(STORAGE_KEY)) === 'true';
  } catch {
    // Unreadable storage should not trap a user in the tour on every launch.
    return true;
  }
}

export async function markOnboardingSeen(): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, 'true');
  } catch (error) {
    console.warn('[onboarding] could not persist seen flag', error);
  }
}
