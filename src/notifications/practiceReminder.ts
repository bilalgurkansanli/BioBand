import { Platform } from 'react-native';

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
