import { useCallback, useEffect, useRef, useState } from 'react';
import type { Session } from '@supabase/supabase-js';

import { pullAppData, pushAppData } from '../supabase/appDataSync';
import { isSupabaseConfigured, supabase } from '../supabase/client';
import { signOutEverywhere } from './googleAuth';

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
 * (returning user / new device), then pushes once so a first-time user's
 * local state creates the initial cloud row. Order matters — pushing first
 * would overwrite real cloud data with an empty/guest-default local state.
 */
export async function syncAfterSignIn(userId: string): Promise<void> {
  await pullAppData(userId);
  await pushAppData(userId);
}
