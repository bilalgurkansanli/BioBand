import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Session } from '@supabase/supabase-js';

import { AUTH_STORAGE_KEY } from '../supabase/client';

export type StoredSession =
  | { status: 'absent' }
  /** `session` is null when the stored value is not a shape we can read. */
  | { status: 'present'; session: Session | null }
  | { status: 'unreadable' };

function isSessionShape(value: unknown): value is Session {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const user = (value as { user?: { id?: unknown } }).user;
  return !!user && typeof user.id === 'string';
}

/**
 * What supabase-js has persisted, read straight from storage.
 *
 * Only for after `getSession()` came back without a session. supabase-js
 * itself deletes a session the server has rejected, so one still stored at
 * that point is one it kept on purpose: the access token expired and the
 * refresh could not reach the server. The user is still signed in, just
 * offline, and the client picks the refresh up again once it can.
 */
export async function readStoredSession(): Promise<StoredSession> {
  let raw: string | null;
  try {
    raw = await AsyncStorage.getItem(AUTH_STORAGE_KEY);
  } catch {
    return { status: 'unreadable' };
  }
  if (raw === null) {
    return { status: 'absent' };
  }
  try {
    const parsed = JSON.parse(raw) as unknown;
    return { status: 'present', session: isSessionShape(parsed) ? parsed : null };
  } catch {
    return { status: 'present', session: null };
  }
}
