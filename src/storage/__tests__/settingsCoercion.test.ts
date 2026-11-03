import AsyncStorage from '@react-native-async-storage/async-storage';

import { coercePracticeReminderSettings } from '../practiceReminderStorage';
import {
  coerceProfileSettings,
  DEFAULT_PROFILE_SETTINGS,
  saveProfileSettings,
  type ProfileSettings,
} from '../profileSettingsStorage';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

describe('coerceProfileSettings', () => {
  it('treats a blob without a display name as no settings at all', () => {
    // The cloud blob that used to crash hydration on `.trim()`.
    expect(coerceProfileSettings({})).toBeNull();
    expect(coerceProfileSettings(null)).toBeNull();
    expect(coerceProfileSettings(['Ada'])).toBeNull();
  });

  it('repairs each field on its own', () => {
    expect(
      coerceProfileSettings({
        displayName: `  ${'x'.repeat(50)}  `,
        favoriteInstrument: 'kazoo',
        avatarPhotoUrl: 42,
        weeklyGoalMinutes: 45,
      }),
    ).toEqual({
      displayName: 'x'.repeat(40),
      favoriteInstrument: null,
      avatarPhotoUrl: null,
      weeklyGoalMinutes: DEFAULT_PROFILE_SETTINGS.weeklyGoalMinutes,
    });
  });

  it('keeps valid settings as they are', () => {
    const settings: ProfileSettings = {
      displayName: 'Ada',
      favoriteInstrument: 'violin',
      avatarPhotoUrl: 'https://example.com/a.png',
      weeklyGoalMinutes: 120,
    };
    expect(coerceProfileSettings(settings)).toEqual(settings);
  });
});

describe('saveProfileSettings', () => {
  it('saves defaults rather than throwing on a malformed value', async () => {
    await expect(saveProfileSettings({} as ProfileSettings)).resolves.toEqual(
      DEFAULT_PROFILE_SETTINGS,
    );
    await expect(AsyncStorage.getItem('@bioband/profile-settings.v1')).resolves.toBe(
      JSON.stringify(DEFAULT_PROFILE_SETTINGS),
    );
  });
});

describe('coercePracticeReminderSettings', () => {
  it('needs the enabled flag to count as reminder settings', () => {
    expect(coercePracticeReminderSettings({ hour: 8, minute: 0 })).toBeNull();
    expect(coercePracticeReminderSettings('on')).toBeNull();
  });

  it('keeps a valid time', () => {
    expect(coercePracticeReminderSettings({ enabled: true, hour: 7, minute: 45 })).toEqual({
      enabled: true,
      hour: 7,
      minute: 45,
    });
  });

  it('replaces a time the OS scheduler would reject', () => {
    expect(coercePracticeReminderSettings({ enabled: true, hour: 25, minute: 7.5 })).toEqual({
      enabled: true,
      hour: 19,
      minute: 0,
    });
  });
});
