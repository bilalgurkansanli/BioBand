import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors } from '../../theme/colors';

type PhraseBarProps = {
  phrases: { id: string; label: string }[];
  onPlayPhrase: (phraseId: string) => void;
};

export function PhraseBar({ phrases, onPlayPhrase }: PhraseBarProps) {
  return (
    <View style={styles.bar}>
      {phrases.map((phrase) => (
        <Pressable
          key={phrase.id}
          onPressIn={() => onPlayPhrase(phrase.id)}
          style={({ pressed }) => [styles.phraseButton, pressed && styles.pressed]}
        >
          <Text style={styles.phraseLabel}>{phrase.label}</Text>
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
  phraseButton: {
    backgroundColor: colors.surfaceLight,
    borderColor: colors.accent,
    borderRadius: 8,
    borderWidth: 1,
    minWidth: 72,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  pressed: {
    backgroundColor: colors.accent,
  },
  phraseLabel: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },
});
