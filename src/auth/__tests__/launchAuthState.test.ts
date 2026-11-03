import { resolveLaunchAuthState, type LaunchAuthFacts } from '../launchAuthState';

const nothing: LaunchAuthFacts = {
  sessionUserId: null,
  sessionError: false,
  storedSession: 'absent',
  dataOwner: 'absent',
};

describe('resolveLaunchAuthState', () => {
  it('syncs when there is a live session', () => {
    expect(resolveLaunchAuthState({ ...nothing, sessionUserId: 'u1', dataOwner: 'present' })).toEqual({
      kind: 'signedIn',
      userId: 'u1',
    });
  });

  it('wipes only when every source agrees there is no account', () => {
    expect(resolveLaunchAuthState(nothing)).toEqual({ kind: 'guest' });
  });

  it('keeps everything when the refresh failed offline and the session is still stored', () => {
    // supabase-js: expired access token + network failure → session null, error set, storage kept.
    expect(
      resolveLaunchAuthState({ ...nothing, sessionError: true, storedSession: 'present', dataOwner: 'present' }),
    ).toEqual({ kind: 'signedInOffline' });
  });

  it('keeps everything on a refresh error even if the stored session is already gone', () => {
    expect(resolveLaunchAuthState({ ...nothing, sessionError: true })).toEqual({
      kind: 'signedInOffline',
    });
  });

  it('keeps everything when a session is stored but getSession reported nothing', () => {
    expect(resolveLaunchAuthState({ ...nothing, storedSession: 'present' })).toEqual({
      kind: 'signedInOffline',
    });
  });

  it('never treats unreadable storage as absent', () => {
    expect(resolveLaunchAuthState({ ...nothing, storedSession: 'unknown' }).kind).not.toBe('guest');
    expect(resolveLaunchAuthState({ ...nothing, dataOwner: 'unknown' }).kind).not.toBe('guest');
  });

  it('keeps the data of an account whose session the server revoked, and asks to sign in', () => {
    // A rejected refresh token makes supabase-js delete the session itself;
    // only the owner record still says the data is somebody's.
    expect(resolveLaunchAuthState({ ...nothing, dataOwner: 'present' })).toEqual({
      kind: 'sessionLost',
    });
  });
});
