import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors } from '../../theme/colors';

type ModalChromeHeaderProps = {
  title: string;
  closeLabel: string;
  onClose: () => void;
  /** When set, shows a back chevron on the left. */
  backLabel?: string;
  onBack?: () => void;
  /** Small label shown next to the title (e.g. "Beta"). */
  badge?: string;
};

export function ModalChromeHeader({
  title,
  closeLabel,
  onClose,
  backLabel,
  onBack,
  badge,
}: ModalChromeHeaderProps) {
  const showBack = Boolean(onBack);

  return (
    <View style={styles.bar}>
      {showBack ? (
        <Pressable
          accessibilityLabel={backLabel}
          accessibilityRole="button"
          hitSlop={8}
          onPress={onBack}
          style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}
        >
          <Ionicons color={colors.text} name="chevron-back" size={22} />
        </Pressable>
      ) : (
        <View style={styles.spacer} />
      )}

      <View style={styles.titleRow}>
        <Text numberOfLines={1} style={styles.title}>
          {title}
        </Text>
        {badge ? (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{badge}</Text>
          </View>
        ) : null}
      </View>

      <Pressable
        accessibilityLabel={closeLabel}
        accessibilityRole="button"
        hitSlop={8}
        onPress={onClose}
        style={({ pressed }) => [
          styles.iconButton,
          styles.closeButton,
          pressed && styles.pressed,
        ]}
      >
        <View style={styles.closeIconSlot} pointerEvents="none">
          <Ionicons
            color="#FFFFFF"
            name="close"
            size={20}
            style={styles.closeIcon}
          />
        </View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    alignItems: 'center',
    flexDirection: 'row',
    marginBottom: 10,
    minHeight: 36,
  },
  iconButton: {
    alignItems: 'center',
    borderRadius: 18,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  closeButton: {
    backgroundColor: colors.error,
    overflow: 'hidden',
  },
  closeIconSlot: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeIcon: {
    includeFontPadding: false,
    textAlign: 'center',
    // Ionicons "close" glyph sits slightly low/right; nudge to optical center.
    transform: [{ translateX: -0.5 }, { translateY: -0.5 }],
  },
  spacer: {
    height: 36,
    width: 36,
  },
  titleRow: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    marginHorizontal: 8,
    minWidth: 0,
  },
  title: {
    color: colors.text,
    flexShrink: 1,
    fontSize: 17,
    fontWeight: '700',
    textAlign: 'center',
  },
  badge: {
    backgroundColor: colors.accentMuted,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  badgeText: {
    color: colors.text,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  pressed: {
    opacity: 0.75,
  },
});
