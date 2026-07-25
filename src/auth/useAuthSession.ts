import { useCallback, useEffect, useRef, useState } from 'react';
import type { Session } from '@supabase/supabase-js';

import { wipeGuestAppData } from '../storage/appDataKeys';
import { loadProfileSettings, saveProfileSettings } from '../storage/profileSettingsStorage';
import { pullAppData, pushAppData } from '../supabase/appDataSync';
import { isSupabaseConfigured, supabase } from '../supabase/client';
import { triggerAuthReset } from './authResetSignal';
import { signOutEverywhere } from './googleAuth';

type SignInProfile = {
  name: string | null;
  photoUrl?: string | null;
};

export function useAuthSession() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const sessionRef = useRef<Session | null>(null);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    void supabase.auth.getSession().then(({ data }) => {
      if (cancelled) {
        return;
      }
      sessionRef.current = data.session;
      setSession(data.session);
      setLoading(false);
    });

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, next) => {
      sessionRef.current = next;
      setSession(next);
    });

    return () => {
      cancelled = true;
      subscription.subscription.unsubscribe();
    };
  }, []);

  const signOut = useCallback(async () => {
    await signOutEverywhere();
    // Signing out drops back to guest status — wipe local data immediately
    // instead of leaving the signed-out user's recordings/progress visible
    // and editable until the next cold launch, then remount the app so
    // every screen re-reads its (now empty) state from storage.
    await wipeGuestAppData();
    triggerAuthReset();
  }, []);

  // Stable identity (via useCallback) — the caller wires this into an effect
  // dependency array (see App.tsx's startAppDataAutoSync), so a fresh
  // function on every render would tear down and resubscribe the sync
  // listener on every App re-render instead of once.
  const getCurrentUserId = useCallback(() => sessionRef.current?.user.id ?? null, []);

  return {
    session,
    user: session?.user ?? null,
    loading,
    isSignedIn: !!session,
    signOut,
    getCurrentUserId,
  };
}

/**
 * Runs right after a successful sign-in: restores any existing cloud data
 * (returning user / new device), applies the sign-in provider's name/photo as
 * the profile avatar (the provider is the source of truth for these while
 * signed in — note Apple only ever supplies a name on a user's very first
 * authorization), then pushes once so a first-time user's local state
 * creates the initial cloud row. Order matters — pushing first would
 * overwrite real cloud data with an empty/guest-default local state, and the
 * provider profile must be applied after the pull or a restored cloud value
 * would win instead.
 */
export async function syncAfterSignIn(
  userId: string,
  profile?: SignInProfile,
): Promise<void> {
  await pullAppData(userId);

  if (profile && (profile.name || profile.photoUrl)) {
    const current = await loadProfileSettings();
    await saveProfileSettings({
      ...current,
      displayName: profile.name?.trim() || current.displayName,
      avatarPhotoUrl: profile.photoUrl ?? current.avatarPhotoUrl,
    });
  }

  await pushAppData(userId);
}
