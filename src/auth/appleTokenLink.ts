import { supabase } from '../supabase/client';

/**
 * What Apple handed back at sign-in, in whichever form that sign-in produced.
 * Only one of the two is ever present.
 */
export type AppleTokenPayload =
  | { authorizationCode: string }
  | { refreshToken: string };

/**
 * Parks the user's Apple token on the server so deleting their account can
 * revoke it, which Apple requires of any app offering Sign in with Apple.
 *
 * Deliberately never throws and never reports failure to the caller. The user
 * is already signed in by the time this runs; blocking or alarming them over a
 * bookkeeping call they cannot act on would trade a real problem for an
 * imaginary one. A miss is picked up by the next sign-in, and the account is
 * still deletable either way — it just would not be revoked at Apple's end.
 */
export async function linkAppleTokenForDeletion(payload: AppleTokenPayload): Promise<void> {
  try {
    const { error } = await supabase.functions.invoke('apple-token', { body: payload });
    if (error) {
      console.warn('[appleTokenLink] could not store the Apple token', error.message);
    }
  } catch (error) {
    console.warn('[appleTokenLink] could not reach the apple-token function', error);
  }
}
