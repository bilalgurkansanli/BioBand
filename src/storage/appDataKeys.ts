import AsyncStorage from '@react-native-async-storage/async-storage';
import { Directory, Paths } from 'expo-file-system';

import { corruptBackupKey } from './jsonStorage';

/**
 * Every AsyncStorage key this app writes to, EXCEPT:
 *  - Supabase's own session keys (managed by the supabase-js client itself)
 *  - `ONBOARDING_SEEN_KEY` below (must survive a guest wipe, or the
 *    sign-in/continue-as-guest prompt would reappear on every launch)
 *  - `@bioband/onboarding.v1` (the coach tour, same reasoning)
 *  - `@bioband/language` (a UI/device preference, not user content — same
 *    reasoning as the onboarding flag; the picker only runs once, so wiping
 *    this would silently revert a guest's language on every cold launch
 *    with no way to know why)
 *
 * Guests get none of this persisted across launches (see appDataKeys.wipeGuestAppData) —
 * signing in is what makes it stick. Keep this list in sync when adding a new
 * `storage/*.ts` module with its own STORAGE_KEY; appDataKeys.test.ts fails
 * when one is missing.
 */
export const ALL_APP_DATA_KEYS: string[] = [
  // Wiped along with the data it refers to: a pending-push marker outliving
  // the local changes it stands for would push the freshly-emptied state over
  // the cloud row on the next sign-in (see appDataSyncStateStorage).
  '@bioband/app-data-push-pending.v1',
  '@bioband/app-data-synced-user.v1',
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
  '@bioband/recording-settings.v1',
  '@bioband/recordings',
  '@bioband/song-audio-bindings.v1',
  '@bioband/studio-projects.v1',
  '@bioband/user-drum-songs.v1',
  '@bioband/user-guitar-songs.v1',
  '@bioband/user-pad-songs.v1',
  '@bioband/user-songs.v1',
  '@bioband/user-violin-songs.v1',
];

export type WipeDirectory = { base: 'document' | 'cache'; name: string };

/**
 * Every directory the app or its native modules write real files into. The
 * AsyncStorage keys above only wipe the *references* to these — without also
 * deleting the directories, the audio itself would linger on disk forever,
 * and Documents is browsable in the iOS Files app (UIFileSharingEnabled).
 *
 * appDataKeys.test.ts checks every `new Directory(Paths.…, '…')` in src is
 * listed here.
 */
export const GUEST_WIPE_DIRECTORIES: readonly WipeDirectory[] = [
  // Microphone takes, copied out of the cache (recordingAudioStorage).
  { base: 'document', name: 'recording-audio' },
  { base: 'document', name: 'studio-audio' },
  { base: 'document', name: 'pad-samples' },
  { base: 'document', name: 'song-audio' },
  { base: 'document', name: 'BioBand Imports' },
  { base: 'document', name: 'BioBand Recordings' },
  // Audio unpacked from a library backup (libraryBackup).
  { base: 'document', name: 'BioBand Restored' },
  { base: 'cache', name: 'bioband-exports' },
  // Library backups: the whole library, audio included, in one file.
  { base: 'cache', name: 'bioband-backups' },
  // expo-document-picker's copy of every file picked for import or restore.
  { base: 'cache', name: 'DocumentPicker' },
  // expo-audio's raw recordings, before they are copied into Documents —
  // `ExpoAudio` on iOS, `Audio` on Android.
  { base: 'cache', name: 'ExpoAudio' },
  { base: 'cache', name: 'Audio' },
];

export const ONBOARDING_SEEN_KEY = '@bioband/onboarding-seen';

/** Wipes every locally-persisted app value and file — guests get a fresh app on every launch. */
export async function wipeGuestAppData(): Promise<void> {
  await AsyncStorage.multiRemove([
    ...ALL_APP_DATA_KEYS,
    // A value set aside because it no longer parsed is still the user's data.
    ...ALL_APP_DATA_KEYS.map(corruptBackupKey),
  ]);
  for (const { base, name } of GUEST_WIPE_DIRECTORIES) {
    try {
      const dir = new Directory(base === 'document' ? Paths.document : Paths.cache, name);
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
