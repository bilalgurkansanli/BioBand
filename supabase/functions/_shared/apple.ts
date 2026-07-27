/**
 * Talking to Apple's Sign in with Apple REST API.
 *
 * Apple does not issue a long-lived API key. Every request is authenticated
 * with a short-lived JWT ("client secret") that the caller signs itself using
 * the .p8 key downloaded from the Apple Developer portal. That is why the
 * private key is a function secret rather than something pasted into a
 * dashboard field: it is needed at call time, not once at setup.
 */

const APPLE_AUD = 'https://appleid.apple.com';

/** Secrets set with `supabase secrets set` — see docs/apple-token-revocation.md. */
export type AppleConfig = {
  teamId: string;
  keyId: string;
  privateKeyPem: string;
  /** Services ID — the client the browser (Android) flow signs in as. */
  serviceId: string;
  /** Bundle ID — the client Apple's native iOS sheet signs in as. */
  bundleId: string;
};

export function readAppleConfig(): AppleConfig | null {
  const teamId = Deno.env.get('APPLE_TEAM_ID');
  const keyId = Deno.env.get('APPLE_KEY_ID');
  const privateKeyPem = Deno.env.get('APPLE_PRIVATE_KEY');
  const serviceId = Deno.env.get('APPLE_SERVICE_ID');
  const bundleId = Deno.env.get('APPLE_BUNDLE_ID');
  if (!teamId || !keyId || !privateKeyPem || !serviceId || !bundleId) {
    return null;
  }
  return { teamId, keyId, privateKeyPem, serviceId, bundleId };
}

function base64Url(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function encodeJson(value: unknown): string {
  return base64Url(new TextEncoder().encode(JSON.stringify(value)));
}

async function importPrivateKey(pem: string): Promise<CryptoKey> {
  // `supabase secrets set` round-trips the file's newlines as the two
  // characters \ and n, so both forms have to be accepted or the key body
  // decodes to garbage.
  const body = pem
    .replace(/\\n/g, '\n')
    .replace(/-----BEGIN [^-]+-----/, '')
    .replace(/-----END [^-]+-----/, '')
    .replace(/\s+/g, '');
  const der = Uint8Array.from(atob(body), (c) => c.charCodeAt(0));
  return crypto.subtle.importKey(
    'pkcs8',
    der,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign'],
  );
}

/**
 * Signs the ES256 client secret Apple expects. `clientId` is the subject, and
 * it must be the same client the token being acted on was issued to.
 *
 * Apple allows these to live up to six months; this one lasts five minutes.
 * It is minted per request, so a longer life would only widen the window in
 * which a leaked secret is useful.
 */
export async function createClientSecret(
  config: AppleConfig,
  clientId: string,
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = encodeJson({ alg: 'ES256', kid: config.keyId, typ: 'JWT' });
  const payload = encodeJson({
    iss: config.teamId,
    iat: now,
    exp: now + 300,
    aud: APPLE_AUD,
    sub: clientId,
  });

  const key = await importPrivateKey(config.privateKeyPem);
  const signature = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    key,
    new TextEncoder().encode(`${header}.${payload}`),
  );
  // Web Crypto returns ECDSA signatures as raw r||s, which is exactly the
  // form JWS ES256 wants — no DER unwrapping needed.
  return `${header}.${payload}.${base64Url(new Uint8Array(signature))}`;
}

/**
 * Trades the authorization code from Apple's native sheet for a refresh token.
 * The code is single-use and expires in minutes, so this has to happen while
 * the user is still signing in — not later, at deletion time.
 */
export async function exchangeAuthorizationCode(
  config: AppleConfig,
  code: string,
): Promise<string | null> {
  const secret = await createClientSecret(config, config.bundleId);
  const response = await fetch(`${APPLE_AUD}/auth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: config.bundleId,
      client_secret: secret,
      code,
      grant_type: 'authorization_code',
    }),
  });

  if (!response.ok) {
    console.error('[apple] code exchange failed', response.status, await response.text());
    return null;
  }
  const body = await response.json();
  return typeof body.refresh_token === 'string' ? body.refresh_token : null;
}

/** Revokes a refresh token. Returns false if Apple refused or was unreachable. */
export async function revokeRefreshToken(
  config: AppleConfig,
  clientId: string,
  refreshToken: string,
): Promise<boolean> {
  try {
    const secret = await createClientSecret(config, clientId);
    const response = await fetch(`${APPLE_AUD}/auth/revoke`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: secret,
        token: refreshToken,
        token_type_hint: 'refresh_token',
      }),
    });
    if (!response.ok) {
      console.error('[apple] revoke failed', response.status, await response.text());
      return false;
    }
    return true;
  } catch (error) {
    console.error('[apple] revoke threw', error);
    return false;
  }
}
