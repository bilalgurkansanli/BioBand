import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors } from '../theme/colors';

type InstrumentCardProps = {
  title: string;
  description: string;
  actionLabel: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
};

export function InstrumentCard({
  title,
  description,
  actionLabel,
  icon,
  onPress,
}: InstrumentCardProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={styles.iconWrap}>
        <Ionicons color={colors.accent} name={icon} size={28} />
      </View>
      <View style={styles.content}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.description}>{description}</Text>
        <Text style={styles.action}>{actionLabel}</Text>
      </View>
      <Ionicons color={colors.textSecondary} name="chevron-forward" size={20} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    marginBottom: 12,
    padding: 16,
  },
  pressed: {
    opacity: 0.85,
  },
  iconWrap: {
    alignItems: 'center',
    backgroundColor: colors.surfaceLight,
    borderRadius: 10,
    height: 52,
    justifyContent: 'center',
    marginRight: 14,
    width: 52,
  },
  content: {
    flex: 1,
  },
  title: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  description: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
  },
  action: {
    color: colors.accent,
    fontSize: 13,
    fontWeight: '600',
  },
});
