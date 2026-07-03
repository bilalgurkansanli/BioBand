import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors } from '../../theme/colors';

type ViolinNoteCellProps = {
  isActive: boolean;
  isOpenString: boolean;
  onPressIn: () => void;
  onPressOut: () => void;
  size: number;
};

export function ViolinNoteCell({
  isActive,
  isOpenString,
  onPressIn,
  onPressOut,
  size,
}: ViolinNoteCellProps) {
  return (
    <Pressable
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      style={({ pressed }) => [
        styles.cell,
        {
          height: size,
          width: size,
        },
        isOpenString && styles.openString,
        (pressed || isActive) && styles.active,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  cell: {
    backgroundColor: '#4A3520',
    borderColor: '#2A1F12',
    borderRadius: 4,
    borderWidth: 1,
    marginHorizontal: 1,
  },
  openString: {
    backgroundColor: '#5C4228',
    borderColor: colors.accentMuted,
  },
  active: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
});
