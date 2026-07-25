import AsyncStorage from '@react-native-async-storage/async-storage';
import { Directory, Paths } from 'expo-file-system';

/**
 * Every AsyncStorage key this app writes to, EXCEPT:
 *  - Supabase's own session keys (managed by the supabase-js client itself)
 *  - `ONBOARDING_SEEN_KEY` below (must survive a guest wipe, or the
 *    sign-in/continue-as-guest prompt would reappear on every launch)
 *  - `@bioband/language` (a UI/device preference, not user content — same
 *    reasoning as the onboarding flag; the picker only runs once, so wiping
 *    this would silently revert a guest's language on every cold launch
 *    with no way to know why)
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
];

/**
 * Documents/cache subdirectories the app writes real files into (mic takes,
 * custom pad samples, backing tracks, imported/exported audio). The
 * AsyncStorage keys above only wipe the *references* to these — without
 * also deleting the directories, a guest's actual audio bytes would linger
 * on disk forever, quietly breaking the "guest = ephemeral" promise.
 */
const GUEST_WIPE_DIRECTORIES: { base: Directory; name: string }[] = [
  { base: Paths.document, name: 'studio-audio' },
  { base: Paths.document, name: 'pad-samples' },
  { base: Paths.document, name: 'song-audio' },
  { base: Paths.document, name: 'BioBand Imports' },
  { base: Paths.document, name: 'BioBand Recordings' },
  { base: Paths.cache, name: 'bioband-exports' },
];

export const ONBOARDING_SEEN_KEY = '@bioband/onboarding-seen';

/** Wipes every locally-persisted app value and file — guests get a fresh app on every launch. */
export async function wipeGuestAppData(): Promise<void> {
  await AsyncStorage.multiRemove(ALL_APP_DATA_KEYS);
  for (const { base, name } of GUEST_WIPE_DIRECTORIES) {
    try {
      const dir = new Directory(base, name);
      if (dir.exists) {
        dir.delete();
      }
    } catch {
      // Best-effort cleanup — a missing/locked directory shouldn't block launch.
    }
  }
}

export async function hasSeenOnboardingPrompt(): Promise<boolean> {
  return (await AsyncStorage.getItem(ONBOARDING_SEEN_KEY)) === 'true';
}

export async function markOnboardingPromptSeen(): Promise<void> {
  await AsyncStorage.setItem(ONBOARDING_SEEN_KEY, 'true');
}
