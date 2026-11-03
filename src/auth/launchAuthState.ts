/**
 * What launch knows about the account, and therefore what it may do with the
 * data on the device.
 */
export type LaunchAuthState =
  /** A live session: sync with the cloud. */
  | { kind: 'signedIn'; userId: string }
  /** A session is stored but could not be refreshed — offline. Keep everything, ask nothing. */
  | { kind: 'signedInOffline' }
  /**
   * No session, but the data belongs to an account that never signed out: the
   * server stopped accepting its refresh token. Keep everything and ask the
   * user to sign back in.
   */
  | { kind: 'sessionLost' }
  /** Certain there is no account in play: the guest wipe may run. */
  | { kind: 'guest' };

/** `unknown` means storage could not be read, which must never be taken as "absent". */
type Presence = 'present' | 'absent' | 'unknown';

export type LaunchAuthFacts = {
  /** The user `getSession()` returned, if any. */
  sessionUserId: string | null;
  /** Whether `getSession()` reported an error — a refresh that failed. */
  sessionError: boolean;
  /** Whether supabase-js still has a session in its storage. */
  storedSession: Presence;
  /** Whether local data is recorded as belonging to an account (sessionOwnerStorage). */
  dataOwner: Presence;
};

/**
 * Decides whether launch may wipe local data.
 *
 * Wiping is the one irreversible step at launch — recordings are never synced,
 * so wiped is gone. It happens only when every source agrees there is no
 * account: no session, no error, nothing stored, no owner on record. Any doubt,
 * including storage that cannot be read, keeps the data.
 */
export function resolveLaunchAuthState(facts: LaunchAuthFacts): LaunchAuthState {
  if (facts.sessionUserId) {
    return { kind: 'signedIn', userId: facts.sessionUserId };
  }
  // A null session with an error is supabase-js reporting a refresh that
  // failed. When that failure was the network it keeps the session stored;
  // when the server rejected the token it deletes it, which the owner record
  // below still catches on this and every later launch.
  if (facts.sessionError || facts.storedSession !== 'absent') {
    return { kind: 'signedInOffline' };
  }
  if (facts.dataOwner !== 'absent') {
    return { kind: 'sessionLost' };
  }
  return { kind: 'guest' };
}
