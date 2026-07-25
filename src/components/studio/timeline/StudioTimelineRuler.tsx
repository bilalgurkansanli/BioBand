import { memo, useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors } from '../../../theme/colors';
import { formatDuration } from '../../../utils/formatDuration';
import { RULER_HEIGHT, rulerStepSeconds } from './timelineGeometry';

type Props = {
  timelineWidth: number;
  pxPerMs: number;
  pixelsPerSecond: number;
  onSeek: (positionMs: number) => void;
};

function StudioTimelineRulerBase({ timelineWidth, pxPerMs, pixelsPerSecond, onSeek }: Props) {
  const ticks = useMemo(() => {
    const stepSec = rulerStepSeconds(pixelsPerSecond);
    const stepMs = stepSec * 1000;
    const out: { x: number; label: string }[] = [];
    for (let ms = 0; ms <= timelineWidth / pxPerMs; ms += stepMs) {
      out.push({ x: ms * pxPerMs, label: formatDuration(ms) });
    }
    return out;
  }, [pixelsPerSecond, pxPerMs, timelineWidth]);

  return (
    <Pressable
      onPress={(event) => onSeek(Math.max(0, event.nativeEvent.locationX / pxPerMs))}
      style={[styles.ruler, { width: timelineWidth }]}
    >
      {ticks.map((tick, index) => (
        <View key={index} style={[styles.tick, { left: tick.x }]}>
          <View style={styles.tickMark} />
          {index > 0 ? <Text style={styles.tickLabel}>{tick.label}</Text> : null}
        </View>
      ))}
    </Pressable>
  );
}

export const StudioTimelineRuler = memo(StudioTimelineRulerBase);

const styles = StyleSheet.create({
  ruler: {
    backgroundColor: colors.background,
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    height: RULER_HEIGHT,
  },
  tick: {
    bottom: 0,
    position: 'absolute',
    top: 0,
  },
  tickMark: {
    backgroundColor: colors.border,
    bottom: 0,
    position: 'absolute',
    top: RULER_HEIGHT / 2,
    width: 1,
  },
  tickLabel: {
    color: colors.textSecondary,
    fontSize: 10,
    fontVariant: ['tabular-nums'],
    fontWeight: '600',
    left: 4,
    position: 'absolute',
    top: 3,
  },
});
