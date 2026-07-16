import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors } from '../../theme/colors';

type PhraseBarProps = {
  phrases: { id: string; label: string }[];
  guidePhraseId?: string | null;
  accent?: string;
  wood?: string;
  strongGuide?: boolean;
  onPlayPhrase: (phraseId: string) => void;
};

export function PhraseBar({
  phrases,
  guidePhraseId = null,
  accent = colors.accent,
  wood = '#5C3A22',
  strongGuide = false,
  onPlayPhrase,
}: PhraseBarProps) {
  return (
    <View style={styles.bar}>
      {phrases.map((phrase) => {
        const isGuide = guidePhraseId === phrase.id;
        return (
          <Pressable
            key={phrase.id}
            onPressIn={() => onPlayPhrase(phrase.id)}
            style={({ pressed }) => [
              styles.phraseButton,
              {
                backgroundColor: wood,
                borderColor: `${accent}88`,
              },
              isGuide && {
                backgroundColor: `${accent}${strongGuide ? '55' : '33'}`,
                borderColor: accent,
                borderWidth: strongGuide ? 2 : 1.5,
              },
              pressed && {
                backgroundColor: accent,
              },
            ]}
          >
            <Text
              style={[
                styles.phraseLabel,
                { color: isGuide ? '#FFF8E8' : '#F0E0C0' },
              ]}
            >
              {phrase.label}
            </Text>
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
    marginBottom: 10,
  },
  phraseButton: {
    borderRadius: 20,
    borderWidth: 1.5,
    minWidth: 76,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  phraseLabel: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.3,
    textAlign: 'center',
  },
});
