import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@bioband/app-data-push-pending.v1';

/**
 * Records that local storage holds changes the cloud has not accepted yet.
 *
 * A week of practice on a plane earns real streak/XP/badge progress that lives
 * nowhere but this device. Nothing about a push that never landed survives the
 * process, so the next launch pulls the week-old cloud row straight over it.
 * This marker is what lets the pull stand down — which is only worth anything
 * if it outlives an app kill, hence AsyncStorage rather than a module flag.
 *
 * It stores the owning user id instead of a bare `true`: signing out wipes
 * local data (see appDataKeys.wipeGuestAppData), and a marker left behind by
 * the previous account would push that emptied state over the *next* account's
 * cloud row — the same data loss, aimed at a different user.
 */
export async function markAppDataPushPending(userId: string): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, userId);
  } catch (error) {
    console.warn('[appDataSyncState] Could not record the pending push', error);
  }
}

/** Called only once a push has been confirmed — the cloud now matches local. */
export async function clearAppDataPushPending(): Promise<void> {
  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.warn('[appDataSyncState] Could not clear the pending push', error);
  }
}

/** True when this user's device is still carrying changes the cloud never got. */
export async function hasPendingAppDataPush(userId: string): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(STORAGE_KEY)) === userId;
  } catch (error) {
    // Reading the marker is the only thing standing between a stale cloud row
    // and the user's local progress. If storage itself is unreadable, assume
    // the worst and keep local data rather than resuming the overwrite this
    // module exists to prevent.
    console.warn('[appDataSyncState] Could not read the pending push marker', error);
    return true;
  }
}
