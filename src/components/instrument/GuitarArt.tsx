import { Animated, StyleSheet, View } from 'react-native';

import { GUITAR_STRINGS } from '../../instruments/guitar/guitarSounds';
import { tint } from '../../utils/colorMix';

// Nylon (default) voice fretboard palette — mirrors the guitar screen.
const BOARD = '#1C1610';
const STRING_IDLE = '#A89878';
const FRET_WIRE = '#4A3E30';
const NUT_EDGE = '#D4C4A8';
const INLAY = '#3A2E20';
const ACCENT = '#C4A35A';

/** Fret wire x-positions (%) — spacing tightens up the neck like a real one. */
const FRET_XS = [22, 34.5, 46, 56.5, 66, 74.5, 82, 89, 95.5];
/** Inlay dot x-positions (%) — the classic 3/5/7 marker zones. */
const INLAY_XS = [40, 61, 78];
const NUT_X = 8;

/** s6 (low E, thick and wound) at the top → s1 (high e, thin) at the bottom. */
const STRING_THICKNESS = [3.5, 3, 2.6, 2.2, 1.8, 1.5];

type GuitarArtProps = {
  /**
   * Optional pluck animations keyed by sound id (`s6:f3`, `s2:f0`, ...).
   * The string part of the key decides which drawn string vibrates.
   */
  keyAnims?: Map<string, Animated.Value>;
};

function stringAnim(
  keyAnims: Map<string, Animated.Value> | undefined,
  stringId: string,
): Animated.Value | undefined {
  if (!keyAnims) {
    return undefined;
  }
  for (const [key, anim] of keyAnims) {
    if (key === stringId || key.startsWith(`${stringId}:`)) {
      return anim;
    }
  }
  return undefined;
}

/**
 * Decorative horizontal fretboard drawn with plain views, matching the
 * guitar screen's layout and its warm nylon-voice wood palette. Fills its
 * parent — the parent decides size, position, and opacity.
 */
export function GuitarArt({ keyAnims }: GuitarArtProps) {
  return (
    <View pointerEvents="none" style={styles.container}>
      {/* fret wires */}
      {FRET_XS.map((x) => (
        <View key={x} style={[styles.fretWire, { left: `${x}%` }]} />
      ))}

      {/* inlay dots */}
      {INLAY_XS.map((x) => (
        <View key={x} style={[styles.inlay, { left: `${x}%` }]} />
      ))}

      {/* nut */}
      <View style={[styles.nut, { left: `${NUT_X}%` }]} />

      {/* strings — plucked ones thicken and glow in the kit accent */}
      {GUITAR_STRINGS.map((string, index) => {
        const anim = stringAnim(keyAnims, string.id);
        const thickness = STRING_THICKNESS[index];
        // Wound bass strings darker, plain treble strings lighter.
        const wire = index < 3 ? STRING_IDLE : tint(STRING_IDLE, 0.25);
        return (
          <Animated.View
            key={string.id}
            style={[
              styles.stringRow,
              {
                top: `${((index + 0.5) / GUITAR_STRINGS.length) * 100}%`,
                height: thickness,
                marginTop: -thickness / 2,
              },
              anim
                ? {
                    transform: [
                      {
                        scaleY: anim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [1, 2.4],
                        }),
                      },
                    ],
                  }
                : null,
            ]}
          >
            <View style={[styles.stringWire, { backgroundColor: wire }]} />
            {anim ? (
              <Animated.View
                style={[
                  styles.stringGlow,
                  {
                    opacity: anim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, 0.9],
                    }),
                  },
                ]}
              />
            ) : null}
          </Animated.View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: BOARD,
    flex: 1,
  },
  fretWire: {
    bottom: 0,
    position: 'absolute',
    top: 0,
    width: 2,
    backgroundColor: FRET_WIRE,
  },
  inlay: {
    backgroundColor: INLAY,
    borderRadius: 5,
    height: 10,
    marginLeft: -5,
    marginTop: -5,
    position: 'absolute',
    top: '50%',
    width: 10,
  },
  nut: {
    backgroundColor: NUT_EDGE,
    bottom: 0,
    position: 'absolute',
    top: 0,
    width: 4,
  },
  stringRow: {
    left: 0,
    position: 'absolute',
    right: 0,
  },
  stringWire: {
    borderRadius: 2,
    flex: 1,
  },
  stringGlow: {
    backgroundColor: ACCENT,
    borderRadius: 3,
    bottom: -2,
    left: 0,
    position: 'absolute',
    right: 0,
    top: -2,
  },
});
