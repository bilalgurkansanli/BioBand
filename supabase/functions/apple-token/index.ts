/**
 * Captures the Apple refresh token for the signed-in user, so that deleting
 * the account later can revoke it (see supabase/functions/delete-account).
 *
 * Called by the app immediately after a successful Sign in with Apple, in
 * whichever of two shapes that sign-in produced:
 *
 *   { authorizationCode }  the native iOS sheet — a single-use code, valid for
 *                          minutes, which only a server holding the .p8 key can
 *                          trade for a refresh token. Hence this function.
 *   { refreshToken }       the browser flow (Android) — Supabase already did
 *                          the exchange and surfaced the token in the session
 *                          exactly once.
 *
 * Failing here must never fail the sign-in: the user is already authenticated
 * by this point, and the worst case is that the next sign-in captures a token
 * instead. The caller treats every response as advisory.
 */
import { exchangeAuthorizationCode, readAppleConfig } from '../_shared/apple.ts';
import { json, resolveCaller } from '../_shared/caller.ts';

Deno.serve(async (request) => {
  if (request.method !== 'POST') {
    return json({ error: 'method_not_allowed' }, 405);
  }

  const caller = await resolveCaller(request);
  if (!caller) {
    return json({ error: 'unauthorized' }, 401);
  }

  const config = readAppleConfig();
  if (!config) {
    return json({ error: 'apple_not_configured' }, 501);
  }

  let body: { authorizationCode?: unknown; refreshToken?: unknown };
  try {
    body = await request.json();
  } catch {
    return json({ error: 'bad_request' }, 400);
  }

  let refreshToken: string | null = null;
  let clientId: string;

  if (typeof body.refreshToken === 'string' && body.refreshToken) {
    refreshToken = body.refreshToken;
    clientId = config.serviceId;
  } else if (typeof body.authorizationCode === 'string' && body.authorizationCode) {
    refreshToken = await exchangeAuthorizationCode(config, body.authorizationCode);
    clientId = config.bundleId;
  } else {
    return json({ error: 'bad_request' }, 400);
  }

  if (!refreshToken) {
    // Apple refused the exchange. Nothing to store, and nothing the user can
    // do about it — reported so the app can log it, not so it can retry.
    return json({ error: 'no_refresh_token' }, 502);
  }

  const { error } = await caller.admin
    .from('apple_refresh_tokens')
    .upsert(
      {
        user_id: caller.userId,
        refresh_token: refreshToken,
        client_id: clientId,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' },
    );

  if (error) {
    console.error('[apple-token] store failed', error);
    return json({ error: 'store_failed' }, 500);
  }

  return json({ ok: true });
});
