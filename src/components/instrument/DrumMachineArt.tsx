import { Animated, StyleSheet, View } from 'react-native';

import type { DrumMachineGrid } from '../../instruments/drumMachine/drumMachineRows';
import { shade, tint } from '../../utils/colorMix';

// Drums machine-type theme — mirrors the drum machine screen.
const ACCENT = '#2A9D8F';
const CELL_OFF_A = '#1A1A2E';
const CELL_OFF_B = '#252542';

type DrumMachineArtProps = {
  /** The preset pattern to display: rows × steps, cell level 0/1/2. */
  grid: DrumMachineGrid;
  /**
   * Optional playhead animations keyed `step:<n>` (0 = rest, 1 = firing).
   * The column lights up and its lit cells flash as the sweep passes.
   */
  keyAnims?: Map<string, Animated.Value>;
};

/**
 * Decorative step-sequencer grid drawn with plain views, showing a real
 * preset beat in the drum machine screen's theme. Fills its parent — the
 * parent decides size, position, and opacity. The intro drives a
 * left-to-right playhead: each `step:<n>` anim highlights its column.
 */
export function DrumMachineArt({ grid, keyAnims }: DrumMachineArtProps) {
  const stepCount = grid[0]?.length ?? 16;

  return (
    <View pointerEvents="none" style={styles.container}>
      {grid.map((cells, rowIndex) => (
        <View key={rowIndex} style={styles.row}>
          {cells.map((level, step) => {
            const anim = keyAnims?.get(`step:${step}`);
            // Alternating 4-step beat groups, like the real grid columns.
            const offColor = Math.floor(step / 4) % 2 === 0 ? CELL_OFF_A : CELL_OFF_B;
            const litColor = level === 2 ? ACCENT : shade(ACCENT, 0.25);
            return (
              <View
                key={step}
                style={[
                  styles.cell,
                  { backgroundColor: level > 0 ? litColor : offColor },
                ]}
              >
                {level > 0 && anim ? (
                  <Animated.View
                    style={[
                      styles.cellFlash,
                      {
                        opacity: anim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0, 0.9],
                        }),
                      },
                    ]}
                  />
                ) : null}
              </View>
            );
          })}
        </View>
      ))}

      {/* Playhead columns — a translucent bar sweeps left to right. */}
      {Array.from({ length: stepCount }, (_, step) => {
        const anim = keyAnims?.get(`step:${step}`);
        if (!anim) {
          return null;
        }
        return (
          <Animated.View
            key={step}
            style={[
              styles.playhead,
              {
                left: `${(step / stepCount) * 100}%`,
                width: `${100 / stepCount}%`,
                opacity: anim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, 0.32],
                }),
              },
            ]}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 6,
  },
  row: {
    flex: 1,
    flexDirection: 'row',
    marginVertical: 1,
  },
  cell: {
    borderRadius: 3,
    flex: 1,
    marginHorizontal: 1,
    overflow: 'hidden',
  },
  cellFlash: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: tint(ACCENT, 0.55),
  },
  playhead: {
    backgroundColor: tint(ACCENT, 0.35),
    borderRadius: 3,
    bottom: 6,
    position: 'absolute',
    top: 6,
  },
});
