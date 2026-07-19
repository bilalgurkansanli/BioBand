import { Animated, StyleSheet, View } from 'react-native';

import { VIOLIN_STRINGS } from '../../instruments/violin/violinSounds';

// Classic voice fingerboard palette — mirrors the violin screen.
const BOARD = '#14110E';
const WOOD_EDGE = '#8B5A32';
const NUT = '#E8DCC8';
const BRIDGE = '#6B4428';
const STRING_IDLE = '#C8B896';
const POSITION_DOT = '#2A2420';
const ACCENT = '#D4AF6A';

const NUT_X = 8;
const BRIDGE_X = 88;
/** Soft finger-position guide dots — no frets, violins are fretless. */
const DOT_XS = [26, 44, 62];

/** Player view like the screen: thin E on top, thick G at the bottom. */
const STRING_THICKNESS = [1.6, 2.1, 2.7, 3.4];

type ViolinArtProps = {
  /**
   * Optional bow animations keyed by sound id (`v4:0`, `v1:0`, ...). The
   * string part of the key decides which drawn string sings.
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
 * Decorative violin fingerboard drawn with plain views — ebony board in a
 * maple rim, bone nut, bridge, position dots, and the four strings (no
 * frets). Matches the violin screen's classic-voice look. Fills its parent —
 * the parent decides size, position, and opacity.
 */
export function ViolinArt({ keyAnims }: ViolinArtProps) {
  return (
    <View pointerEvents="none" style={styles.container}>
      {/* position guide dots */}
      {DOT_XS.map((x) => (
        <View key={x} style={[styles.positionDot, { left: `${x}%` }]} />
      ))}

      {/* bone nut (left) and bridge (right) */}
      <View style={[styles.nut, { left: `${NUT_X}%` }]} />
      <View style={[styles.bridge, { left: `${BRIDGE_X}%` }]} />

      {/* strings — a bowed one swells and glows in the warm accent */}
      {VIOLIN_STRINGS.map((string, index) => {
        const anim = stringAnim(keyAnims, string.id);
        const thickness = STRING_THICKNESS[index];
        return (
          <Animated.View
            key={string.id}
            style={[
              styles.stringRow,
              {
                top: `${((index + 0.5) / VIOLIN_STRINGS.length) * 100}%`,
                height: thickness,
                marginTop: -thickness / 2,
              },
              anim
                ? {
                    transform: [
                      {
                        scaleY: anim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [1, 2.6],
                        }),
                      },
                    ],
                  }
                : null,
            ]}
          >
            <View style={styles.stringWire} />
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
    // Warm maple rim above and below the ebony board.
    borderBottomWidth: 3,
    borderColor: WOOD_EDGE,
    borderTopWidth: 3,
    flex: 1,
  },
  positionDot: {
    backgroundColor: POSITION_DOT,
    borderRadius: 5,
    height: 10,
    marginLeft: -5,
    marginTop: -5,
    position: 'absolute',
    top: '50%',
    width: 10,
  },
  nut: {
    backgroundColor: NUT,
    borderRadius: 2,
    bottom: 2,
    position: 'absolute',
    top: 2,
    width: 4,
  },
  bridge: {
    backgroundColor: BRIDGE,
    borderRadius: 3,
    bottom: 6,
    position: 'absolute',
    top: 6,
    width: 7,
  },
  stringRow: {
    left: 0,
    position: 'absolute',
    right: 0,
  },
  stringWire: {
    backgroundColor: STRING_IDLE,
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
