import AsyncStorage from '@react-native-async-storage/async-storage';

export const SESSION_OWNER_KEY = '@bioband/session-owner.v1';

/**
 * Records which account the data on this device belongs to.
 *
 * Only an explicit sign-out (or account deletion) clears it, through the
 * guest wipe. That is what lets launch tell "never signed in" apart from "the
 * session vanished on its own" — a refresh token the server stopped accepting
 * clears supabase-js's stored session exactly as a sign-out would, and treating
 * that as a guest would delete recordings that exist nowhere else.
 */
export async function rememberSessionOwner(userId: string): Promise<void> {
  try {
    await AsyncStorage.setItem(SESSION_OWNER_KEY, userId);
  } catch (error) {
    console.warn('[sessionOwner] Could not record the signed-in account', error);
  }
}

/**
 * Whether local data belongs to an account that never signed out. Rejects
 * when storage cannot be read, so a caller about to wipe can stand down.
 */
export async function hasSessionOwner(): Promise<boolean> {
  return (await AsyncStorage.getItem(SESSION_OWNER_KEY)) !== null;
}
