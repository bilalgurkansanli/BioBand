import { StyleSheet, Text, View } from 'react-native';

import type { GuitarFretboardColors } from '../../instruments/guitar/guitarVoices';
import { GUITAR_MAX_FRET } from '../../instruments/guitar/guitarSounds';
import { colors } from '../../theme/colors';

type GuitarStringRowProps = {
  label: string;
  stringThickness: number;
  showFretNumbers: boolean;
  guideFret: number | null;
  /** Frets currently held by a finger on this string. */
  activeFrets: ReadonlySet<number>;
  /** Chord-shape frets to show as finger dots (`null` = muted string). */
  chordFret: number | null | undefined;
  /** True when a chord is armed and this string is muted in the shape. */
  chordMuted?: boolean;
  /** Index-finger barre fret for barre shapes (visual guide). */
  barreFret?: number | null;
  strongGuide: boolean;
  accent: string;
  fretboard: GuitarFretboardColors;
};

const FRET_MARKERS = new Set([3, 5, 7, 9, 12]);

export function GuitarStringRow({
  label,
  stringThickness,
  showFretNumbers,
  guideFret,
  activeFrets,
  chordFret,
  chordMuted = false,
  barreFret = null,
  strongGuide,
  accent,
  fretboard,
}: GuitarStringRowProps) {
  const frets = Array.from({ length: GUITAR_MAX_FRET + 1 }, (_, i) => i);

  return (
    <View pointerEvents="none" style={[styles.row, chordMuted && styles.rowMuted]}>
      <Text style={[styles.label, { color: accent }, chordMuted && styles.labelMuted]}>
        {label}
      </Text>
      <View style={[styles.frets, { backgroundColor: fretboard.board }]}>
        {frets.map((fret) => {
          const isGuide = guideFret === fret;
          const isActive = activeFrets.has(fret);
          const isNut = fret === 0;
          const isBarreCell =
            !chordMuted &&
            barreFret != null &&
            chordFret != null &&
            fret === barreFret &&
            chordFret >= barreFret;
          // Finger dots: open circles, frets above the barre, or full shape when no barre.
          const isFingerDot =
            chordFret === fret &&
            (barreFret == null || fret === 0 || fret > barreFret);
          const isShapeCell = isFingerDot || isBarreCell;
          return (
            <View
              key={fret}
              style={[
                styles.cell,
                { borderColor: fretboard.cellBorder },
                isNut && {
                  backgroundColor: fretboard.nut,
                  borderRightColor: fretboard.nutEdge,
                  borderRightWidth: 3,
                },
                FRET_MARKERS.has(fret) && !isNut && {
                  backgroundColor: fretboard.marker,
                },
                isGuide && {
                  backgroundColor: strongGuide ? `${accent}66` : `${accent}33`,
                  borderColor: accent,
                  borderWidth: strongGuide ? 2 : 1,
                },
                isShapeCell && !isActive && {
                  backgroundColor: `${accent}28`,
                },
                isActive && {
                  backgroundColor: `${accent}55`,
                },
              ]}
            >
              <View
                style={[
                  styles.stringLine,
                  {
                    height: stringThickness,
                    backgroundColor:
                      isActive || isShapeCell ? accent : fretboard.stringIdle,
                    opacity: chordMuted ? 0.25 : 1,
                  },
                ]}
              />
              {isBarreCell ? (
                <View
                  style={[
                    styles.barreMark,
                    {
                      backgroundColor: accent,
                      borderColor: '#111',
                    },
                  ]}
                />
              ) : null}
              {isFingerDot ? (
                <View
                  style={[
                    styles.chordDot,
                    {
                      backgroundColor: accent,
                      borderColor: '#111',
                    },
                    fret === 0 && styles.openDot,
                  ]}
                />
              ) : null}
              {chordMuted && isNut ? (
                <Text style={styles.muteMark}>×</Text>
              ) : null}
              {showFretNumbers && !isShapeCell ? (
                <Text style={styles.fretNumber}>{fret === 0 ? 'O' : String(fret)}</Text>
              ) : null}
            </View>
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
  rowMuted: {
    opacity: 0.85,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
    width: 18,
  },
  labelMuted: {
    opacity: 0.45,
  },
  frets: {
    flex: 1,
    flexDirection: 'row',
    height: '100%',
  },
  cell: {
    alignItems: 'center',
    borderRightWidth: 1,
    flex: 1,
    justifyContent: 'center',
    minWidth: 0,
  },
  stringLine: {
    borderRadius: 1,
    width: '90%',
  },
  chordDot: {
    borderRadius: 8,
    borderWidth: 1,
    height: 14,
    position: 'absolute',
    width: 14,
  },
  /** Index-finger barre segment (reads as a flat across the fret). */
  barreMark: {
    borderRadius: 3,
    borderWidth: 1,
    height: 10,
    position: 'absolute',
    width: '72%',
  },
  openDot: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    height: 12,
    width: 12,
  },
  muteMark: {
    color: '#FF6B6B',
    fontSize: 14,
    fontWeight: '800',
    position: 'absolute',
  },
  fretNumber: {
    bottom: 1,
    color: colors.textSecondary,
    fontSize: 8,
    position: 'absolute',
  },
});
