import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { ChordBar } from './ChordBar';
import { GuitarStringRow } from './GuitarStringRow';
import { GUITAR_CHORDS, type ChordId } from '../../instruments/guitar/guitarChords';
import { GUITAR_STRINGS, type GuitarStringId } from '../../instruments/guitar/guitarSounds';

type FretboardProps = {
  onPluck: (stringId: GuitarStringId) => void;
  onStrum: (chordId: ChordId) => void;
};

export function Fretboard({ onPluck, onStrum }: FretboardProps) {
  const { t } = useTranslation();

  const chords = GUITAR_CHORDS.map((chord) => ({
    id: chord.id,
    label: t(chord.labelKey),
  }));

  return (
    <View style={styles.container}>
      <ChordBar
        chords={chords}
        onStrum={(id) => onStrum(id as ChordId)}
      />
      <View style={styles.strings}>
        {GUITAR_STRINGS.map((string) => (
          <GuitarStringRow
            key={string.id}
            label={string.label}
            onPluck={() => onPluck(string.id)}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  strings: {
    flex: 1,
    justifyContent: 'space-evenly',
  },
});
