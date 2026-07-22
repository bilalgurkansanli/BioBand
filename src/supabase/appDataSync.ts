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
import { isSupabaseConfigured, supabase } from './client';

const TABLE = 'app_data';
const PUSH_DEBOUNCE_MS = 1500;

type AppDataRow = {
  user_id: string;
  profile_progress: unknown;
  profile_settings: unknown;
  practice_reminder: unknown;
};

/** Pulls the signed-in user's small-JSON data down and hydrates local storage with it. */
export async function pullAppData(userId: string): Promise<void> {
  if (!isSupabaseConfigured) {
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

/** Pushes the current local small-JSON data up, overwriting the cloud copy. */
export async function pushAppData(userId: string): Promise<void> {
  if (!isSupabaseConfigured) {
    return;
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

  const { error } = await supabase.from(TABLE).upsert(row, { onConflict: 'user_id' });
  if (error) {
    console.warn('[appDataSync] Push failed', error.message);
  }
}

let unsubscribe: (() => void) | null = null;
let pushTimer: ReturnType<typeof setTimeout> | null = null;

/**
 * Wires local storage changes to a debounced cloud push, only while signed in.
 * Call once at app startup; safe to call again (replaces the previous subscription).
 */
export function startAppDataAutoSync(getCurrentUserId: () => string | null): void {
  unsubscribe?.();
  unsubscribe = onAppDataChanged(() => {
    const userId = getCurrentUserId();
    if (!userId) {
      return;
    }
    if (pushTimer) {
      clearTimeout(pushTimer);
    }
    pushTimer = setTimeout(() => {
      pushTimer = null;
      void pushAppData(userId);
    }, PUSH_DEBOUNCE_MS);
  });
}

export function stopAppDataAutoSync(): void {
  unsubscribe?.();
  unsubscribe = null;
  if (pushTimer) {
    clearTimeout(pushTimer);
    pushTimer = null;
  }
}
