import { useCallback, useEffect, useRef, useState } from 'react';
import type { Session } from '@supabase/supabase-js';

import {
  readStoredProfileSettings,
  saveProfileSettings,
  type ProfileSettings,
} from '../storage/profileSettingsStorage';
import { rememberSessionOwner } from '../storage/sessionOwnerStorage';
import { cancelAppDataSync, syncAppData } from '../supabase/appDataSync';
import { isSupabaseConfigured, supabase } from '../supabase/client';
import { triggerAuthReset } from './authResetSignal';
import { signOutEverywhere } from './googleAuth';
import { wipeLocalUserData } from './localAccountData';
import { readStoredSession } from './storedSession';

type SignInProfile = {
  name: string | null;
  photoUrl?: string | null;
};

/**
 * The session to show at mount. When the access token has expired and the
 * refresh cannot reach the server, `getSession()` reports no session even
 * though supabase-js keeps it stored and will refresh it once the network is
 * back. That user is still signed in — their edits must keep being recorded
 * against their account — so the stored copy stands in until the refresh
 * lands.
 */
async function resolveInitialSession(): Promise<Session | null> {
  const { data, error } = await supabase.auth.getSession();
  if (data.session || !error) {
    return data.session;
  }
  const stored = await readStoredSession();
  return stored.status === 'present' ? stored.session : null;
}

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
    void resolveInitialSession().then((initial) => {
      if (cancelled) {
        return;
      }
      sessionRef.current = initial;
      setSession(initial);
      setLoading(false);
    });

    const { data: subscription } = supabase.auth.onAuthStateChange((event, next) => {
      // INITIAL_SESSION repeats what resolveInitialSession works out, minus
      // the offline fallback: on a failed refresh it reports null for a
      // session that is still stored, and letting it through would flip a
      // signed-in-but-offline user to signed out.
      if (event === 'INITIAL_SESSION') {
        return;
      }
      sessionRef.current = next;
      setSession(next);
      if (next) {
        void rememberSessionOwner(next.user.id);
      }
    });

    return () => {
      cancelled = true;
      subscription.subscription.unsubscribe();
    };
  }, []);

  const signOut = useCallback(async () => {
    // Before anything else: a sync still in flight would otherwise write this
    // account's cloud data back into the app once it has been emptied.
    cancelAppDataSync();
    await signOutEverywhere();
    // Signing out drops back to guest status — wipe local data immediately
    // instead of leaving the signed-out user's recordings/progress visible
    // and editable until the next cold launch, then remount the app so
    // every screen re-reads its (now empty) state from storage.
    await wipeLocalUserData();
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
 * Runs right after a successful sign-in: reconciles with any existing cloud
 * data (returning user / new device) — creating the cloud row if this is a
 * first sign-in — then applies the sign-in provider's name/photo as the
 * profile avatar (the provider is the source of truth for these while signed
 * in — note Apple only ever supplies a name on a user's very first
 * authorization). The provider profile must come after the sync, or a
 * restored cloud value would win instead; saving it schedules the push.
 */
export async function syncAfterSignIn(
  userId: string,
  profile?: SignInProfile,
): Promise<void> {
  await rememberSessionOwner(userId);
  await syncAppData(userId);

  if (profile && (profile.name || profile.photoUrl)) {
    let current: ProfileSettings;
    try {
      current = await readStoredProfileSettings();
    } catch (error) {
      // Saving on top of settings that could not be read would replace them
      // with defaults; the provider's name can wait for the next sign-in.
      console.warn('[auth] Could not read profile settings to apply the sign-in profile', error);
      return;
    }
    await saveProfileSettings({
      ...current,
      displayName: profile.name?.trim() || current.displayName,
      avatarPhotoUrl: profile.photoUrl ?? current.avatarPhotoUrl,
    });
  }
}
