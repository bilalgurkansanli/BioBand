import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  type GestureResponderEvent,
  StyleSheet,
  View,
  type ViewStyle,
} from 'react-native';

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
}: HorizontalSliderProps) {
  const trackRef = useRef<View>(null);
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

  const measureTrack = useCallback(() => {
    trackRef.current?.measureInWindow((x, _y, width) => {
      trackXRef.current = x;
      trackWidthRef.current = width;
    });
  }, []);

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
      measureTrack();

      const next = valueFromPageX(event.nativeEvent.pageX);
      pendingValueRef.current = next;
      setDragValue(next);
      onValueChange(next);
    },
    [disabled, measureTrack, onSlidingStart, onValueChange, valueFromPageX],
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
      measureTrack();
    },
    [measureTrack],
  );

  return (
    <View
      ref={trackRef}
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
      <View pointerEvents="none" style={styles.trackContainer}>
        <View style={styles.track} />
        <View
          style={[
            styles.fill,
            { backgroundColor: accentColor, width: `${ratio * 100}%` },
          ]}
        />
        <View
          style={[
            styles.thumb,
            {
              backgroundColor: accentColor,
              left: `${ratio * 100}%`,
              transform: [{ translateX: -SLIDER_THUMB_SIZE / 2 }],
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
