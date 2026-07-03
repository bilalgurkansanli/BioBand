import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { colors } from '../../theme/colors';

type LandscapeOverlayProps = {
  visible: boolean;
  titleKey?: string;
  hintKey?: string;
};

export function LandscapeOverlay({
  visible,
  titleKey = 'instruments.landscapeRequired',
  hintKey = 'instruments.landscapeHint',
}: LandscapeOverlayProps) {
  const { t } = useTranslation();

  if (!visible) {
    return null;
  }

  return (
    <View pointerEvents="auto" style={styles.overlay}>
      <Text style={styles.icon}>↻</Text>
      <Text style={styles.title}>{t(titleKey)}</Text>
      <Text style={styles.subtitle}>{t(hintKey)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    backgroundColor: colors.background,
    justifyContent: 'center',
    padding: 32,
    zIndex: 100,
  },
  icon: {
    color: colors.accent,
    fontSize: 48,
    marginBottom: 16,
  },
  title: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
});
