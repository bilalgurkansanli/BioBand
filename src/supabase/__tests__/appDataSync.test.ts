import AsyncStorage from '@react-native-async-storage/async-storage';

import { applyPracticeReminderSettings } from '../../notifications/practiceReminder';
import { loadPracticeReminderSettings } from '../../storage/practiceReminderStorage';
import { loadProfileProgress } from '../../storage/profileProgressStorage';
import {
  loadProfileSettings,
  saveProfileSettings,
  type ProfileSettings,
} from '../../storage/profileSettingsStorage';
import { EMPTY_PROFILE_PROGRESS, type ProfileProgress } from '../../types/profile';
import {
  cancelAppDataSync,
  startAppDataAutoSync,
  stopAppDataAutoSync,
  syncAppData,
} from '../appDataSync';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('../../notifications/practiceReminder', () => ({
  applyPracticeReminderSettings: jest.fn(async () => undefined),
}));

type Blobs = {
  profile_progress: unknown;
  profile_settings: unknown;
  practice_reminder: unknown;
};

/** The fake Supabase project: one signed-in user and their row. */
const mockCloud = {
  sessionUserId: 'u1' as string | null,
  row: null as Blobs | null,
  selectError: null as { message: string } | null,
  upsertError: null as { message: string } | null,
  /** When set, the next select waits for this before answering. */
  selectGate: null as Promise<void> | null,
  /** When set, the next upsert waits for this before answering. */
  upsertGate: null as Promise<void> | null,
  selects: 0,
  upserts: [] as (Blobs & { user_id: string })[],
};

jest.mock('../client', () => ({
  isSupabaseConfigured: true,
  supabase: {
    auth: {
      getSession: async () => ({
        data: { session: mockCloud.sessionUserId ? { user: { id: mockCloud.sessionUserId } } : null },
        error: null,
      }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => undefined } } }),
    },
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => {
            mockCloud.selects += 1;
            const gate = mockCloud.selectGate;
            mockCloud.selectGate = null;
            await gate;
            return mockCloud.selectError
              ? { data: null, error: mockCloud.selectError }
              : { data: mockCloud.row, error: null };
          },
        }),
      }),
      upsert: async (row: Blobs & { user_id: string }) => {
        const gate = mockCloud.upsertGate;
        mockCloud.upsertGate = null;
        await gate;
        if (mockCloud.upsertError) {
          return { error: mockCloud.upsertError };
        }
        mockCloud.upserts.push(row);
        mockCloud.row = {
          profile_progress: row.profile_progress,
          profile_settings: row.profile_settings,
          practice_reminder: row.practice_reminder,
        };
        return { error: null };
      },
    }),
  },
}));

const PENDING_KEY = '@bioband/app-data-push-pending.v1';
const SYNCED_KEY = '@bioband/app-data-synced-user.v1';

const cloudSettings: ProfileSettings = {
  displayName: 'Cloud Ada',
  favoriteInstrument: 'violin',
  avatarPhotoUrl: null,
  weeklyGoalMinutes: 180,
};

function deferred(): { promise: Promise<void>; resolve: () => void } {
  let resolve: () => void = () => undefined;
  const promise = new Promise<void>((done) => (resolve = done));
  return { promise, resolve };
}

async function seedLocalProgress(progress: Partial<ProfileProgress>): Promise<void> {
  await AsyncStorage.setItem(
    '@bioband/profile-progress.v1',
    JSON.stringify({ ...EMPTY_PROFILE_PROGRESS, ...progress }),
  );
}

beforeEach(async () => {
  await AsyncStorage.clear();
  jest.clearAllMocks();
  jest.spyOn(console, 'warn').mockImplementation(() => undefined);
  Object.assign(mockCloud, {
    sessionUserId: 'u1',
    row: null,
    selectError: null,
    upsertError: null,
    selectGate: null,
    upsertGate: null,
    selects: 0,
    upserts: [],
  });
});

afterEach(() => {
  stopAppDataAutoSync();
  jest.restoreAllMocks();
});

describe('syncAppData', () => {
  it('pushes nothing when the pull fails, so defaults never overwrite the cloud', async () => {
    mockCloud.selectError = { message: 'timeout' };

    await expect(syncAppData('u1')).resolves.toBe('failed');

    expect(mockCloud.upserts).toHaveLength(0);
    await expect(AsyncStorage.getItem(SYNCED_KEY)).resolves.toBeNull();
  });

  it('does not query at all without a live session for that user', async () => {
    mockCloud.sessionUserId = null;
    await expect(syncAppData('u1')).resolves.toBe('failed');
    expect(mockCloud.selects).toBe(0);
  });

  it('creates the row from local data when the account has none yet', async () => {
    await saveProfileSettings({ ...cloudSettings, displayName: 'Local Ada' });
    await seedLocalProgress({ totalSongCompletions: 2 });

    await expect(syncAppData('u1')).resolves.toBe('synced');

    expect(mockCloud.upserts).toHaveLength(1);
    expect(mockCloud.upserts[0]).toMatchObject({
      user_id: 'u1',
      profile_settings: { displayName: 'Local Ada' },
      profile_progress: { totalSongCompletions: 2 },
    });
    await expect(AsyncStorage.getItem(SYNCED_KEY)).resolves.toBe('u1');
  });

  it('restores cloud settings over untouched local ones and merges progress', async () => {
    await seedLocalProgress({ completedChallengeIds: ['local-only'] });
    mockCloud.row = {
      profile_progress: { ...EMPTY_PROFILE_PROGRESS, completedChallengeIds: ['cloud-only'] },
      profile_settings: cloudSettings,
      practice_reminder: { enabled: true, hour: 8, minute: 30 },
    };

    await expect(syncAppData('u1')).resolves.toBe('synced');

    await expect(loadProfileSettings()).resolves.toEqual(cloudSettings);
    await expect(loadPracticeReminderSettings()).resolves.toEqual({
      enabled: true,
      hour: 8,
      minute: 30,
    });
    // The restored reminder reaches the OS scheduler, not just storage.
    expect(applyPracticeReminderSettings).toHaveBeenCalledWith({ enabled: true, hour: 8, minute: 30 });
    const progress = await loadProfileProgress();
    expect(progress.completedChallengeIds).toEqual(['cloud-only', 'local-only']);
    // The cloud lacked the local challenge, so the merged copy goes back up.
    expect(mockCloud.upserts).toHaveLength(1);
  });

  it('skips the push when the cloud already holds exactly what local has', async () => {
    mockCloud.row = {
      profile_progress: { ...EMPTY_PROFILE_PROGRESS },
      profile_settings: cloudSettings,
      practice_reminder: { enabled: false, hour: 19, minute: 0 },
    };
    await expect(syncAppData('u1')).resolves.toBe('synced');
    expect(mockCloud.upserts).toHaveLength(0);
    expect(applyPracticeReminderSettings).not.toHaveBeenCalled();
  });

  it('lets local settings win while local holds unpushed edits', async () => {
    await saveProfileSettings({ ...cloudSettings, displayName: 'Edited offline' });
    await AsyncStorage.setItem(PENDING_KEY, 'u1');
    mockCloud.row = {
      profile_progress: { ...EMPTY_PROFILE_PROGRESS },
      profile_settings: cloudSettings,
      practice_reminder: { enabled: false, hour: 19, minute: 0 },
    };

    await expect(syncAppData('u1')).resolves.toBe('synced');

    expect((await loadProfileSettings()).displayName).toBe('Edited offline');
    expect(mockCloud.upserts[0]?.profile_settings).toMatchObject({ displayName: 'Edited offline' });
    await expect(AsyncStorage.getItem(PENDING_KEY)).resolves.toBeNull();
  });

  it('survives a malformed blob and still restores the rest', async () => {
    await saveProfileSettings({ ...cloudSettings, displayName: 'Local Ada' });
    mockCloud.row = {
      profile_progress: { ...EMPTY_PROFILE_PROGRESS, totalSongCompletions: 7 },
      profile_settings: {},
      practice_reminder: 'garbage',
    };

    await expect(syncAppData('u1')).resolves.toBe('synced');

    expect((await loadProfileProgress()).totalSongCompletions).toBe(7);
    expect((await loadProfileSettings()).displayName).toBe('Local Ada');
    // The broken blobs are repaired from local.
    expect(mockCloud.upserts[0]?.profile_settings).toMatchObject({ displayName: 'Local Ada' });
  });

  it('records a pending push when the push itself fails', async () => {
    mockCloud.upsertError = { message: 'offline' };
    await expect(syncAppData('u1')).resolves.toBe('failed');
    await expect(AsyncStorage.getItem(PENDING_KEY)).resolves.toBe('u1');
  });

  it('writes nothing locally once sign-out has cancelled it mid-pull', async () => {
    const gate = deferred();
    mockCloud.selectGate = gate.promise;
    mockCloud.row = {
      profile_progress: { ...EMPTY_PROFILE_PROGRESS, totalSongCompletions: 50 },
      profile_settings: cloudSettings,
      practice_reminder: { enabled: true, hour: 8, minute: 0 },
    };

    const sync = syncAppData('u1');
    await new Promise((resolve) => setTimeout(resolve, 0));
    cancelAppDataSync();
    gate.resolve();

    await expect(sync).resolves.toBe('failed');
    expect((await loadProfileProgress()).totalSongCompletions).toBe(0);
    await expect(AsyncStorage.getItem('@bioband/profile-settings.v1')).resolves.toBeNull();
    expect(mockCloud.upserts).toHaveLength(0);
  });

  it('keeps the pending marker for an edit made while its push was in flight', async () => {
    startAppDataAutoSync(() => 'u1');
    await AsyncStorage.setItem(SYNCED_KEY, 'u1');
    await saveProfileSettings({ ...cloudSettings, displayName: 'First edit' });
    // Let the marker write from that edit land.
    await new Promise((resolve) => setTimeout(resolve, 0));

    const gate = deferred();
    mockCloud.upsertGate = gate.promise;
    const sync = syncAppData('u1');
    // Wait until the sync is parked on its upsert (which takes the gate).
    while (mockCloud.upsertGate !== null) {
      await new Promise((resolve) => setTimeout(resolve, 0));
    }

    await saveProfileSettings({ ...cloudSettings, displayName: 'Second edit' });
    gate.resolve();

    await expect(sync).resolves.toBe('synced');
    // The pushed row predates the second edit, so the marker must survive it.
    expect(mockCloud.upserts[0]?.profile_settings).toMatchObject({ displayName: 'First edit' });
    await expect(AsyncStorage.getItem(PENDING_KEY)).resolves.toBe('u1');
  });
});
