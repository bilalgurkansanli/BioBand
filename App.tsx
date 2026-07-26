import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { StyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { initAudioMode } from './src/audio/initAudio';
import {
  INSTRUMENT_PRELOAD_STEPS,
  preloadInstruments,
} from './src/audio/preloadInstruments';
import { onAuthReset } from './src/auth/authResetSignal';
import { bootstrapAuthAndData } from './src/auth/bootstrap';
import { useAuthSession } from './src/auth/useAuthSession';
import { AppErrorBoundary } from './src/components/AppErrorBoundary';
import { CoachTour } from './src/components/CoachTour';
import { LaunchScreen } from './src/components/LaunchScreen';
import { installGlobalErrorHandlers } from './src/diagnostics/errorReporter';
import { initI18n } from './src/i18n';
import { lockPortraitOrientation } from './src/hooks/usePianoOrientation';
import { RootNavigator } from './src/navigation/RootNavigator';
import { configureNotificationHandler } from './src/notifications/practiceReminder';
import { AuthPromptScreen } from './src/screens/AuthPromptScreen';
import { startAppDataAutoSync, stopAppDataAutoSync } from './src/supabase/appDataSync';
import { configureSystemUi, startSystemUiSync } from './src/system/configureSystemUi';
import { colors } from './src/theme/colors';

// Installed at module scope, before the first component renders: a crash
// during that first render would otherwise happen before any effect could
// have set the handlers up.
installGlobalErrorHandlers();

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

/**
 * Everything sits inside the error boundary, including the launch screen — a
 * throw while the app is still starting up is exactly the case where a blank
 * screen would be least explicable to the user.
 */
export default function App() {
  return (
    <AppErrorBoundary>
      <AppRoot />
    </AppErrorBoundary>
  );
}

function AppRoot() {
  const [isReady, setIsReady] = useState(false);
  /** Instruments warmed so far — the launch screen shows this as a bar. */
  const [instrumentsLoaded, setInstrumentsLoaded] = useState(0);
  // The launch screen is drawn before initI18n() resolves, so its text waits
  // for the catalogue rather than flashing raw key names.
  const [textReady, setTextReady] = useState(false);
  const [showAuthPrompt, setShowAuthPrompt] = useState(false);
  // Sign-out re-shows the auth prompt (language already chosen, so it jumps
  // straight to the sign-in/guest step) instead of silently dropping the
  // user back into a freshly-wiped app.
  const [skipLanguageStep, setSkipLanguageStep] = useState(false);
  // Bumped on sign-out (after local data is wiped) to force the whole
  // navigation tree to unmount/remount — every screen re-reads its state
  // from storage instead of continuing to show the signed-out user's data.
  const [appResetKey, setAppResetKey] = useState(0);
  // Shown on every launch, not just the first: the product decision is that
  // the tour is a welcome rather than a one-off setup step. `markOnboardingSeen`
  // is therefore no longer consulted.
  const [showOnboarding, setShowOnboarding] = useState(true);
  const { getCurrentUserId } = useAuthSession();

  useEffect(() => {
    const stopSystemUiSync = startSystemUiSync();
    try {
      configureNotificationHandler();
    } catch (error) {
      console.warn('Notification handler setup failed:', error);
    }

    Promise.all([
      configureSystemUi(),
      initI18n().then(() => setTextReady(true)),
      initAudioMode(),
      lockPortraitOrientation(),
    ])
      // The first screen is the instrument list, so the instruments have to be
      // playable by the time it appears. Their samples decode alongside the
      // auth/data bootstrap rather than after it — the two do not depend on
      // each other, and overlapping them keeps the launch screen short.
      .then(() =>
        Promise.all([
          bootstrapAuthAndData().then((result) =>
            setShowAuthPrompt(result.showAuthPrompt),
          ),
          preloadInstruments((progress) => setInstrumentsLoaded(progress.loaded)),
        ]),
      )
      .catch((error) => {
        console.error('App initialization failed:', error);
      })
      .finally(() => setIsReady(true));

    return stopSystemUiSync;
  }, []);

  useEffect(() => {
    return onAuthReset(() => {
      setAppResetKey((key) => key + 1);
      setSkipLanguageStep(true);
      setShowAuthPrompt(true);
    });
  }, []);

  useEffect(() => {
    startAppDataAutoSync(getCurrentUserId);
    return stopAppDataAutoSync;
  }, [getCurrentUserId]);

  if (!isReady) {
    return (
      <>
        <LaunchScreen
          progress={Math.min(1, instrumentsLoaded / INSTRUMENT_PRELOAD_STEPS)}
          textReady={textReady}
        />
        <StatusBar style="light" />
      </>
    );
  }

  if (showAuthPrompt) {
    return (
      <SafeAreaProvider style={styles.root}>
        <AuthPromptScreen
          skipLanguageStep={skipLanguageStep}
          onDone={() => setShowAuthPrompt(false)}
        />
        <StatusBar style="light" />
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider style={styles.root}>
      <NavigationContainer key={appResetKey} theme={navigationTheme}>
        <RootNavigator />
        <StatusBar style="light" />
      </NavigationContainer>
      {/* Drawn over the live app so the highlights land on the real tabs. */}
      {showOnboarding ? <CoachTour onDone={() => setShowOnboarding(false)} /> : null}
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: {
    backgroundColor: colors.background,
    flex: 1,
  },
});
