import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { colors } from '../../theme/colors';

type Props = {
  projectTitle: string;
  countdown: number | null;
  onCancel: () => void;
};

export function StudioOverdubBanner({ projectTitle, countdown, onCancel }: Props) {
  const { t } = useTranslation();

  return (
    <View style={styles.banner}>
      <View style={styles.textWrap}>
        {countdown !== null ? (
          <Text style={styles.countdown}>{t('studio.overdubCountdown', { count: countdown })}</Text>
        ) : (
          <Text style={styles.message}>
            {t('studio.overdubBanner', { title: projectTitle })}
          </Text>
        )}
      </View>
      <Pressable onPress={onCancel} style={styles.cancel}>
        <Text style={styles.cancelText}>{t('studio.cancelOverdub')}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    alignItems: 'center',
    backgroundColor: colors.surfaceLight,
    borderColor: colors.accent,
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 8,
    marginBottom: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  textWrap: {
    flex: 1,
  },
  message: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '600',
  },
  countdown: {
    color: colors.accent,
    fontSize: 28,
    fontWeight: '800',
    textAlign: 'center',
  },
  cancel: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  cancelText: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '600',
  },
});
