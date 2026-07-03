import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { colors } from '../../theme/colors';
import type { RecordingMode } from '../../types/recording';

type RecordingBannerProps = {
  isRecording: boolean;
  mode: RecordingMode | null;
};

export function RecordingBanner({ isRecording, mode }: RecordingBannerProps) {
  const { t } = useTranslation();

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
