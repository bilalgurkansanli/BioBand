import * as NavigationBar from 'expo-navigation-bar';
import * as SystemUI from 'expo-system-ui';
import { AppState, Platform, type AppStateStatus } from 'react-native';

import { colors } from '../theme/colors';

export async function configureSystemUi(): Promise<void> {
  await SystemUI.setBackgroundColorAsync(colors.background);

  if (Platform.OS !== 'android') {
    return;
  }

  NavigationBar.setStyle('dark');
  await NavigationBar.setButtonStyleAsync('light');

  try {
    await NavigationBar.setBackgroundColorAsync(colors.background);
  } catch {
    // No-op on edge-to-edge Android where background color API is disabled.
  }
}

export function startSystemUiSync(): () => void {
  void configureSystemUi();

  const handleAppState = (state: AppStateStatus) => {
    if (state === 'active') {
      void configureSystemUi();
    }
  };

  const subscription = AppState.addEventListener('change', handleAppState);

  return () => subscription.remove();
}
