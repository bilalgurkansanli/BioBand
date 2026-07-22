import { GoogleSignin, isErrorWithCode, statusCodes } from '@react-native-google-signin/google-signin';
import type { Session } from '@supabase/supabase-js';

import { isSupabaseConfigured, supabase } from '../supabase/client';

let configured = false;

function ensureConfigured(): void {
  if (configured) {
    return;
  }
  GoogleSignin.configure({
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
    offlineAccess: false,
  });
  configured = true;
}

export type GoogleSignInResult =
  | { ok: true; session: Session }
  | { ok: false; code: 'canceled' | 'playServicesUnavailable' | 'noIdToken' | 'unconfigured' | 'error' };

/** Runs the native Google account picker, then exchanges the ID token for a Supabase session. */
export async function signInWithGoogle(): Promise<GoogleSignInResult> {
  if (!isSupabaseConfigured) {
    return { ok: false, code: 'unconfigured' };
  }
  ensureConfigured();

  try {
    await GoogleSignin.hasPlayServices();
    const response = await GoogleSignin.signIn();
    if (response.type !== 'success') {
      return { ok: false, code: 'canceled' };
    }
    const idToken = response.data.idToken;
    if (!idToken) {
      return { ok: false, code: 'noIdToken' };
    }

    const { data, error } = await supabase.auth.signInWithIdToken({
      provider: 'google',
      token: idToken,
    });
    if (error || !data.session) {
      return { ok: false, code: 'error' };
    }
    return { ok: true, session: data.session };
  } catch (error) {
    if (isErrorWithCode(error)) {
      if (error.code === statusCodes.SIGN_IN_CANCELLED) {
        return { ok: false, code: 'canceled' };
      }
      if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        return { ok: false, code: 'playServicesUnavailable' };
      }
    }
    return { ok: false, code: 'error' };
  }
}

export async function signOutEverywhere(): Promise<void> {
  try {
    await GoogleSignin.signOut();
  } catch {
    // Not signed in with Google (e.g. session restored without the native SDK) — fine.
  }
  await supabase.auth.signOut();
}
