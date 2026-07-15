import { Linking, Platform } from 'react-native';

/** Must match `expo.android.package` in app.json. */
export const ANDROID_PACKAGE_ID = 'com.bioband.app';

/**
 * Numeric App Store ID (not the bundle id).
 * Set this after the first App Store publish so write-review deep links work.
 */
export const IOS_APP_STORE_ID = '';

export function getStoreDisplayName(): 'Google Play Store' | 'App Store' {
  return Platform.OS === 'ios' ? 'App Store' : 'Google Play Store';
}

function getStoreReviewUrl(): string {
  if (Platform.OS === 'ios') {
    if (IOS_APP_STORE_ID) {
      return `https://apps.apple.com/app/id${IOS_APP_STORE_ID}?action=write-review`;
    }
    // Fallback until the App Store ID is configured.
    return 'https://apps.apple.com/search?term=BioBand';
  }

  return `https://play.google.com/store/apps/details?id=${ANDROID_PACKAGE_ID}&showAllReviews=true`;
}

/** Opens the platform store page so the user can leave a review / song request. */
export async function openStoreReview(): Promise<void> {
  const url = getStoreReviewUrl();
  const canOpen = await Linking.canOpenURL(url);
  if (!canOpen) {
    throw new Error(`Cannot open store URL: ${url}`);
  }
  await Linking.openURL(url);
}
