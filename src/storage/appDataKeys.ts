import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Every AsyncStorage key this app writes to, EXCEPT:
 *  - Supabase's own session keys (managed by the supabase-js client itself)
 *  - `ONBOARDING_SEEN_KEY` below (must survive a guest wipe, or the
 *    sign-in/continue-as-guest prompt would reappear on every launch)
 *
 * Guests get none of this persisted across launches (see appDataKeys.wipeGuestAppData) —
 * signing in is what makes it stick. Keep this list in sync when adding a new
 * `storage/*.ts` module with its own STORAGE_KEY.
 */
export const ALL_APP_DATA_KEYS: string[] = [
  '@bioband/drum-machine-patterns.v1',
  '@bioband/drum-machine-settings.v1',
  '@bioband/drum-machine-song.v1',
  'drums.settings.v1',
  'guitar.settings.v1',
  'pads.customBank.v1',
  'pads.settings.v1',
  'piano.settings.v1',
  'violin.settings.v1',
  '@bioband/practice-reminder.v1',
  '@bioband/profile-progress.v1',
  '@bioband/profile-settings.v1',
  '@bioband/recordings',
  '@bioband/song-audio-bindings.v1',
  '@bioband/studio-projects.v1',
  '@bioband/user-drum-songs.v1',
  '@bioband/user-guitar-songs.v1',
  '@bioband/user-pad-songs.v1',
  '@bioband/user-songs.v1',
  '@bioband/user-violin-songs.v1',
  '@bioband/language',
];

export const ONBOARDING_SEEN_KEY = '@bioband/onboarding-seen';

/** Wipes every locally-persisted app value — guests get a fresh app on every launch. */
export async function wipeGuestAppData(): Promise<void> {
  await AsyncStorage.multiRemove(ALL_APP_DATA_KEYS);
}

export async function hasSeenOnboardingPrompt(): Promise<boolean> {
  return (await AsyncStorage.getItem(ONBOARDING_SEEN_KEY)) === 'true';
}

export async function markOnboardingPromptSeen(): Promise<void> {
  await AsyncStorage.setItem(ONBOARDING_SEEN_KEY, 'true');
}
