import { hasSeenOnboardingPrompt, wipeGuestAppData } from '../storage/appDataKeys';
import { pullAppData } from '../supabase/appDataSync';
import { isSupabaseConfigured, supabase } from '../supabase/client';

export type BootstrapResult = {
  showAuthPrompt: boolean;
};

/**
 * Runs once at app startup, before the rest of the UI renders:
 *  - Signed in: pulls cloud progress/settings down over local storage.
 *  - Guest: wipes every local app-data key (see appDataKeys.ALL_APP_DATA_KEYS)
 *    so guests always start fresh, then shows the sign-in prompt exactly once
 *    (tracked by ONBOARDING_SEEN_KEY, which the wipe deliberately spares).
 */
export async function bootstrapAuthAndData(): Promise<BootstrapResult> {
  if (!isSupabaseConfigured) {
    // No Supabase project configured in this build — behave like a plain
    // local-only app rather than blocking on a feature that can't work.
    return { showAuthPrompt: false };
  }

  const { data } = await supabase.auth.getSession();
  const userId = data.session?.user.id;

  if (userId) {
    await pullAppData(userId);
    return { showAuthPrompt: false };
  }

  await wipeGuestAppData();
  const seen = await hasSeenOnboardingPrompt();
  return { showAuthPrompt: !seen };
}
