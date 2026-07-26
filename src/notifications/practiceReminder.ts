import { Platform } from 'react-native';

import i18n from '../i18n';
import { loadPracticeReminderSettings } from '../storage/practiceReminderStorage';

const REMINDER_IDENTIFIER = 'bioband-practice-reminder';
const ANDROID_CHANNEL_ID = 'practice-reminders';

type NotificationsModule = typeof import('expo-notifications');

// expo-notifications needs native code that only exists once the dev client
// (or a store build) has been rebuilt with this dependency included. Until
// then, requiring it throws "Cannot find native module 'ExpoPushTokenManager'"
// and would crash the whole app on launch. Loading it lazily and catching
// that failure lets `npx expo start` keep working against an older-built
// client — reminders simply stay disabled (no-op) until the next rebuild.
let cachedModule: NotificationsModule | null | undefined;

function getNotificationsModule(): NotificationsModule | null {
  if (cachedModule !== undefined) {
    return cachedModule;
  }
  try {
    // Deliberately lazy: a static import throws at module-evaluation time when
    // the dev client was built without the native module, taking the whole app
    // down instead of just disabling reminders.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    cachedModule = require('expo-notifications') as NotificationsModule;
  } catch (error) {
    console.warn(
      'expo-notifications native module unavailable — practice reminders disabled until the dev client is rebuilt.',
      error,
    );
    cachedModule = null;
  }
  return cachedModule;
}

let handlerConfigured = false;

/** Foreground notification behavior — must run once before any notification can display. */
export function configureNotificationHandler(): void {
  if (handlerConfigured) {
    return;
  }
  const Notifications = getNotificationsModule();
  if (!Notifications) {
    return;
  }
  handlerConfigured = true;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

async function ensureAndroidChannel(Notifications: NotificationsModule): Promise<void> {
  if (Platform.OS !== 'android') {
    return;
  }
  await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
    name: 'Practice reminders',
    importance: Notifications.AndroidImportance.DEFAULT,
  });
}

/** Requests permission if not already granted. Returns whether we're clear to schedule. */
export async function requestNotificationPermission(): Promise<boolean> {
  const Notifications = getNotificationsModule();
  if (!Notifications) {
    return false;
  }
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) {
    return true;
  }
  if (!current.canAskAgain) {
    return false;
  }
  const requested = await Notifications.requestPermissionsAsync();
  return requested.granted;
}

export async function scheduleDailyPracticeReminder(
  hour: number,
  minute: number,
  title: string,
  body: string,
): Promise<void> {
  const Notifications = getNotificationsModule();
  if (!Notifications) {
    return;
  }
  await ensureAndroidChannel(Notifications);
  await Notifications.cancelScheduledNotificationAsync(REMINDER_IDENTIFIER).catch(() => {});
  await Notifications.scheduleNotificationAsync({
    identifier: REMINDER_IDENTIFIER,
    content: { title, body, sound: true },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
      channelId: ANDROID_CHANNEL_ID,
    },
  });
}

export async function cancelDailyPracticeReminder(): Promise<void> {
  const Notifications = getNotificationsModule();
  if (!Notifications) {
    return;
  }
  await Notifications.cancelScheduledNotificationAsync(REMINDER_IDENTIFIER).catch(() => {});
}

const LANGUAGE_SYNC_FLAG = Symbol.for('bioband.practiceReminder.languageSync');

// Kept on globalThis rather than in a module-local flag: Fast Refresh (and a
// duplicated module registry) can evaluate this file again against the same
// i18n instance, which would leave two listeners rescheduling in parallel.
const globalFlags = globalThis as unknown as Record<symbol, true | undefined>;

/**
 * The OS keeps whatever title/body it was handed when the notification was
 * scheduled, so a reminder scheduled in Turkish keeps firing in Turkish for
 * months after the user switches language. Handing it the new copy is the only
 * way to fix that.
 */
async function rescheduleWithCurrentLanguage(): Promise<void> {
  const reminder = await loadPracticeReminderSettings();
  // A disabled reminder has nothing scheduled — re-scheduling here would
  // resurrect one the user deliberately turned off.
  if (!reminder.enabled) {
    return;
  }
  await scheduleDailyPracticeReminder(
    reminder.hour,
    reminder.minute,
    i18n.t('profile.reminderNotifTitle'),
    i18n.t('profile.reminderNotifBody'),
  );
}

function watchLanguageChanges(): void {
  if (globalFlags[LANGUAGE_SYNC_FLAG]) {
    return;
  }
  globalFlags[LANGUAGE_SYNC_FLAG] = true;
  i18n.on('languageChanged', () => {
    // `init()` resolves the stored language through `changeLanguage()`, so it
    // emits this event too — before `isInitialized` flips. That is startup
    // rather than a user switch, and the OS already holds text in that
    // language.
    if (!i18n.isInitialized) {
      return;
    }
    rescheduleWithCurrentLanguage().catch((error) => {
      console.warn('Practice reminder language refresh failed:', error);
    });
  });
}

// App.tsx imports this module during startup, so the listener is live before
// the first-run language screen — the language can be switched there, long
// before the settings screen exists.
watchLanguageChanges();
