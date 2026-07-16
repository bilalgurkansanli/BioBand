import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import {
  GUITAR_CHORD_PLAY_MODES,
  type GuitarChordPlayMode,
} from '../../instruments/guitar/guitarChordPatterns';
import { colors } from '../../theme/colors';

type ChordPlayModeBarProps = {
  mode: GuitarChordPlayMode;
  onChange: (mode: GuitarChordPlayMode) => void;
  /** Modes shown on the bar; defaults to all. */
  visibleModes?: readonly GuitarChordPlayMode[];
  accent?: string;
};

const MODE_LABEL_KEY: Record<GuitarChordPlayMode, string> = {
  strum: 'guitar.playModes.strum',
  arpeggio: 'guitar.playModes.arpeggio',
  rasgueado: 'guitar.playModes.rasgueado',
};

export function ChordPlayModeBar({
  mode,
  onChange,
  visibleModes = GUITAR_CHORD_PLAY_MODES,
  accent = colors.accent,
}: ChordPlayModeBarProps) {
  const { t } = useTranslation();
  const modes = GUITAR_CHORD_PLAY_MODES.filter((id) => visibleModes.includes(id));

  if (modes.length === 0) {
    return null;
  }

  return (
    <View style={styles.bar}>
      {modes.map((id) => {
        const selected = mode === id;
        return (
          <Pressable
            key={id}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            onPress={() => onChange(id)}
            style={({ pressed }) => [
              styles.button,
              {
                borderColor: selected ? accent : `${accent}66`,
                backgroundColor: selected ? accent : `${accent}12`,
              },
              pressed && styles.pressed,
            ]}
          >
            <Text
              numberOfLines={1}
              style={[
                styles.label,
                { color: selected ? '#111111' : accent },
              ]}
            >
              {t(MODE_LABEL_KEY[id])}
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
    gap: 4,
    marginBottom: 4,
  },
  button: {
    alignItems: 'center',
    borderRadius: 7,
    borderWidth: 1,
    flex: 1,
    justifyContent: 'center',
    minWidth: 0,
    paddingHorizontal: 4,
    paddingVertical: 5,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
  },
  pressed: {
    opacity: 0.8,
  },
});
