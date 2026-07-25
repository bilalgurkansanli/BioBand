import * as AppleAuthentication from 'expo-apple-authentication';
import type { Session } from '@supabase/supabase-js';

import { isSupabaseConfigured, supabase } from '../supabase/client';

export type AppleProfile = {
  name: string | null;
};

export type AppleSignInResult =
  | { ok: true; session: Session; appleProfile: AppleProfile }
  | { ok: false; code: 'canceled' | 'notAvailable' | 'noIdentityToken' | 'unconfigured' | 'error' };

/** Runs the native Sign in with Apple sheet, then exchanges the identity token for a Supabase session. */
export async function signInWithApple(): Promise<AppleSignInResult> {
  if (!isSupabaseConfigured) {
    return { ok: false, code: 'unconfigured' };
  }

  try {
    if (!(await AppleAuthentication.isAvailableAsync())) {
      return { ok: false, code: 'notAvailable' };
    }

    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
    });

    if (!credential.identityToken) {
      return { ok: false, code: 'noIdentityToken' };
    }

    const { data, error } = await supabase.auth.signInWithIdToken({
      provider: 'apple',
      token: credential.identityToken,
    });
    if (error || !data.session) {
      return { ok: false, code: 'error' };
    }

    // Apple only returns the user's name on the very first authorization ever
    // granted to this app — later sign-ins omit it, so callers must persist
    // it then rather than expecting it on every sign-in.
    const name = credential.fullName
      ? [credential.fullName.givenName, credential.fullName.familyName].filter(Boolean).join(' ')
      : null;

    return {
      ok: true,
      session: data.session,
      appleProfile: { name: name || null },
    };
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'ERR_REQUEST_CANCELED') {
      return { ok: false, code: 'canceled' };
    }
    return { ok: false, code: 'error' };
  }
}
