import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors } from '../../theme/colors';

type ChordBarProps = {
  chords: { id: string; label: string }[];
  onStrum: (chordId: string) => void;
  guideChordId?: string | null;
  strongGuide?: boolean;
  accent?: string;
};

export function ChordBar({
  chords,
  onStrum,
  guideChordId = null,
  strongGuide = true,
  accent = colors.accent,
}: ChordBarProps) {
  return (
    <View style={styles.bar}>
      {chords.map((chord) => {
        const isGuide = guideChordId === chord.id;
        return (
          <Pressable
            key={chord.id}
            onPressIn={() => onStrum(chord.id)}
            style={({ pressed }) => [
              styles.chordButton,
              { borderColor: accent },
              isGuide && {
                backgroundColor: strongGuide ? `${accent}88` : `${accent}44`,
                borderWidth: strongGuide ? 2 : 1,
              },
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.chordLabel}>{chord.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
    marginBottom: 6,
  },
  chordButton: {
    backgroundColor: colors.surfaceLight,
    borderRadius: 8,
    borderWidth: 1,
    minWidth: 52,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  pressed: {
    opacity: 0.75,
  },
  chordLabel: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center',
  },
});
