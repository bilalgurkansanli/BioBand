import { AppState, type NativeEventSubscription } from 'react-native';

import {
  loadProfileProgress,
  restoreProfileProgress,
} from '../storage/profileProgressStorage';
import {
  loadProfileSettings,
  saveProfileSettings,
} from '../storage/profileSettingsStorage';
import {
  loadPracticeReminderSettings,
  savePracticeReminderSettings,
} from '../storage/practiceReminderStorage';
import { onAppDataChanged } from '../storage/appDataChangeSignal';
import {
  clearAppDataPushPending,
  hasPendingAppDataPush,
  markAppDataPushPending,
} from '../storage/appDataSyncStateStorage';
import { isSupabaseConfigured, supabase } from './client';

const TABLE = 'app_data';
const PUSH_DEBOUNCE_MS = 1500;

type AppDataRow = {
  user_id: string;
  profile_progress: unknown;
  profile_settings: unknown;
  practice_reminder: unknown;
};

/**
 * Pulls the signed-in user's small-JSON data down and hydrates local storage
 * with it — unless the device is still carrying changes the cloud never
 * accepted, in which case local is the newer copy and hydrating from the cloud
 * would silently delete everything earned since the last successful push.
 *
 * Local wins outright there rather than being merged: the row holds three
 * whole-value JSON blobs and no write clock (see AppDataRow — the columns are
 * the payloads themselves), so there is nothing to compare recency against.
 * The push replaces the stale row instead, and the pull is then pointless —
 * the only row left to fetch is the one just written. If that push fails too
 * (still offline) local data simply stays put for the next retry.
 */
export async function pullAppData(userId: string): Promise<void> {
  if (!isSupabaseConfigured) {
    return;
  }

  if (await hasPendingAppDataPush(userId)) {
    await pushAppData(userId);
    return;
  }

  const { data, error } = await supabase
    .from(TABLE)
    .select('profile_progress, profile_settings, practice_reminder')
    .eq('user_id', userId)
    .maybeSingle<Omit<AppDataRow, 'user_id'>>();

  if (error || !data) {
    return;
  }

  try {
    if (data.profile_progress) {
      await restoreProfileProgress(data.profile_progress as Parameters<typeof restoreProfileProgress>[0]);
    }
    if (data.profile_settings) {
      await saveProfileSettings(data.profile_settings as Parameters<typeof saveProfileSettings>[0]);
    }
    if (data.practice_reminder) {
      await savePracticeReminderSettings(
        data.practice_reminder as Parameters<typeof savePracticeReminderSettings>[0],
      );
    }
  } catch (hydrateError) {
    console.warn('[appDataSync] Failed to hydrate local storage from cloud', hydrateError);
  }
}

/**
 * Pushes the current local small-JSON data up, overwriting the cloud copy.
 * Resolves to whether the cloud is now in step with local storage.
 *
 * A failure is recorded durably rather than thrown: the caller is usually a
 * fire-and-forget timer or a launch path, and losing a sync must not take a
 * screen down with it — but it must also not be forgotten, or the next launch
 * pulls a stale row over data that never made it up.
 */
export async function pushAppData(userId: string): Promise<boolean> {
  if (!isSupabaseConfigured) {
    return false;
  }
  const [profileProgress, profileSettings, practiceReminder] = await Promise.all([
    loadProfileProgress(),
    loadProfileSettings(),
    loadPracticeReminderSettings(),
  ]);

  const row: AppDataRow = {
    user_id: userId,
    profile_progress: profileProgress,
    profile_settings: profileSettings,
    practice_reminder: practiceReminder,
  };

  try {
    const { error } = await supabase.from(TABLE).upsert(row, { onConflict: 'user_id' });
    if (!error) {
      await clearAppDataPushPending();
      return true;
    }
    console.warn('[appDataSync] Push failed', error.message);
  } catch (transportError) {
    // supabase-js reports most failures through `error`, but a connection that
    // dies mid-request can reject out of fetch before it ever gets that far.
    console.warn('[appDataSync] Push failed', transportError);
  }
  await markAppDataPushPending(userId);
  return false;
}

/** Retries a push that an earlier attempt left unfinished, if there is one. */
async function pushIfPending(userId: string): Promise<void> {
  if (await hasPendingAppDataPush(userId)) {
    await pushAppData(userId);
  }
}

let unsubscribe: (() => void) | null = null;
let pushTimer: ReturnType<typeof setTimeout> | null = null;
let appStateSubscription: NativeEventSubscription | null = null;

/**
 * Wires local storage changes to a debounced cloud push, only while signed in,
 * and retries an unfinished push whenever the app comes back to the foreground.
 * Call once at app startup; safe to call again (replaces the previous subscription).
 */
export function startAppDataAutoSync(getCurrentUserId: () => string | null): void {
  unsubscribe?.();
  unsubscribe = onAppDataChanged(() => {
    const scheduledUserId = getCurrentUserId();
    if (!scheduledUserId) {
      return;
    }
    // Marked before the push is even attempted, not just when one fails: the
    // debounce below is real wall time during which the app can be killed, and
    // a change no push ever ran for is every bit as unpushed as one that
    // failed. A push that goes through clears this again a moment later.
    void markAppDataPushPending(scheduledUserId);
    if (pushTimer) {
      clearTimeout(pushTimer);
    }
    pushTimer = setTimeout(() => {
      pushTimer = null;
      // Re-check the session at fire time, not just when the push was
      // scheduled — if the user signed out or switched accounts in the
      // debounce window, the data now on disk belongs to someone else;
      // writing it under the originally-scheduled id would either push
      // stale data to the wrong account or resurrect it after sign-out.
      const currentUserId = getCurrentUserId();
      if (currentUserId !== scheduledUserId) {
        return;
      }
      void pushAppData(currentUserId);
    }, PUSH_DEBOUNCE_MS);
  });

  appStateSubscription?.remove();
  appStateSubscription = AppState.addEventListener('change', (state) => {
    if (state !== 'active') {
      return;
    }
    // Returning to the foreground is when connectivity has most likely come
    // back — off the plane, out of the metro — so it is the one retry trigger
    // that costs nothing while the app sits idle and offline. Everything else
    // rides on the next ordinary push, which clears the marker on success.
    const currentUserId = getCurrentUserId();
    if (currentUserId) {
      void pushIfPending(currentUserId);
    }
  });
}

export function stopAppDataAutoSync(): void {
  unsubscribe?.();
  unsubscribe = null;
  appStateSubscription?.remove();
  appStateSubscription = null;
  if (pushTimer) {
    clearTimeout(pushTimer);
    pushTimer = null;
  }
}
