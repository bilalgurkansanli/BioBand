import { hasSeenOnboardingPrompt } from '../storage/appDataKeys';
import { hasSessionOwner, rememberSessionOwner } from '../storage/sessionOwnerStorage';
import { syncAppData } from '../supabase/appDataSync';
import { isSupabaseConfigured, supabase } from '../supabase/client';
import { resolveLaunchAuthState } from './launchAuthState';
import { wipeLocalUserData } from './localAccountData';
import { readStoredSession } from './storedSession';

export type BootstrapResult = {
  showAuthPrompt: boolean;
};

async function probeDataOwner(): Promise<'present' | 'absent' | 'unknown'> {
  try {
    return (await hasSessionOwner()) ? 'present' : 'absent';
  } catch {
    return 'unknown';
  }
}

/**
 * Runs once at app startup, before the rest of the UI renders:
 *  - Signed in: syncs cloud progress/settings with local storage.
 *  - Signed in but offline (stored session, refresh failed): touches nothing
 *    and asks nothing — the client refreshes once the network is back.
 *  - Session lost without a sign-out: keeps the data and asks the user to
 *    sign back in.
 *  - Guest: wipes every local app-data key (see appDataKeys.ALL_APP_DATA_KEYS)
 *    so guests always start fresh, then shows the sign-in prompt exactly once
 *    (tracked by ONBOARDING_SEEN_KEY, which the wipe deliberately spares).
 *
 * `getSession()` alone cannot tell the guest case from the offline one — it
 * answers "no session" for both — and wiping on that answer used to delete a
 * signed-in user's whole library on any launch without signal.
 */
export async function bootstrapAuthAndData(): Promise<BootstrapResult> {
  if (!isSupabaseConfigured) {
    // No Supabase project configured in this build — behave like a plain
    // local-only app rather than blocking on a feature that can't work.
    return { showAuthPrompt: false };
  }

  const { data, error } = await supabase.auth.getSession();
  const sessionUserId = data.session?.user.id ?? null;
  const stored = sessionUserId ? null : await readStoredSession();
  const state = resolveLaunchAuthState({
    sessionUserId,
    sessionError: !!error,
    storedSession: !stored
      ? 'present'
      : stored.status === 'unreadable'
        ? 'unknown'
        : stored.status,
    dataOwner: await probeDataOwner(),
  });

  switch (state.kind) {
    case 'signedIn':
      await rememberSessionOwner(state.userId);
      await syncAppData(state.userId);
      return { showAuthPrompt: false };
    case 'signedInOffline':
      return { showAuthPrompt: false };
    case 'sessionLost':
      return { showAuthPrompt: true };
    case 'guest':
      await wipeLocalUserData();
      return { showAuthPrompt: !(await hasSeenOnboardingPrompt()) };
  }
}
