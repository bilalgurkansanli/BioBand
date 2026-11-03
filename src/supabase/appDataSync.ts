import { AppState, type NativeEventSubscription } from 'react-native';

import { applyPracticeReminderSettings } from '../notifications/practiceReminder';
import { onAppDataChanged } from '../storage/appDataChangeSignal';
import {
  clearAppDataPushPending,
  hasPendingAppDataPush,
  markAppDataPushPending,
  markAppDataPushPendingIfSynced,
  markAppDataSynced,
} from '../storage/appDataSyncStateStorage';
import { isSameJson } from '../storage/jsonStorage';
import {
  coercePracticeReminderSettings,
  readStoredPracticeReminderSettings,
  restorePracticeReminderSettings,
  type PracticeReminderSettings,
} from '../storage/practiceReminderStorage';
import {
  coerceProfileProgress,
  mergeRemoteProfileProgress,
} from '../storage/profileProgressStorage';
import {
  coerceProfileSettings,
  readStoredProfileSettings,
  restoreProfileSettings,
  type ProfileSettings,
} from '../storage/profileSettingsStorage';
import { isSupabaseConfigured, supabase } from './client';

const TABLE = 'app_data';
const PUSH_DEBOUNCE_MS = 1500;

type AppDataRow = {
  user_id: string;
  profile_progress: unknown;
  profile_settings: unknown;
  practice_reminder: unknown;
};

type AppDataBlobs = Omit<AppDataRow, 'user_id'>;

export type SyncResult = 'synced' | 'failed' | 'unconfigured';

/** Bumped by every local edit, so a sync can tell whether one landed mid-flight. */
let localChangeSeq = 0;
/** Bumped on sign-out; a sync started before it must not write anything after it. */
let syncEpoch = 0;
/** Syncs run one at a time — two overlapping upserts could land oldest-last. */
let syncQueue: Promise<unknown> = Promise.resolve();

/**
 * Reconciles this device with the signed-in user's cloud row: pulls it, folds
 * it into local storage, and pushes the result back if the cloud lacks any of
 * it.
 *
 * Nothing is ever pushed without a successful pull first. A failed pull says
 * nothing about what the cloud holds, and pushing anyway is how a new device
 * whose first request timed out used to overwrite a year of progress with its
 * empty defaults.
 *
 * Progress merges (see profileProgressStorage.mergeProfileProgress), so
 * neither copy can lose what it earned. Settings and the reminder have no
 * clock to merge by: the cloud wins unless this device holds edits the cloud
 * never received (the pending marker), in which case local is the newer copy.
 */
export function syncAppData(userId: string): Promise<SyncResult> {
  if (!isSupabaseConfigured) {
    return Promise.resolve('unconfigured');
  }
  const run = syncQueue.then(() => syncOnce(userId));
  syncQueue = run.catch(() => undefined);
  return run.catch((error: unknown) => {
    // Most often local storage refusing a read: nothing was written, and the
    // next trigger simply tries again.
    console.warn('[appDataSync] Sync failed', error);
    return 'failed' as const;
  });
}

async function syncOnce(userId: string): Promise<SyncResult> {
  const epoch = syncEpoch;
  const changesAtStart = localChangeSeq;

  // Only a request carrying this user's own token can see their row. Without
  // one it goes out under the anon key, where Row Level Security makes the row
  // look absent — indistinguishable from a first sign-in.
  const { data: auth } = await supabase.auth.getSession();
  if (auth.session?.user.id !== userId) {
    return 'failed';
  }

  const localIsNewer = await hasPendingAppDataPush(userId);

  let cloud: AppDataBlobs | null;
  try {
    const { data, error } = await supabase
      .from(TABLE)
      .select('profile_progress, profile_settings, practice_reminder')
      .eq('user_id', userId)
      .maybeSingle<AppDataBlobs>();
    if (error) {
      console.warn('[appDataSync] Pull failed', error.message);
      return 'failed';
    }
    cloud = data;
  } catch (transportError) {
    // supabase-js reports most failures through `error`, but a connection that
    // dies mid-request can reject out of fetch before it ever gets that far.
    console.warn('[appDataSync] Pull failed', transportError);
    return 'failed';
  }

  if (epoch !== syncEpoch) {
    return 'failed';
  }
  if (localChangeSeq !== changesAtStart) {
    // An edit landed while the row was in flight, and its own sync is already
    // scheduled behind this one. Resolving it there, with that edit on record,
    // beats guessing here which copy of the settings is newer.
    return 'failed';
  }

  // Each blob is read on its own: a malformed one from an older build counts
  // as missing, and is repaired by the push below, instead of aborting the
  // other two.
  const cloudProgress = cloud ? coerceProfileProgress(cloud.profile_progress) : null;
  const cloudSettings = cloud ? coerceProfileSettings(cloud.profile_settings) : null;
  const cloudReminder = cloud ? coercePracticeReminderSettings(cloud.practice_reminder) : null;

  const progress = await mergeRemoteProfileProgress(cloudProgress);
  const [localSettings, localReminder] = await Promise.all([
    readStoredProfileSettings(),
    readStoredPracticeReminderSettings(),
  ]);
  const settings: ProfileSettings =
    cloudSettings && !localIsNewer ? cloudSettings : localSettings;
  const reminder: PracticeReminderSettings =
    cloudReminder && !localIsNewer ? cloudReminder : localReminder;

  if (epoch !== syncEpoch) {
    return 'failed';
  }
  if (!isSameJson(settings, localSettings)) {
    await restoreProfileSettings(settings);
  }
  if (!isSameJson(reminder, localReminder)) {
    await restorePracticeReminderSettings(reminder);
    try {
      await applyPracticeReminderSettings(reminder);
    } catch (error) {
      console.warn('[appDataSync] Could not reschedule the restored reminder', error);
    }
  }
  // Local now descends from this user's cloud copy, so from here on an edit
  // made on this device is genuinely newer than the cloud.
  await markAppDataSynced(userId);

  const merged: AppDataBlobs = {
    profile_progress: progress,
    profile_settings: settings,
    practice_reminder: reminder,
  };
  const cloudUpToDate =
    !!cloud &&
    isSameJson(cloud.profile_progress, merged.profile_progress) &&
    isSameJson(cloud.profile_settings, merged.profile_settings) &&
    isSameJson(cloud.practice_reminder, merged.practice_reminder);

  if (!cloudUpToDate) {
    if (epoch !== syncEpoch) {
      return 'failed';
    }
    if (!(await pushRow({ user_id: userId, ...merged }))) {
      // A failure is recorded durably rather than thrown: the caller is
      // usually a timer or a launch path, and losing a sync must not take a
      // screen down with it — but it must not be forgotten either.
      await markAppDataPushPending(userId);
      return 'failed';
    }
  }

  // An edit made since this sync read local storage is not in what was just
  // pushed; its marker has to survive for the sync that edit scheduled.
  if (localChangeSeq === changesAtStart) {
    await clearAppDataPushPending();
  }
  return 'synced';
}

async function pushRow(row: AppDataRow): Promise<boolean> {
  try {
    const { error } = await supabase.from(TABLE).upsert(row, { onConflict: 'user_id' });
    if (!error) {
      return true;
    }
    console.warn('[appDataSync] Push failed', error.message);
  } catch (transportError) {
    console.warn('[appDataSync] Push failed', transportError);
  }
  return false;
}

let unsubscribe: (() => void) | null = null;
let pushTimer: ReturnType<typeof setTimeout> | null = null;
let appStateSubscription: NativeEventSubscription | null = null;
let authSubscription: { unsubscribe: () => void } | null = null;

function clearPushTimer(): void {
  if (pushTimer) {
    clearTimeout(pushTimer);
    pushTimer = null;
  }
}

/**
 * Called on sign-out, before local data is wiped: abandons any sync in flight
 * so it cannot write the departing account's cloud data back into the emptied
 * app, and drops the one waiting on the debounce.
 */
export function cancelAppDataSync(): void {
  syncEpoch += 1;
  clearPushTimer();
}

/**
 * Wires local storage changes to a debounced sync, only while signed in, and
 * syncs again whenever the app comes back to the foreground or the session is
 * refreshed. Call once at app startup; safe to call again (replaces the
 * previous subscriptions).
 */
export function startAppDataAutoSync(getCurrentUserId: () => string | null): void {
  stopAppDataAutoSync();

  unsubscribe = onAppDataChanged(() => {
    localChangeSeq += 1;
    const scheduledUserId = getCurrentUserId();
    if (!scheduledUserId) {
      return;
    }
    // Marked before the sync is even attempted, not just when one fails: the
    // debounce below is real wall time during which the app can be killed, and
    // a change no sync ever ran for is every bit as unpushed as one that
    // failed. A sync that goes through clears this again a moment later.
    void markAppDataPushPendingIfSynced(scheduledUserId);
    clearPushTimer();
    pushTimer = setTimeout(() => {
      pushTimer = null;
      // Re-check the session at fire time, not just when the sync was
      // scheduled — if the user signed out or switched accounts in the
      // debounce window, the data now on disk belongs to someone else.
      const currentUserId = getCurrentUserId();
      if (currentUserId !== scheduledUserId) {
        return;
      }
      void syncAppData(currentUserId);
    }, PUSH_DEBOUNCE_MS);
  });

  appStateSubscription = AppState.addEventListener('change', (state) => {
    if (state !== 'active') {
      return;
    }
    // Returning to the foreground is when connectivity has most likely come
    // back — off the plane, out of the metro — and when another device may
    // have moved the cloud row on. Pulling here means this device merges that
    // in before its next edit is pushed, instead of pushing a stale copy.
    const currentUserId = getCurrentUserId();
    if (currentUserId) {
      void syncAppData(currentUserId);
    }
  });

  if (isSupabaseConfigured) {
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      // A refresh succeeding after an offline launch is the moment the cloud
      // becomes reachable again, with edits from the offline stretch waiting.
      if (event !== 'TOKEN_REFRESHED' || !session) {
        return;
      }
      const userId = session.user.id;
      // Deferred: supabase-js awaits its listeners, and a sync calls back
      // into the auth client.
      setTimeout(() => void syncAppData(userId), 0);
    });
    authSubscription = data.subscription;
  }
}

export function stopAppDataAutoSync(): void {
  unsubscribe?.();
  unsubscribe = null;
  appStateSubscription?.remove();
  appStateSubscription = null;
  authSubscription?.unsubscribe();
  authSubscription = null;
  clearPushTimer();
}
