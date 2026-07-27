import * as AppleAuthentication from 'expo-apple-authentication';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';
import type { Session } from '@supabase/supabase-js';

import { linkAppleTokenForDeletion } from './appleTokenLink';
import { isSupabaseConfigured, supabase } from '../supabase/client';

export type AppleProfile = {
  name: string | null;
};

export type AppleSignInResult =
  | { ok: true; session: Session; appleProfile: AppleProfile }
  // No 'notAvailable': a device without the native sheet is no longer a dead
  // end, it just takes the browser route.
  | { ok: false; code: 'canceled' | 'noIdentityToken' | 'unconfigured' | 'error' };

/**
 * Where Apple sends the browser back to. Must match app.json's `scheme` and be
 * listed under Supabase → Authentication → URL Configuration → Redirect URLs.
 *
 * Hardcoded rather than built with expo-linking so there is exactly one URL to
 * allowlist: a dev-client build registers the app's own scheme too, and Expo Go
 * cannot run this app at all (it has native modules), so the scheme really is
 * always `bioband://` here.
 */
const REDIRECT_URL = 'bioband://auth-callback';

/**
 * Reads the auth parameters back off the redirect. They arrive in the query
 * string under PKCE (`?code=`) and in the fragment under the implicit flow
 * (`#access_token=`), and which one it is depends on the Supabase client's
 * `flowType` — so both are collected and the caller takes whichever it finds.
 */
function readRedirectParams(url: string): URLSearchParams {
  const hashStart = url.indexOf('#');
  const base = hashStart >= 0 ? url.slice(0, hashStart) : url;
  const fragment = hashStart >= 0 ? url.slice(hashStart + 1) : '';
  const queryStart = base.indexOf('?');
  const query = queryStart >= 0 ? base.slice(queryStart + 1) : '';
  return new URLSearchParams([query, fragment].filter(Boolean).join('&'));
}

async function sessionFromRedirect(url: string): Promise<Session | null> {
  const params = readRedirectParams(url);
  if (params.get('error') || params.get('error_code')) {
    return null;
  }

  const code = params.get('code');
  if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    return error ? null : data.session;
  }

  const accessToken = params.get('access_token');
  const refreshToken = params.get('refresh_token');
  if (accessToken && refreshToken) {
    const { data, error } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
    return error ? null : data.session;
  }

  return null;
}

/** Runs the native Sign in with Apple sheet, then exchanges the identity token for a Supabase session. */
async function signInWithAppleNatively(): Promise<AppleSignInResult> {
  try {
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

    // The code is single-use and expires within minutes, so it is spent now
    // rather than stored for deletion time. See appleTokenLink.
    if (credential.authorizationCode) {
      await linkAppleTokenForDeletion({ authorizationCode: credential.authorizationCode });
    }

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

/**
 * The same Apple ID, signed in through Apple's web page in an in-app browser.
 * This is how Android gets Sign in with Apple at all — there is no native sheet
 * off Apple's own platforms — and it is also the fallback if the native sheet
 * turns out to be unavailable on an iOS device.
 */
async function signInWithAppleInBrowser(): Promise<AppleSignInResult> {
  try {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'apple',
      options: {
        redirectTo: REDIRECT_URL,
        // We open the browser ourselves so the redirect comes back into this
        // function and the session is established before the caller continues.
        skipBrowserRedirect: true,
      },
    });
    if (error || !data.url) {
      return { ok: false, code: 'error' };
    }

    const result = await WebBrowser.openAuthSessionAsync(data.url, REDIRECT_URL);
    if (result.type === 'cancel' || result.type === 'dismiss') {
      // Backed out of the browser — the user changed their mind, which is not
      // a failure and must not surface as an error message.
      return { ok: false, code: 'canceled' };
    }
    if (result.type !== 'success') {
      return { ok: false, code: 'error' };
    }

    const session = await sessionFromRedirect(result.url);
    if (!session) {
      return { ok: false, code: 'noIdentityToken' };
    }

    // Supabase surfaces the provider's refresh token in the session at
    // sign-in and never again, so it is handed off before this scope ends.
    if (session.provider_refresh_token) {
      await linkAppleTokenForDeletion({ refreshToken: session.provider_refresh_token });
    }

    // Unlike the native sheet, the name is not handed back directly — Apple
    // posts it to Supabase, which stores it on the user. Same one-shot rule
    // applies: it is only ever populated on the first authorization.
    const metadata = session.user.user_metadata ?? {};
    const rawName =
      typeof metadata.full_name === 'string'
        ? metadata.full_name
        : typeof metadata.name === 'string'
          ? metadata.name
          : null;

    return {
      ok: true,
      session,
      appleProfile: { name: rawName?.trim() || null },
    };
  } catch {
    return { ok: false, code: 'error' };
  }
}

/**
 * Signs in with Apple on every platform. iOS gets Apple's own sheet (App Store
 * guideline 4.8 requires it there); Android — and any iOS device where the
 * sheet is unavailable — goes through Apple's web flow, which lands on the same
 * Supabase account either way.
 */
export async function signInWithApple(): Promise<AppleSignInResult> {
  if (!isSupabaseConfigured) {
    return { ok: false, code: 'unconfigured' };
  }

  if (Platform.OS === 'ios') {
    let nativeAvailable = false;
    try {
      nativeAvailable = await AppleAuthentication.isAvailableAsync();
    } catch {
      nativeAvailable = false;
    }
    if (nativeAvailable) {
      return signInWithAppleNatively();
    }
  }

  return signInWithAppleInBrowser();
}
