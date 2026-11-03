import AsyncStorage from '@react-native-async-storage/async-storage';

import { withStorageLock } from './jsonStorage';

const PENDING_KEY = '@bioband/app-data-push-pending.v1';
const SYNCED_KEY = '@bioband/app-data-synced-user.v1';

/**
 * Both markers are read and written in one queue. A mark and a clear issued in
 * that order must land in that order, or a clear finishing late would erase
 * the record of a change made after the push it belongs to.
 */
function withMarkerLock<T>(operation: () => Promise<T>): Promise<T> {
  return withStorageLock(PENDING_KEY, operation);
}

/**
 * Records that local storage holds changes the cloud has not accepted yet.
 *
 * A week of practice on a plane earns real streak/XP/badge progress that lives
 * nowhere but this device. Nothing about a push that never landed survives the
 * process, so this is what tells the next sync that local is the newer copy —
 * which is only worth anything if it outlives an app kill, hence AsyncStorage
 * rather than a module flag.
 *
 * It stores the owning user id instead of a bare `true`: signing out wipes
 * local data (see appDataKeys.wipeGuestAppData), and a marker left behind by
 * the previous account would push that emptied state over the *next* account's
 * cloud row — the same data loss, aimed at a different user.
 */
export function markAppDataPushPending(userId: string): Promise<void> {
  return withMarkerLock(async () => {
    try {
      await AsyncStorage.setItem(PENDING_KEY, userId);
    } catch (error) {
      console.warn('[appDataSyncState] Could not record the pending push', error);
    }
  });
}

/** Called only once a push has been confirmed — the cloud now matches local. */
export function clearAppDataPushPending(): Promise<void> {
  return withMarkerLock(async () => {
    try {
      await AsyncStorage.removeItem(PENDING_KEY);
    } catch (error) {
      console.warn('[appDataSyncState] Could not clear the pending push', error);
    }
  });
}

/** True when this user's device is still carrying changes the cloud never got. */
export function hasPendingAppDataPush(userId: string): Promise<boolean> {
  return withMarkerLock(async () => {
    try {
      return (await AsyncStorage.getItem(PENDING_KEY)) === userId;
    } catch (error) {
      // Reading the marker is the only thing standing between a stale cloud
      // row and the user's local edits. If storage itself is unreadable,
      // assume the worst and keep local data rather than resuming the
      // overwrite this module exists to prevent.
      console.warn('[appDataSyncState] Could not read the pending push marker', error);
      return true;
    }
  });
}

/**
 * Records that this device's data has been reconciled with this user's cloud
 * row at least once, so local is a descendant of the cloud copy rather than
 * an unrelated starting point.
 *
 * Only then does a local edit count as newer than the cloud. A brand-new
 * device whose first sync failed holds nothing but defaults; letting its
 * edits claim precedence would push those defaults over the user's real
 * settings the moment the network came back.
 */
export function markAppDataSynced(userId: string): Promise<void> {
  return withMarkerLock(async () => {
    try {
      await AsyncStorage.setItem(SYNCED_KEY, userId);
    } catch (error) {
      console.warn('[appDataSyncState] Could not record the sync', error);
    }
  });
}

/**
 * Records a local edit as pending, if this device has synced with this user
 * before (see {@link markAppDataSynced}); an unreadable sync marker counts as
 * never synced.
 *
 * One locked step rather than a read followed by a write, so a sync starting
 * in between cannot read "nothing pending" for an edit that was already made.
 */
export function markAppDataPushPendingIfSynced(userId: string): Promise<void> {
  return withMarkerLock(async () => {
    try {
      if ((await AsyncStorage.getItem(SYNCED_KEY)) === userId) {
        await AsyncStorage.setItem(PENDING_KEY, userId);
      }
    } catch (error) {
      console.warn('[appDataSyncState] Could not record the pending push', error);
    }
  });
}
