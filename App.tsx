import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { initAudioMode } from './src/audio/initAudio';
import {
  INSTRUMENT_PRELOAD_STEPS,
  preloadInstruments,
} from './src/audio/preloadInstruments';
import { onAuthReset } from './src/auth/authResetSignal';
import { bootstrapAuthAndData } from './src/auth/bootstrap';
import { useAuthSession } from './src/auth/useAuthSession';
import i18n, { initI18n } from './src/i18n';
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
  /** Instruments warmed so far — the launch screen shows this as a bar. */
  const [instrumentsLoaded, setInstrumentsLoaded] = useState(0);
  // The launch screen is drawn before initI18n() resolves, so its text waits
  // for the catalogue rather than flashing raw key names.
  const [textReady, setTextReady] = useState(false);
  /** One quote per launch, chosen once so it does not shuffle mid-load. */
  const [quoteSeed] = useState(() => Math.floor(Math.random() * 1000));
  const [showAuthPrompt, setShowAuthPrompt] = useState(false);
  // Sign-out re-shows the auth prompt (language already chosen, so it jumps
  // straight to the sign-in/guest step) instead of silently dropping the
  // user back into a freshly-wiped app.
  const [skipLanguageStep, setSkipLanguageStep] = useState(false);
  // Bumped on sign-out (after local data is wiped) to force the whole
  // navigation tree to unmount/remount — every screen re-reads its state
  // from storage instead of continuing to show the signed-out user's data.
  const [appResetKey, setAppResetKey] = useState(0);
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
    const progress = Math.min(1, instrumentsLoaded / INSTRUMENT_PRELOAD_STEPS);
    const quotes = textReady
      ? (i18n.t('launch.quotes', { returnObjects: true }) as unknown)
      : null;
    const quote =
      Array.isArray(quotes) && quotes.length > 0
        ? (quotes[quoteSeed % quotes.length] as { text?: string; author?: string })
        : null;
    return (
      <View style={styles.loading}>
        {/* Logo and greeting travel together as the top band. */}
        <View style={styles.header}>
          <Image
            source={require('./assets/logo.png')}
            style={styles.logo}
            resizeMode="contain"
            // The launch screen is the first thing drawn; fading it in would
            // read as a stutter rather than as polish.
            fadeDuration={0}
          />
          {textReady ? (
            <Text style={styles.welcome}>{i18n.t('launch.welcome')}</Text>
          ) : null}
        </View>

        <View style={styles.loadingCentre}>
          <ActivityIndicator color={colors.accent} size="large" />
          <View style={styles.progressTrack}>
            <View
              style={[styles.progressFill, { width: `${Math.round(progress * 100)}%` }]}
            />
          </View>
          {textReady ? (
            <Text style={styles.loadingLabel}>{i18n.t('launch.title')}</Text>
          ) : null}
        </View>

        {quote?.text ? (
          <View style={styles.quoteBlock}>
            <Text style={styles.quote}>{quote.text}</Text>
            {quote.author ? (
              <Text style={styles.quoteAuthor}>— {quote.author}</Text>
            ) : null}
          </View>
        ) : (
          <View style={styles.quoteBlock} />
        )}
        <StatusBar style="light" />
      </View>
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
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: {
    backgroundColor: colors.background,
    flex: 1,
  },
  // Logo up top, the spinner and bar taking the middle, the quote resting at
  // the bottom — three bands rather than one centred stack.
  loading: {
    alignItems: 'center',
    backgroundColor: '#000000',
    flex: 1,
    justifyContent: 'space-between',
    paddingBottom: 56,
    // Trimmed again as the greeting joined the logo, so the three bands still
    // fit a short screen.
    paddingTop: 56,
  },
  header: {
    alignItems: 'center',
  },
  logo: {
    height: 290,
    width: 290,
  },
  welcome: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '600',
    marginTop: 14,
    paddingHorizontal: 24,
    textAlign: 'center',
  },
  loadingCentre: {
    alignItems: 'center',
    // Nudges the spinner and bar up off the centre line.
    marginBottom: 40,
  },
  progressTrack: {
    backgroundColor: colors.border,
    borderRadius: 3,
    height: 6,
    marginTop: 26,
    overflow: 'hidden',
    width: 220,
  },
  progressFill: {
    backgroundColor: colors.accent,
    height: '100%',
  },
  loadingLabel: {
    color: colors.text,
    fontSize: 20,
    letterSpacing: 0.5,
    marginTop: 18,
  },
  quoteBlock: {
    alignItems: 'center',
    maxWidth: 340,
    paddingHorizontal: 24,
  },
  quote: {
    color: colors.text,
    fontSize: 18,
    fontStyle: 'italic',
    lineHeight: 27,
    textAlign: 'center',
  },
  quoteAuthor: {
    color: colors.text,
    fontSize: 15,
    marginTop: 12,
    opacity: 0.7,
    textAlign: 'center',
  },
});
