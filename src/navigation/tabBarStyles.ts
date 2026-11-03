import type { EdgeInsets } from 'react-native-safe-area-context';

import { colors } from '../theme/colors';

export const TAB_BAR_CONTENT_HEIGHT = 56;

// A fixed buffer added on top of insets.bottom, so the tab targets do not sit
// flush against the system gesture-navigation strip. It is added to the inset,
// not used instead of it — the device-specific safe area still comes from the
// inset itself.
export const EXTRA_BOTTOM_SPACING = 12;

/** Gap above the icons inside the bar. */
export const BAR_PADDING_TOP = 8;

/** Total height of the bar, including the safe-area padding underneath it. */
export function getTabBarHeight(insets: EdgeInsets): number {
  return TAB_BAR_CONTENT_HEIGHT + insets.bottom + EXTRA_BOTTOM_SPACING;
}

export function getTabBarStyle(insets: EdgeInsets) {
  const bottomSpacing = insets.bottom + EXTRA_BOTTOM_SPACING;

  return {
    backgroundColor: colors.surface,
    borderTopColor: colors.border,
    borderTopWidth: 1,
    // React Navigation's default tab bar carries a Material elevation
    // shadow on Android, which on a near-black background renders as a
    // solid dark band sitting just above the bar instead of a soft shadow.
    // Kill it so the borderTopWidth line above is the only separator.
    elevation: 0,
    shadowOpacity: 0,
    height: TAB_BAR_CONTENT_HEIGHT + bottomSpacing,
    paddingBottom: bottomSpacing,
    paddingTop: BAR_PADDING_TOP,
  };
}
