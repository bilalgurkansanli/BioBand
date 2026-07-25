import { useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, PanResponder, StyleSheet, View } from 'react-native';

import { colors } from '../../../theme/colors';
import { RULER_HEIGHT } from './timelineGeometry';

type Props = {
  positionMs: number;
  durationMs: number;
  pxPerMs: number;
  isPlaying: boolean;
  scrollX: Animated.Value;
  onSeek: (positionMs: number) => void;
};

export function StudioPlayhead({
  positionMs,
  durationMs,
  pxPerMs,
  isPlaying,
  scrollX,
  onSeek,
}: Props) {
  const playheadPx = useRef(new Animated.Value(positionMs * pxPerMs)).current;
  const positionRef = useRef(positionMs);
  positionRef.current = positionMs;
  const grabStartMsRef = useRef(0);

  useEffect(() => {
    const target = positionMs * pxPerMs;
    if (isPlaying) {
      // Smooth the 100ms progress ticks into continuous motion.
      Animated.timing(playheadPx, {
        toValue: target,
        duration: 110,
        easing: Easing.linear,
        useNativeDriver: true,
      }).start();
    } else {
      playheadPx.stopAnimation();
      playheadPx.setValue(target);
    }
  }, [isPlaying, playheadPx, positionMs, pxPerMs]);

  const translateX = useMemo(
    () => Animated.subtract(playheadPx, scrollX),
    [playheadPx, scrollX],
  );

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onStartShouldSetPanResponderCapture: () => true,
        onMoveShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponderCapture: () => true,
        onPanResponderGrant: () => {
          grabStartMsRef.current = positionRef.current;
        },
        onPanResponderMove: (_evt, gesture) => {
          const next = Math.max(
            0,
            Math.min(durationMs, grabStartMsRef.current + gesture.dx / pxPerMs),
          );
          onSeek(next);
        },
      }),
    [durationMs, onSeek, pxPerMs],
  );

  return (
    <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
      <Animated.View
        pointerEvents="box-none"
        style={[styles.group, { transform: [{ translateX }] }]}
      >
        <View style={styles.line} pointerEvents="none" />
        <View {...panResponder.panHandlers} style={styles.knobHit}>
          <View style={styles.knob} />
        </View>
      </Animated.View>
    </View>
  );
}

const KNOB_SIZE = 16;

const styles = StyleSheet.create({
  group: {
    bottom: 0,
    left: -1,
    position: 'absolute',
    top: 0,
    width: 2,
  },
  line: {
    backgroundColor: colors.accent,
    bottom: 0,
    left: 0,
    position: 'absolute',
    top: RULER_HEIGHT - 4,
    width: 2,
  },
  knobHit: {
    alignItems: 'center',
    height: RULER_HEIGHT,
    justifyContent: 'center',
    left: -KNOB_SIZE / 2,
    position: 'absolute',
    top: 0,
    width: KNOB_SIZE,
  },
  knob: {
    backgroundColor: colors.accent,
    borderColor: '#FFFFFF',
    borderRadius: KNOB_SIZE / 2,
    borderWidth: 2,
    height: KNOB_SIZE,
    width: KNOB_SIZE,
  },
});
