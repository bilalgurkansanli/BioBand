import { useFocusEffect } from '@react-navigation/native';
import type { NavigationProp } from '@react-navigation/native';
import { useCallback } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getTabBarStyle } from '../navigation/tabBarStyles';
import { configureSystemUi } from '../system/configureSystemUi';

export function useRestoreTabBar(
  navigation: NavigationProp<Record<string, object | undefined>>,
) {
  const insets = useSafeAreaInsets();

  useFocusEffect(
    useCallback(() => {
      const parent = navigation.getParent();

      const apply = () => {
        parent?.setOptions({ tabBarStyle: getTabBarStyle(insets) });
        void configureSystemUi();
      };

      apply();
      const frame = requestAnimationFrame(apply);

      return () => cancelAnimationFrame(frame);
    }, [navigation, insets]),
  );
}
