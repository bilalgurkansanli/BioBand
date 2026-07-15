import type { EdgeInsets } from 'react-native-safe-area-context';

import { colors } from '../theme/colors';

export const ROOT_TABS_ID = 'RootTabs';

const TAB_BAR_CONTENT_HEIGHT = 56;

export function getTabBarStyle(insets: EdgeInsets) {
  return {
    backgroundColor: colors.surface,
    borderTopColor: colors.border,
    borderTopWidth: 1,
    height: TAB_BAR_CONTENT_HEIGHT + insets.bottom,
    paddingBottom: insets.bottom,
    paddingTop: 8,
  };
}
