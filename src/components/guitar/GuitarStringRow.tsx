import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors } from '../../theme/colors';

type GuitarStringRowProps = {
  label: string;
  onPluck: () => void;
};

export function GuitarStringRow({ label, onPluck }: GuitarStringRowProps) {
  return (
    <Pressable
      onPressIn={onPluck}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <Text style={styles.label}>{label}</Text>
      <View style={styles.line} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 6,
  },
  pressed: {
    opacity: 0.7,
  },
  label: {
    color: colors.accent,
    fontSize: 16,
    fontWeight: '700',
    width: 20,
  },
  line: {
    backgroundColor: colors.textSecondary,
    borderRadius: 1,
    flex: 1,
    height: 2,
  },
});
