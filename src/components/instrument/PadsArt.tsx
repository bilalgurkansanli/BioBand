import { Animated, StyleSheet, View } from 'react-native';

import { shade } from '../../utils/colorMix';

// The FX bank's 4×4 slot colors, row-major — mirrors the pads screen. The
// intro plays FX-bank sounds (stabs, lasers, whooshes), so the card wears
// the same bank's colors.
const PAD_COLORS: { id: string; color: string }[] = [
  { id: 'pad01', color: '#4ECDC4' },
  { id: 'pad02', color: '#E76F51' },
  { id: 'pad03', color: '#F4D35E' },
  { id: 'pad04', color: '#EE964B' },
  { id: 'pad05', color: '#457B9D' },
  { id: 'pad06', color: '#6C5CE7' },
  { id: 'pad07', color: '#A78BFA' },
  { id: 'pad08', color: '#8E44AD' },
  { id: 'pad09', color: '#38BDF8' },
  { id: 'pad10', color: '#0EA5E9' },
  { id: 'pad11', color: '#264653' },
  { id: 'pad12', color: '#F4A261' },
  { id: 'pad13', color: '#48DBFB' },
  { id: 'pad14', color: '#9B59B6' },
  { id: 'pad15', color: '#E9C46A' },
  { id: 'pad16', color: '#E74C3C' },
];

const COLUMNS = 4;

type PadsArtProps = {
  /**
   * Optional hit animations per pad id (0 = rest, 1 = hit). Pads without
   * an entry render static.
   */
  keyAnims?: Map<string, Animated.Value>;
};

/**
 * Decorative 4×4 launchpad drawn with plain views, using the drums bank's
 * real slot colors. Fills its parent — the parent decides size, position,
 * and opacity. In a wide card the pads stretch into flat rubber-pad
 * rectangles, which still reads as a pad controller.
 */
export function PadsArt({ keyAnims }: PadsArtProps) {
  const rows: { id: string; color: string }[][] = [];
  for (let i = 0; i < PAD_COLORS.length; i += COLUMNS) {
    rows.push(PAD_COLORS.slice(i, i + COLUMNS));
  }

  return (
    <View pointerEvents="none" style={styles.container}>
      {rows.map((row, rowIndex) => (
        <View key={rowIndex} style={styles.row}>
          {row.map(({ id, color }) => {
            const anim = keyAnims?.get(id);
            return (
              <Animated.View
                key={id}
                style={[
                  styles.pad,
                  {
                    backgroundColor: shade(color, 0.55),
                    borderColor: shade(color, 0.25),
                  },
                  anim
                    ? {
                        transform: [
                          {
                            scale: anim.interpolate({
                              inputRange: [0, 1],
                              outputRange: [1, 0.92],
                            }),
                          },
                        ],
                      }
                    : null,
                ]}
              >
                {anim ? (
                  <Animated.View
                    style={[
                      styles.padGlow,
                      {
                        backgroundColor: color,
                        opacity: anim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0, 0.85],
                        }),
                      },
                    ]}
                  />
                ) : null}
              </Animated.View>
            );
          })}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 5,
  },
  row: {
    flex: 1,
    flexDirection: 'row',
  },
  pad: {
    borderRadius: 7,
    borderWidth: 1.5,
    flex: 1,
    margin: 2.5,
    overflow: 'hidden',
  },
  padGlow: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 5,
  },
});
