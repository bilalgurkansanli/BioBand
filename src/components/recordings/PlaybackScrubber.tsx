import { useCallback, useRef, useState } from 'react';
import {
  type AccessibilityActionEvent,
  PanResponder,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';

import { colors } from '../../theme/colors';
import { ADJUSTABLE_ACTIONS, adjustmentDirection } from '../../utils/accessibility';
import { formatDuration } from '../../utils/formatDuration';

/** One swipe up/down with a screen reader skips this far. */
const ACCESSIBILITY_SEEK_STEP_MS = 5000;

type Props = {
  positionMs: number;
  durationMs: number;
  onSeek: (positionMs: number) => void;
};

export function PlaybackScrubber({ positionMs, durationMs, onSeek }: Props) {
  const { t } = useTranslation();
  const [trackWidth, setTrackWidth] = useState(0);
  const durationRef = useRef(durationMs);
  durationRef.current = durationMs;
  const trackWidthRef = useRef(0);
  trackWidthRef.current = trackWidth;
  // Absolute screen x of the track's left edge — captured on touch start so
  // drags stay accurate without an async `measure()` round-trip per move.
  const originXRef = useRef(0);

  const seekFromAbsoluteX = useCallback(
    (pageX: number) => {
      if (trackWidthRef.current <= 0 || durationRef.current <= 0) {
        return;
      }
      const ratio = Math.min(
        1,
        Math.max(0, (pageX - originXRef.current) / trackWidthRef.current),
      );
      onSeek(Math.round(ratio * durationRef.current));
    },
    [onSeek],
  );

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        originXRef.current = evt.nativeEvent.pageX - evt.nativeEvent.locationX;
        seekFromAbsoluteX(evt.nativeEvent.pageX);
      },
      onPanResponderMove: (_evt, gestureState) => {
        seekFromAbsoluteX(gestureState.moveX);
      },
    }),
  ).current;

  const progress = durationMs > 0 ? Math.min(1, Math.max(0, positionMs / durationMs)) : 0;

  // Dragging is out of reach with a screen reader running; swipe up/down
  // arrives here instead and skips a few seconds either way.
  const handleAccessibilityAction = (event: AccessibilityActionEvent) => {
    const direction = adjustmentDirection(event);
    if (direction === 0 || durationMs <= 0) {
      return;
    }
    onSeek(
      Math.min(durationMs, Math.max(0, positionMs + direction * ACCESSIBILITY_SEEK_STEP_MS)),
    );
  };

  return (
    <View style={styles.wrap}>
      <View
        accessible
        accessibilityActions={ADJUSTABLE_ACTIONS}
        accessibilityLabel={t('recordings.playbackPosition')}
        accessibilityRole="adjustable"
        accessibilityValue={{
          text: t('recordings.positionValue', {
            duration: formatDuration(durationMs),
            position: formatDuration(positionMs),
          }),
        }}
        onAccessibilityAction={handleAccessibilityAction}
        hitSlop={{ bottom: 10, top: 10 }}
        onLayout={(event) => setTrackWidth(event.nativeEvent.layout.width)}
        style={styles.track}
        {...panResponder.panHandlers}
      >
        <View style={[styles.fill, { width: `${progress * 100}%` }]} />
        <View
          pointerEvents="none"
          style={[styles.thumb, { left: `${progress * 100}%` }]}
        />
      </View>
      <View style={styles.timeRow}>
        <Text style={styles.timeText}>{formatDuration(positionMs)}</Text>
        <Text style={styles.timeText}>{formatDuration(durationMs)}</Text>
      </View>
    </View>
  );
}

const THUMB_SIZE = 13;

const styles = StyleSheet.create({
  wrap: {
    marginTop: 10,
    width: '100%',
  },
  track: {
    backgroundColor: colors.surfaceLight,
    borderRadius: 3,
    height: 6,
    justifyContent: 'center',
    width: '100%',
  },
  fill: {
    backgroundColor: colors.accent,
    borderRadius: 3,
    height: 6,
    position: 'absolute',
    left: 0,
  },
  thumb: {
    backgroundColor: colors.text,
    borderRadius: THUMB_SIZE / 2,
    height: THUMB_SIZE,
    marginLeft: -THUMB_SIZE / 2,
    position: 'absolute',
    width: THUMB_SIZE,
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  timeText: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '600',
  },
});
