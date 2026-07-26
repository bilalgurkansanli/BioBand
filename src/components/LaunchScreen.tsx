import { useState } from 'react';
import { ActivityIndicator, Image, StyleSheet, Text, View } from 'react-native';

import i18n from '../i18n';
import { colors } from '../theme/colors';

type Props = {
  /**
   * 0..1. Omit when there is nothing countable to wait for — the spinner
   * carries it instead, and a bar that cannot move is worse than no bar.
   */
  progress?: number;
  /**
   * Held false until the translation catalogue has loaded, so the screen shows
   * nothing rather than raw key names. Startup draws this before i18n resolves.
   */
  textReady?: boolean;
  /** Overrides the "Loading…" line — the sign-in pass says something else. */
  label?: string;
};

/**
 * The branded waiting screen: logo, greeting, progress and a quote.
 *
 * Shared rather than duplicated, because it now appears twice — once while the
 * instruments warm up at startup, and once while a sign-in and its cloud sync
 * complete. Those are the two places where the app genuinely makes someone
 * wait, and they should look like the same app.
 */
export function LaunchScreen({ progress, textReady = true, label }: Props) {
  // Chosen once per mount so it cannot shuffle while the user is reading it.
  const [quoteSeed] = useState(() => Math.floor(Math.random() * 1000));

  const quotes = textReady
    ? (i18n.t('launch.quotes', { returnObjects: true }) as unknown)
    : null;
  const quote =
    Array.isArray(quotes) && quotes.length > 0
      ? (quotes[quoteSeed % quotes.length] as { text?: string; author?: string })
      : null;

  return (
    <View style={styles.root}>
      {/* Logo and greeting travel together as the top band. */}
      <View style={styles.header}>
        <Image
          source={require('../../assets/logo.png')}
          style={styles.logo}
          resizeMode="contain"
          // Fading it in would read as a stutter rather than as polish.
          fadeDuration={0}
        />
        {textReady ? <Text style={styles.welcome}>{i18n.t('launch.welcome')}</Text> : null}
      </View>

      <View style={styles.centre}>
        <ActivityIndicator color={colors.accent} size="large" />
        {progress !== undefined ? (
          <View style={styles.progressTrack}>
            <View
              style={[styles.progressFill, { width: `${Math.round(progress * 100)}%` }]}
            />
          </View>
        ) : null}
        {textReady ? (
          <Text style={[styles.label, progress === undefined && styles.labelNoBar]}>
            {label ?? i18n.t('launch.title')}
          </Text>
        ) : null}
      </View>

      {quote?.text ? (
        <View style={styles.quoteBlock}>
          <Text style={styles.quote}>{quote.text}</Text>
          {quote.author ? <Text style={styles.quoteAuthor}>— {quote.author}</Text> : null}
        </View>
      ) : (
        <View style={styles.quoteBlock} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  // Logo up top, the spinner and bar taking the middle, the quote resting at
  // the bottom — three bands rather than one centred stack.
  root: {
    alignItems: 'center',
    backgroundColor: '#000000',
    flex: 1,
    justifyContent: 'space-between',
    paddingBottom: 56,
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
  centre: {
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
  label: {
    color: colors.text,
    fontSize: 20,
    letterSpacing: 0.5,
    marginTop: 18,
  },
  labelNoBar: {
    marginTop: 26,
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
