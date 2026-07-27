import { createClient, type SupabaseClient } from 'jsr:@supabase/supabase-js@2';

/**
 * Resolves who is calling from the request's own Authorization header, and
 * hands back a service-role client for the work that follows.
 *
 * The user id is never taken from the request body. A client can put any id it
 * likes in a body; it cannot forge a JWT signed with the project's secret. So
 * the token is the only thing trusted here, and everything downstream acts on
 * the id Supabase verified from it.
 */
export type Caller = {
  userId: string;
  /** The caller's own token, for acting *as* them (subject to RLS). */
  accessToken: string;
  /** Bypasses RLS — only ever used on tables the client must not reach. */
  admin: SupabaseClient;
};

export async function resolveCaller(request: Request): Promise<Caller | null> {
  const header = request.headers.get('Authorization') ?? '';
  const accessToken = header.replace(/^Bearer\s+/i, '').trim();
  if (!accessToken) {
    return null;
  }

  const url = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !serviceKey) {
    console.error('[caller] SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY missing');
    return null;
  }

  const admin = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await admin.auth.getUser(accessToken);
  if (error || !data.user) {
    return null;
  }
  return { userId: data.user.id, accessToken, admin };
}

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
