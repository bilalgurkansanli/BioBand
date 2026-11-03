import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { colors } from '../../theme/colors';

type LandscapeOverlayProps = {
  visible: boolean;
  titleKey?: string;
  hintKey?: string;
  /**
   * Leaves the screen. Shown as a back button over the prompt.
   *
   * Rotating used to be the only way past this overlay, which is fine on a
   * phone that obeys the landscape lock. Android 16 ignores orientation locks
   * on large screens, so a tablet or foldable held upright stayed portrait —
   * and the overlay covered the toolbar's back button with nothing in its
   * place. The overlay must be rendered outside any `pointerEvents="none"`
   * ancestor for this button to take a tap.
   */
  onBack?: () => void;
};

export function LandscapeOverlay({
  visible,
  titleKey = 'instruments.landscapeRequired',
  hintKey = 'instruments.landscapeHint',
  onBack,
}: LandscapeOverlayProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  if (!visible) {
    return null;
  }

  return (
    <View pointerEvents="auto" style={styles.overlay}>
      {onBack ? (
        <Pressable
          accessibilityLabel={t('common.back')}
          accessibilityRole="button"
          hitSlop={8}
          onPress={onBack}
          style={({ pressed }) => [
            styles.backButton,
            { left: insets.left + 12, top: insets.top + 8 },
            pressed && styles.pressed,
          ]}
        >
          <Ionicons color={colors.text} name="chevron-back" size={24} />
          <Text style={styles.backText}>{t('common.back')}</Text>
        </Pressable>
      ) : null}
      <Text style={styles.icon}>↻</Text>
      <Text accessibilityRole="header" style={styles.title}>
        {t(titleKey)}
      </Text>
      <Text style={styles.subtitle}>{t(hintKey)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    backgroundColor: colors.background,
    justifyContent: 'center',
    padding: 32,
    zIndex: 100,
  },
  backButton: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 2,
    paddingRight: 8,
    paddingVertical: 6,
    position: 'absolute',
  },
  backText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  pressed: {
    opacity: 0.6,
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
