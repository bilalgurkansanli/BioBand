import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors } from '../../theme/colors';

/** Shared accent for the tutorial (play-along) wizard across instruments. */
export const TUTORIAL_ACCENT = '#FFD54F';

type TutorialSongChipProps = {
  title: string;
};

/** Centered pill showing the selected song above the wizard steps. */
export function TutorialSongChip({ title }: TutorialSongChipProps) {
  return (
    <View style={styles.songChip}>
      <Ionicons color={TUTORIAL_ACCENT} name="musical-note" size={12} />
      <Text numberOfLines={1} style={styles.songChipText}>
        {title}
      </Text>
    </View>
  );
}

type TutorialChoiceRowProps = {
  title: string;
  subtitle?: string;
  icon: keyof typeof Ionicons.glyphMap;
  disabled?: boolean;
  showChevron?: boolean;
  onPress?: () => void;
};

/** Choice card of the tutorial wizard: round icon, title, hint, chevron. */
export function TutorialChoiceRow({
  title,
  subtitle,
  icon,
  disabled = false,
  showChevron = true,
  onPress,
}: TutorialChoiceRowProps) {
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        disabled && styles.rowDisabled,
        pressed && !disabled && styles.pressed,
      ]}
    >
      <View style={[styles.iconWrap, disabled && styles.iconWrapDisabled]}>
        <Ionicons
          color={disabled ? colors.textSecondary : TUTORIAL_ACCENT}
          name={icon}
          size={18}
        />
      </View>

      <View style={styles.rowText}>
        <Text
          numberOfLines={1}
          style={[styles.rowTitle, disabled && styles.rowTitleDisabled]}
        >
          {title}
        </Text>
        {subtitle ? (
          <Text numberOfLines={2} style={styles.rowSubtitle}>
            {subtitle}
          </Text>
        ) : null}
      </View>

      {showChevron ? (
        <Ionicons color={colors.textSecondary} name="chevron-forward" size={18} />
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  songChip: {
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: `${TUTORIAL_ACCENT}22`,
    borderColor: `${TUTORIAL_ACCENT}55`,
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 6,
    marginBottom: 6,
    maxWidth: '100%',
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  songChipText: {
    color: TUTORIAL_ACCENT,
    flexShrink: 1,
    fontSize: 12,
    fontWeight: '700',
  },
  row: {
    alignItems: 'center',
    backgroundColor: colors.surfaceLight,
    borderColor: colors.border,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    minHeight: 52,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  rowDisabled: {
    opacity: 0.55,
  },
  iconWrap: {
    alignItems: 'center',
    backgroundColor: `${TUTORIAL_ACCENT}22`,
    borderRadius: 18,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  iconWrapDisabled: {
    backgroundColor: colors.surface,
  },
  rowText: {
    flex: 1,
    minWidth: 0,
  },
  rowTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
  rowTitleDisabled: {
    color: colors.textSecondary,
  },
  rowSubtitle: {
    color: colors.textSecondary,
    fontSize: 11,
    lineHeight: 15,
    marginTop: 2,
  },
  pressed: {
    opacity: 0.75,
  },
});
