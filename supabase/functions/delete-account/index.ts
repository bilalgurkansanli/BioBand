/**
 * Deletes the calling user's account, revoking their Apple tokens first.
 *
 * Apple requires an app offering Sign in with Apple to call their revoke
 * endpoint on account deletion, so the app stops appearing under the user's
 * Apple ID afterwards. That is the only reason this function exists — the
 * deletion itself still happens in public.delete_account(), called here with
 * the user's own JWT so the database stays the single owner of what "delete an
 * account" means, and so the privilege still cannot target anyone else.
 *
 * Order matters: revoke, then delete. Deleting first would drop the token row
 * (it cascades off auth.users) and leave nothing to revoke with.
 *
 * A failed revoke does not block the deletion. Deleting their account is the
 * user's right and they may never come back to retry; holding it hostage to
 * Apple being reachable would be the worse failure. It is logged loudly
 * instead, and reported back so the app can tell the two apart.
 */
import { readAppleConfig, revokeRefreshToken } from '../_shared/apple.ts';
import { json, resolveCaller } from '../_shared/caller.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';

Deno.serve(async (request) => {
  if (request.method !== 'POST') {
    return json({ error: 'method_not_allowed' }, 405);
  }

  const caller = await resolveCaller(request);
  if (!caller) {
    return json({ error: 'unauthorized' }, 401);
  }

  let revoked: 'revoked' | 'nothing_to_revoke' | 'revoke_failed' = 'nothing_to_revoke';

  const { data: stored, error: readError } = await caller.admin
    .from('apple_refresh_tokens')
    .select('refresh_token, client_id')
    .eq('user_id', caller.userId)
    .maybeSingle();

  if (readError) {
    // Most likely apple_tokens.sql has not been run. Say so in the logs, then
    // carry on — an account with no Apple identity has nothing to revoke and
    // must still be deletable.
    console.error('[delete-account] could not read apple_refresh_tokens', readError);
  } else if (stored) {
    const config = readAppleConfig();
    if (!config) {
      console.error('[delete-account] Apple secrets missing; cannot revoke');
      revoked = 'revoke_failed';
    } else {
      const ok = await revokeRefreshToken(config, stored.client_id, stored.refresh_token);
      revoked = ok ? 'revoked' : 'revoke_failed';
    }
  }

  const url = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  if (!url || !anonKey) {
    console.error('[delete-account] SUPABASE_URL / SUPABASE_ANON_KEY missing');
    return json({ error: 'server_misconfigured' }, 500);
  }

  // Acting as the caller, not as the service role: public.delete_account()
  // reads auth.uid() and deletes exactly that user, so there is no id here for
  // a bug in this function to point at the wrong account.
  const asUser = createClient(url, anonKey, {
    global: { headers: { Authorization: `Bearer ${caller.accessToken}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { error: deleteError } = await asUser.rpc('delete_account');
  if (deleteError) {
    console.error('[delete-account] delete_account() failed', deleteError);
    return json({ error: 'delete_failed', code: deleteError.code ?? null }, 500);
  }

  return json({ ok: true, apple: revoked });
});
