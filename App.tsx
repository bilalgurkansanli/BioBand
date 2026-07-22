import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { initAudioMode } from './src/audio/initAudio';
import { initI18n } from './src/i18n';
import { lockPortraitOrientation } from './src/hooks/usePianoOrientation';
import { RootNavigator } from './src/navigation/RootNavigator';
import { configureNotificationHandler } from './src/notifications/practiceReminder';
import { configureSystemUi, startSystemUiSync } from './src/system/configureSystemUi';
import { colors } from './src/theme/colors';

const navigationTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: colors.background,
    card: colors.surface,
    primary: colors.accent,
    text: colors.text,
    border: colors.border,
  },
};

export default function App() {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const stopSystemUiSync = startSystemUiSync();
    try {
      configureNotificationHandler();
    } catch (error) {
      console.warn('Notification handler setup failed:', error);
    }

    Promise.all([configureSystemUi(), initI18n(), initAudioMode(), lockPortraitOrientation()])
      .catch((error) => {
        console.error('App initialization failed:', error);
      })
      .finally(() => setIsReady(true));

    return stopSystemUiSync;
  }, []);

  if (!isReady) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.accent} size="large" />
        <StatusBar style="light" />
      </View>
    );
  }

  return (
    <SafeAreaProvider style={styles.root}>
      <NavigationContainer theme={navigationTheme}>
        <RootNavigator />
        <StatusBar style="light" />
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: {
    backgroundColor: colors.background,
    flex: 1,
  },
  loading: {
    alignItems: 'center',
    backgroundColor: colors.background,
    flex: 1,
    justifyContent: 'center',
  },
});
