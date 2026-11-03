import AsyncStorage from '@react-native-async-storage/async-storage';

import { bootstrapAuthAndData } from '../bootstrap';
import { wipeLocalUserData } from '../localAccountData';
import { syncAppData } from '../../supabase/appDataSync';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('../localAccountData', () => ({ wipeLocalUserData: jest.fn(async () => undefined) }));
jest.mock('../../supabase/appDataSync', () => ({ syncAppData: jest.fn(async () => 'synced') }));

const mockAuth = {
  result: { data: { session: null as { user: { id: string } } | null }, error: null as Error | null },
};
jest.mock('../../supabase/client', () => ({
  AUTH_STORAGE_KEY: 'sb-test-auth-token',
  isSupabaseConfigured: true,
  supabase: { auth: { getSession: async () => mockAuth.result } },
}));

const OWNER_KEY = '@bioband/session-owner.v1';

beforeEach(async () => {
  await AsyncStorage.clear();
  jest.clearAllMocks();
  mockAuth.result = { data: { session: null }, error: null };
});

describe('bootstrapAuthAndData', () => {
  it('keeps a signed-in user’s data when the token refresh fails offline', async () => {
    // What supabase-js returns for an expired access token whose refresh hit
    // a network error: no session, an error, and the session left in storage.
    mockAuth.result = { data: { session: null }, error: new Error('Network request failed') };
    await AsyncStorage.setItem('sb-test-auth-token', JSON.stringify({ user: { id: 'u1' } }));
    await AsyncStorage.setItem(OWNER_KEY, 'u1');

    await expect(bootstrapAuthAndData()).resolves.toEqual({ showAuthPrompt: false });
    expect(wipeLocalUserData).not.toHaveBeenCalled();
    expect(syncAppData).not.toHaveBeenCalled();
  });

  it('keeps the data and asks to sign in when the session vanished without a sign-out', async () => {
    await AsyncStorage.setItem(OWNER_KEY, 'u1');

    await expect(bootstrapAuthAndData()).resolves.toEqual({ showAuthPrompt: true });
    expect(wipeLocalUserData).not.toHaveBeenCalled();
  });

  it('wipes a guest and shows the prompt only until it has been seen', async () => {
    await expect(bootstrapAuthAndData()).resolves.toEqual({ showAuthPrompt: true });
    expect(wipeLocalUserData).toHaveBeenCalledTimes(1);

    await AsyncStorage.setItem('@bioband/onboarding-seen', 'true');
    await expect(bootstrapAuthAndData()).resolves.toEqual({ showAuthPrompt: false });
  });

  it('records the owner and syncs when the session is live', async () => {
    mockAuth.result = { data: { session: { user: { id: 'u1' } } }, error: null };

    await expect(bootstrapAuthAndData()).resolves.toEqual({ showAuthPrompt: false });
    expect(syncAppData).toHaveBeenCalledWith('u1');
    await expect(AsyncStorage.getItem(OWNER_KEY)).resolves.toBe('u1');
    expect(wipeLocalUserData).not.toHaveBeenCalled();
  });
});
