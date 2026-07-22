import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { initAudioMode } from './src/audio/initAudio';
import { bootstrapAuthAndData } from './src/auth/bootstrap';
import { useAuthSession } from './src/auth/useAuthSession';
import { initI18n } from './src/i18n';
import { lockPortraitOrientation } from './src/hooks/usePianoOrientation';
import { RootNavigator } from './src/navigation/RootNavigator';
import { configureNotificationHandler } from './src/notifications/practiceReminder';
import { AuthPromptScreen } from './src/screens/AuthPromptScreen';
import { startAppDataAutoSync, stopAppDataAutoSync } from './src/supabase/appDataSync';
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
  const [showAuthPrompt, setShowAuthPrompt] = useState(false);
  const { getCurrentUserId } = useAuthSession();

  useEffect(() => {
    const stopSystemUiSync = startSystemUiSync();
    try {
      configureNotificationHandler();
    } catch (error) {
      console.warn('Notification handler setup failed:', error);
    }

    Promise.all([configureSystemUi(), initI18n(), initAudioMode(), lockPortraitOrientation()])
      .then(() => bootstrapAuthAndData())
      .then((result) => setShowAuthPrompt(result.showAuthPrompt))
      .catch((error) => {
        console.error('App initialization failed:', error);
      })
      .finally(() => setIsReady(true));

    return stopSystemUiSync;
  }, []);

  useEffect(() => {
    startAppDataAutoSync(getCurrentUserId);
    return stopAppDataAutoSync;
  }, [getCurrentUserId]);

  if (!isReady) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.accent} size="large" />
        <StatusBar style="light" />
      </View>
    );
  }

  if (showAuthPrompt) {
    return (
      <SafeAreaProvider style={styles.root}>
        <AuthPromptScreen onDone={() => setShowAuthPrompt(false)} />
        <StatusBar style="light" />
      </SafeAreaProvider>
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
