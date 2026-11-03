import AsyncStorage from '@react-native-async-storage/async-storage';
import { GoogleSignin, isErrorWithCode, statusCodes } from '@react-native-google-signin/google-signin';
import type { Session } from '@supabase/supabase-js';

import { AUTH_STORAGE_KEY, isSupabaseConfigured, supabase } from '../supabase/client';

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

export type GoogleProfile = {
  name: string | null;
  photoUrl: string | null;
};

export type GoogleSignInResult =
  | { ok: true; session: Session; googleProfile: GoogleProfile }
  | { ok: false; code: 'canceled' | 'playServicesUnavailable' | 'noIdToken' | 'unconfigured' | 'error' };

/** Runs the native Google account picker, then exchanges the ID token for a Supabase session. */
export async function signInWithGoogle(): Promise<GoogleSignInResult> {
  if (!isSupabaseConfigured) {
    return { ok: false, code: 'unconfigured' };
  }
  ensureConfigured();

  try {
    await GoogleSignin.hasPlayServices();
    // Clear any cached Google session first — otherwise the SDK can silently
    // reuse the last account instead of showing the chooser, which defeats
    // the point of letting the user pick which account to sign in with.
    await GoogleSignin.signOut().catch(() => {});
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
    return {
      ok: true,
      session: data.session,
      googleProfile: {
        name: response.data.user.name,
        photoUrl: response.data.user.photo,
      },
    };
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

/**
 * Ends the session on this device, whatever the network is doing.
 *
 * `supabase.auth.signOut()` loads the session before revoking it, and when the
 * access token has expired and the refresh cannot get through it returns that
 * error without touching storage. The caller wipes local data next, so a
 * sign-out that left the session behind would hand the next launch a signed-in
 * user with an emptied app. With the stored copy removed first, a local
 * sign-out has nothing left to load and goes straight to clearing state and
 * telling every listener the user is gone. The server-side refresh token is
 * then simply left to expire.
 */
export async function signOutEverywhere(): Promise<void> {
  try {
    await GoogleSignin.signOut();
  } catch {
    // Not signed in with Google (e.g. session restored without the native SDK) — fine.
  }
  let failure: unknown = null;
  try {
    failure = (await supabase.auth.signOut()).error;
  } catch (thrown) {
    failure = thrown;
  }
  if (!failure) {
    return;
  }
  console.warn('[auth] Sign-out could not reach the server; ending the session locally', failure);
  await AsyncStorage.multiRemove([AUTH_STORAGE_KEY, `${AUTH_STORAGE_KEY}-user`]);
  await supabase.auth.signOut({ scope: 'local' });
}
