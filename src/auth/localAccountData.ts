import { cancelDailyPracticeReminder } from '../notifications/practiceReminder';
import { wipeGuestAppData } from '../storage/appDataKeys';

/**
 * Removes everything this device holds for the user: stored values, files,
 * and the daily reminder the OS would otherwise keep firing on its own
 * schedule long after the settings that asked for it are gone.
 *
 * The single teardown for sign-out, account deletion and the guest reset at
 * launch, so a step added here reaches all three.
 */
export async function wipeLocalUserData(): Promise<void> {
  try {
    await cancelDailyPracticeReminder();
  } catch (error) {
    // A reminder that cannot be cancelled must not keep the data on disk.
    console.warn('[localAccountData] Could not cancel the practice reminder', error);
  }
  await wipeGuestAppData();
}
