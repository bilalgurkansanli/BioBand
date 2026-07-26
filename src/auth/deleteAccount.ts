import type { PostgrestError } from '@supabase/supabase-js';

import { isSupabaseConfigured, supabase } from '../supabase/client';

/** The SECURITY DEFINER function created by supabase/delete_account.sql. */
const DELETE_ACCOUNT_RPC = 'delete_account';

export type DeleteAccountResult =
  | { ok: true }
  | {
      ok: false;
      code: 'unconfigured' | 'sessionExpired' | 'offline' | 'rpcMissing' | 'error';
    };

/**
 * Nothing in the Supabase stack has a code for "the request never left the
 * device": the auth client only carries the original TypeError's text, so the
 * message is all there is to go on.
 */
function isNetworkFailure(message: string): boolean {
  return /network|fetch/i.test(message);
}

function classifyRpcFailure(error: PostgrestError, status: number): DeleteAccountResult {
  // postgrest-js reports a failed fetch as status 0 with an empty error code.
  if (status === 0) {
    return { ok: false, code: 'offline' };
  }
  // PostgREST has no such function in its schema cache — delete_account.sql
  // has not been run in this project yet.
  if (error.code === 'PGRST202' || status === 404) {
    return { ok: false, code: 'rpcMissing' };
  }
  // An expired or revoked JWT (PGRST301), or the function's own guard firing
  // because auth.uid() came back null. A plain 403 is deliberately not listed:
  // that is a missing grant, which is a project misconfiguration, not the
  // user's session going stale.
  if (status === 401 || error.code === 'PGRST301' || error.code === '28000') {
    return { ok: false, code: 'sessionExpired' };
  }
  return { ok: false, code: 'error' };
}

/**
 * Permanently deletes the signed-in user: their server-side rows and the auth
 * user first, then the copy on this device.
 *
 * The local teardown is injected rather than reimplemented so it keeps exactly
 * one owner (useAuthSession's `signOut`) — a step added there is inherited here
 * instead of quietly going missing from one of the two paths.
 */
export async function deleteAccount(
  signOutAndWipeLocalData: () => Promise<void>,
): Promise<DeleteAccountResult> {
  if (!isSupabaseConfigured) {
    return { ok: false, code: 'unconfigured' };
  }

  try {
    // getSession() refreshes an expired access token when it can. If it cannot,
    // there is no point sending a delete the server would reject anyway.
    const { data, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) {
      return {
        ok: false,
        code: isNetworkFailure(sessionError.message) ? 'offline' : 'sessionExpired',
      };
    }
    if (!data.session) {
      return { ok: false, code: 'sessionExpired' };
    }

    const { error, status } = await supabase.rpc(DELETE_ACCOUNT_RPC);
    if (error) {
      // The session and the local data are left completely untouched: the
      // account still exists, and wiping the credentials for it would strand
      // the user with data they can no longer reach or delete.
      return classifyRpcFailure(error, status);
    }
  } catch {
    return { ok: false, code: 'error' };
  }

  try {
    await signOutAndWipeLocalData();
  } catch (teardownError) {
    // The account is already gone and that cannot be undone, so this is still
    // a success — reporting failure would invite the user to retry a delete
    // that has already happened. The next launch wipes guest data anyway
    // (see auth/bootstrap.ts).
    console.warn('[deleteAccount] Local teardown failed after server deletion', teardownError);
  }
  return { ok: true };
}
