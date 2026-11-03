import * as NavigationBar from 'expo-navigation-bar';
import * as SystemUI from 'expo-system-ui';
import { AppState, Platform, type AppStateStatus } from 'react-native';

import { colors } from '../theme/colors';

/**
 * Android is edge-to-edge: both system bars are transparent over the app, so
 * their colour is simply our background and only the *button* colour is ours
 * to choose. The initial values come from the expo-navigation-bar and
 * expo-status-bar plugins in app.json; this re-asserts them at runtime.
 *
 * The bar-colour setters this used to call were removed in SDK 57. Calling a
 * function that no longer exists threw, and because this runs inside the
 * launch `Promise.all`, that throw would have skipped the auth bootstrap and
 * the instrument preload — so nothing here may reject.
 */
export async function configureSystemUi(): Promise<void> {
  try {
    await SystemUI.setBackgroundColorAsync(colors.background);
  } catch (error) {
    console.warn('System UI background could not be set:', error);
  }

  if (Platform.OS === 'android') {
    // 'light' means light buttons, for the dark background behind them.
    NavigationBar.setStyle('light');
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
