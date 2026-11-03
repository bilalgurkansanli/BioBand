import { useEffect, useMemo, useRef } from 'react';
import {
  type AccessibilityActionEvent,
  Animated,
  Easing,
  PanResponder,
  StyleSheet,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';

import { colors } from '../../../theme/colors';
import { ADJUSTABLE_ACTIONS, adjustmentDirection } from '../../../utils/accessibility';
import { formatDuration } from '../../../utils/formatDuration';
import { type PlaybackPosition, usePlaybackPositionMs } from './playbackPosition';
import { RULER_HEIGHT } from './timelineGeometry';

/** One swipe up/down with a screen reader moves the playhead this far. */
const ACCESSIBILITY_SEEK_STEP_MS = 5000;

type Props = {
  position: PlaybackPosition;
  durationMs: number;
  pxPerMs: number;
  isPlaying: boolean;
  scrollX: Animated.Value;
  onSeek: (positionMs: number) => void;
};

export function StudioPlayhead({
  position,
  durationMs,
  pxPerMs,
  isPlaying,
  scrollX,
  onSeek,
}: Props) {
  const { t } = useTranslation();
  // Subscribed here, at the leaf, so a progress tick redraws the playhead and
  // nothing above it.
  const positionMs = usePlaybackPositionMs(position);
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

  // The knob is dragged; a screen reader swipes up/down instead, which moves
  // the playhead a few seconds at a time.
  const handleAccessibilityAction = (event: AccessibilityActionEvent) => {
    const direction = adjustmentDirection(event);
    if (direction === 0) {
      return;
    }
    onSeek(
      Math.max(0, Math.min(durationMs, positionMs + direction * ACCESSIBILITY_SEEK_STEP_MS)),
    );
  };

  return (
    <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
      <Animated.View
        pointerEvents="box-none"
        style={[styles.group, { transform: [{ translateX }] }]}
      >
        <View style={styles.line} pointerEvents="none" />
        <View
          {...panResponder.panHandlers}
          accessible
          accessibilityActions={ADJUSTABLE_ACTIONS}
          accessibilityLabel={t('studio.playhead')}
          accessibilityRole="adjustable"
          accessibilityValue={{
            text: t('recordings.positionValue', {
              duration: formatDuration(durationMs),
              position: formatDuration(positionMs),
            }),
          }}
          onAccessibilityAction={handleAccessibilityAction}
          style={styles.knobHit}
        >
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
    borderColor: colors.white,
    borderRadius: KNOB_SIZE / 2,
    borderWidth: 2,
    height: KNOB_SIZE,
    width: KNOB_SIZE,
  },
});
