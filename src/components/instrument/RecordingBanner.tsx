import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { colors } from '../../theme/colors';
import type { RecordingMode } from '../../types/recording';

type RecordingBannerProps = {
  isRecording: boolean;
  mode: RecordingMode | null;
  /** Beats left in the count-in, or null when one isn't running. */
  countInBeat?: number | null;
};

export function RecordingBanner({ isRecording, mode, countInBeat = null }: RecordingBannerProps) {
  const { t } = useTranslation();

  // The count-in owns the banner before recording starts: the same strip
  // changing from "get ready, 4" to "recording" is the whole story in one
  // place, instead of a second element appearing somewhere else.
  if (countInBeat !== null) {
    return (
      <View style={[styles.banner, styles.countInBanner]}>
        <Text style={styles.countInNumber}>{countInBeat}</Text>
        <Text style={styles.message}>{t('recording.countIn')}</Text>
      </View>
    );
  }

  if (!isRecording || !mode) {
    return null;
  }

  const messageKey =
    mode === 'instrument' ? 'recording.banner.instrument' : 'recording.banner.microphone';

  return (
    <View style={styles.banner}>
      <View style={styles.dot} />
      <Text style={styles.message}>{t(messageKey)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    alignItems: 'center',
    backgroundColor: colors.surfaceLight,
    borderColor: colors.error,
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    marginBottom: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  countInBanner: {
    // Accent, not the recording red: nothing is being captured yet.
    borderColor: colors.accent,
  },
  countInNumber: {
    color: colors.accent,
    fontSize: 20,
    fontVariant: ['tabular-nums'],
    fontWeight: '700',
    // Fixed width so the strip does not twitch as the digits change.
    minWidth: 22,
    textAlign: 'center',
  },
  dot: {
    backgroundColor: colors.error,
    borderRadius: 5,
    height: 10,
    width: 10,
  },
  message: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '600',
  },
});
