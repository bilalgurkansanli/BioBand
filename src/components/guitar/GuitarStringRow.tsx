import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors } from '../../theme/colors';
import { GUITAR_MAX_FRET } from '../../instruments/guitar/guitarSounds';

type GuitarStringRowProps = {
  label: string;
  stringThickness: number;
  showFretNumbers: boolean;
  /** Fret 0..12 currently guided, or null. */
  guideFret: number | null;
  strongGuide: boolean;
  accent: string;
  onPluck: (fret: number) => void;
};

const FRET_MARKERS = new Set([3, 5, 7, 9, 12]);

export function GuitarStringRow({
  label,
  stringThickness,
  showFretNumbers,
  guideFret,
  strongGuide,
  accent,
  onPluck,
}: GuitarStringRowProps) {
  const frets = Array.from({ length: GUITAR_MAX_FRET + 1 }, (_, i) => i);

  return (
    <View style={styles.row}>
      <Text style={[styles.label, { color: accent }]}>{label}</Text>
      <View style={styles.frets}>
        {frets.map((fret) => {
          const isGuide = guideFret === fret;
          const isNut = fret === 0;
          return (
            <Pressable
              key={fret}
              onPressIn={() => onPluck(fret)}
              style={({ pressed }) => [
                styles.cell,
                isNut && styles.nutCell,
                FRET_MARKERS.has(fret) && styles.markerCell,
                isGuide && {
                  backgroundColor: strongGuide ? `${accent}66` : `${accent}33`,
                  borderColor: accent,
                  borderWidth: strongGuide ? 2 : 1,
                },
                pressed && styles.pressed,
              ]}
            >
              <View
                style={[
                  styles.stringLine,
                  { height: stringThickness, backgroundColor: colors.textSecondary },
                ]}
              />
              {showFretNumbers ? (
                <Text style={styles.fretNumber}>{fret === 0 ? 'O' : String(fret)}</Text>
              ) : null}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    gap: 6,
    minHeight: 28,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
    width: 18,
  },
  frets: {
    flex: 1,
    flexDirection: 'row',
    height: '100%',
  },
  cell: {
    alignItems: 'center',
    borderColor: '#2A2A2E',
    borderRightWidth: 1,
    flex: 1,
    justifyContent: 'center',
    minWidth: 0,
  },
  nutCell: {
    backgroundColor: '#1A1A1C',
    borderRightColor: '#C8C8C8',
    borderRightWidth: 3,
  },
  markerCell: {
    backgroundColor: '#1C1C20',
  },
  stringLine: {
    borderRadius: 1,
    width: '90%',
  },
  fretNumber: {
    bottom: 1,
    color: colors.textSecondary,
    fontSize: 8,
    position: 'absolute',
  },
  pressed: {
    backgroundColor: '#2C2C30',
    opacity: 0.85,
  },
});
