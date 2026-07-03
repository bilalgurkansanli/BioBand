import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors } from '../../theme/colors';

type ChordBarProps = {
  chords: { id: string; label: string }[];
  onStrum: (chordId: string) => void;
};

export function ChordBar({ chords, onStrum }: ChordBarProps) {
  return (
    <View style={styles.bar}>
      {chords.map((chord) => (
        <Pressable
          key={chord.id}
          onPressIn={() => onStrum(chord.id)}
          style={({ pressed }) => [styles.chordButton, pressed && styles.pressed]}
        >
          <Text style={styles.chordLabel}>{chord.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
    marginBottom: 8,
  },
  chordButton: {
    backgroundColor: colors.surfaceLight,
    borderColor: colors.accent,
    borderRadius: 8,
    borderWidth: 1,
    minWidth: 52,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  pressed: {
    backgroundColor: colors.accent,
  },
  chordLabel: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
});
