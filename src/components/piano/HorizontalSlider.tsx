import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  type AccessibilityActionEvent,
  type GestureResponderEvent,
  StyleSheet,
  View,
  type ViewStyle,
} from 'react-native';

const ADJUSTABLE_ACTIONS = [{ name: 'increment' }, { name: 'decrement' }] as const;

export const SLIDER_THUMB_SIZE = 24;
const TRACK_HEIGHT = 6;

export type HorizontalSliderProps = {
  value: number;
  min?: number;
  max?: number;
  onValueChange: (value: number) => void;
  onSlidingStart?: () => void;
  onSlidingComplete?: (value: number) => void;
  disabled?: boolean;
  accentColor: string;
  style?: ViewStyle;
  /** Thumb diameter — defaults to the standard 24, use smaller in tight rows. */
  thumbSize?: number;
  /** What the slider sets ("Volume") — screen readers read it before the value. */
  accessibilityLabel?: string;
  /** The value as it should be spoken ("120 BPM"); a percentage when omitted. */
  accessibilityValueText?: string;
  /** How far one swipe up/down moves it; a tenth of the range when omitted. */
  accessibilityStep?: number;
};

export const HorizontalSlider = React.memo(function HorizontalSlider({
  value,
  min = 0,
  max = 1,
  onValueChange,
  onSlidingStart,
  onSlidingComplete,
  disabled = false,
  accentColor,
  style,
  thumbSize = SLIDER_THUMB_SIZE,
  accessibilityLabel,
  accessibilityValueText,
  accessibilityStep,
}: HorizontalSliderProps) {
  const trackXRef = useRef(0);
  const trackWidthRef = useRef(0);
  const draggingRef = useRef(false);
  const pendingValueRef = useRef(value);
  const rafRef = useRef<number | null>(null);
  const [dragValue, setDragValue] = useState<number | null>(null);

  const displayValue = dragValue ?? value;
  const ratio = Math.max(0, Math.min(1, (displayValue - min) / (max - min)));

  useEffect(() => {
    if (!draggingRef.current) {
      pendingValueRef.current = value;
    }
  }, [value]);

  useEffect(
    () => () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
    },
    [],
  );

  const valueFromPageX = useCallback(
    (pageX: number) => {
      const width = trackWidthRef.current;
      if (width <= 0) {
        return pendingValueRef.current;
      }
      const nextRatio = Math.max(
        0,
        Math.min(1, (pageX - trackXRef.current) / width),
      );
      return min + nextRatio * (max - min);
    },
    [max, min],
  );

  const scheduleEmit = useCallback(
    (nextValue: number) => {
      pendingValueRef.current = nextValue;
      setDragValue(nextValue);

      if (rafRef.current !== null) {
        return;
      }

      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = null;
        onValueChange(pendingValueRef.current);
      });
    },
    [onValueChange],
  );

  const flushEmit = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    onValueChange(pendingValueRef.current);
  }, [onValueChange]);

  const handleGrant = useCallback(
    (event: GestureResponderEvent) => {
      if (disabled) {
        return;
      }

      draggingRef.current = true;
      onSlidingStart?.();

      // The track's left edge, from this very touch. It used to come from an
      // asynchronous measureInWindow() started here, which answered after the
      // line below had already run — so the first touch was placed against
      // wherever the track had been the last time (or 0, the first time), and
      // the thumb jumped somewhere unrelated to the finger. The touch knows
      // both where it is on screen and where it is within the track; the
      // difference is the track's position, with no round trip. (The touch
      // always lands on this view itself: its children ignore touches.)
      trackXRef.current = event.nativeEvent.pageX - event.nativeEvent.locationX;

      const next = valueFromPageX(event.nativeEvent.pageX);
      pendingValueRef.current = next;
      setDragValue(next);
      onValueChange(next);
    },
    [disabled, onSlidingStart, onValueChange, valueFromPageX],
  );

  const handleMove = useCallback(
    (event: GestureResponderEvent) => {
      if (disabled || !draggingRef.current) {
        return;
      }
      scheduleEmit(valueFromPageX(event.nativeEvent.pageX));
    },
    [disabled, scheduleEmit, valueFromPageX],
  );

  const handleRelease = useCallback(() => {
    if (!draggingRef.current) {
      return;
    }

    draggingRef.current = false;
    flushEmit();
    const finalValue = pendingValueRef.current;
    setDragValue(null);
    onSlidingComplete?.(finalValue);
  }, [flushEmit, onSlidingComplete]);

  const handleLayout = useCallback(
    (event: { nativeEvent: { layout: { width: number } } }) => {
      trackWidthRef.current = event.nativeEvent.layout.width;
    },
    [],
  );

  // Screen readers cannot drag: VoiceOver and TalkBack offer swipe up/down
  // instead, which arrive here as increment/decrement. Each step goes through
  // the same start → change → complete sequence as a short drag, so callers
  // that only save on completion still save.
  const handleAccessibilityAction = useCallback(
    (event: AccessibilityActionEvent) => {
      if (disabled) {
        return;
      }
      const direction =
        event.nativeEvent.actionName === 'increment'
          ? 1
          : event.nativeEvent.actionName === 'decrement'
            ? -1
            : 0;
      if (direction === 0) {
        return;
      }
      const step = accessibilityStep ?? (max - min) / 10;
      const next = Math.max(min, Math.min(max, value + direction * step));
      if (next === value) {
        return;
      }
      onSlidingStart?.();
      pendingValueRef.current = next;
      onValueChange(next);
      onSlidingComplete?.(next);
    },
    [accessibilityStep, disabled, max, min, onSlidingComplete, onSlidingStart, onValueChange, value],
  );

  return (
    <View
      accessible
      accessibilityActions={ADJUSTABLE_ACTIONS}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="adjustable"
      accessibilityState={{ disabled }}
      // iOS reads min/max/now as a percentage of the range; `text` overrides
      // it where a percentage would be meaningless (BPM, semitones).
      accessibilityValue={
        accessibilityValueText !== undefined
          ? { text: accessibilityValueText }
          : { min: 0, max: 100, now: Math.round(ratio * 100) }
      }
      onAccessibilityAction={handleAccessibilityAction}
      onLayout={handleLayout}
      onMoveShouldSetResponder={() => !disabled && draggingRef.current}
      onMoveShouldSetResponderCapture={() => !disabled}
      onResponderGrant={handleGrant}
      onResponderMove={handleMove}
      onResponderRelease={handleRelease}
      onResponderTerminate={handleRelease}
      onResponderTerminationRequest={() => false}
      onStartShouldSetResponder={() => !disabled}
      onStartShouldSetResponderCapture={() => !disabled}
      style={[styles.touchArea, style]}
    >
      <View pointerEvents="none" style={[styles.trackContainer, { height: thumbSize }]}>
        <View style={styles.track} />
        <View
          style={[
            styles.fill,
            {
              backgroundColor: accentColor,
              top: (thumbSize - TRACK_HEIGHT) / 2,
              width: `${ratio * 100}%`,
            },
          ]}
        />
        <View
          style={[
            styles.thumb,
            {
              backgroundColor: accentColor,
              borderRadius: thumbSize / 2,
              height: thumbSize,
              left: `${ratio * 100}%`,
              transform: [{ translateX: -thumbSize / 2 }],
              width: thumbSize,
            },
          ]}
        />
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  touchArea: {
    height: 44,
    justifyContent: 'center',
  },
  trackContainer: {
    height: SLIDER_THUMB_SIZE,
    justifyContent: 'center',
  },
  track: {
    backgroundColor: '#3A3A3C',
    borderRadius: 3,
    height: TRACK_HEIGHT,
  },
  fill: {
    borderRadius: 3,
    height: TRACK_HEIGHT,
    left: 0,
    position: 'absolute',
    top: (SLIDER_THUMB_SIZE - TRACK_HEIGHT) / 2,
  },
  thumb: {
    borderRadius: SLIDER_THUMB_SIZE / 2,
    elevation: 4,
    height: SLIDER_THUMB_SIZE,
    position: 'absolute',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.45,
    shadowRadius: 3,
    top: 0,
    width: SLIDER_THUMB_SIZE,
  },
});
