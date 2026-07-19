import { useCallback, useRef } from 'react';
import {
  Animated,
  StyleSheet,
  Text,
  View,
  type GestureResponderEvent,
} from 'react-native';
import { useTranslation } from 'react-i18next';

type XYPadProps = {
  width: number;
  height: number;
  accent: string;
  /** x, y in 0..1 — x left→right, y bottom→top. */
  onChange: (x: number, y: number) => void;
  onRelease: () => void;
};

const DOT_SIZE = 26;

/**
 * One-finger performance surface: drag to bend the filter (X = cutoff,
 * Y = resonance), lift to glide back to neutral. The dot follows the finger
 * via Animated.setValue — no re-renders while dragging.
 */
export function XYPad({ width, height, accent, onChange, onRelease }: XYPadProps) {
  const { t } = useTranslation();
  const dotX = useRef(new Animated.Value(width / 2)).current;
  const dotY = useRef(new Animated.Value(height / 2)).current;
  const dotOpacity = useRef(new Animated.Value(0.35)).current;

  const applyPoint = useCallback(
    (locationX: number, locationY: number) => {
      const clampedX = Math.max(0, Math.min(width, locationX));
      const clampedY = Math.max(0, Math.min(height, locationY));
      dotX.setValue(clampedX);
      dotY.setValue(clampedY);
      dotOpacity.setValue(1);
      onChange(clampedX / width, 1 - clampedY / height);
    },
    [dotOpacity, dotX, dotY, height, onChange, width],
  );

  const handleTouch = useCallback(
    (event: GestureResponderEvent) => {
      applyPoint(event.nativeEvent.locationX, event.nativeEvent.locationY);
    },
    [applyPoint],
  );

  const handleRelease = useCallback(
    (event: GestureResponderEvent) => {
      // With two fingers down, lifting one must not glide to neutral while
      // the other still drags. The event's own locationX/Y belong to the
      // finger that LIFTED — follow a remaining touch instead.
      const remaining = event.nativeEvent.touches[0];
      if (remaining) {
        applyPoint(remaining.locationX, remaining.locationY);
        return;
      }
      Animated.timing(dotOpacity, {
        toValue: 0.35,
        duration: 220,
        useNativeDriver: true,
      }).start();
      onRelease();
    },
    [applyPoint, dotOpacity, onRelease],
  );

  return (
    <View
      onTouchEnd={handleRelease}
      onTouchCancel={handleRelease}
      onTouchMove={handleTouch}
      onTouchStart={handleTouch}
      style={[styles.surface, { borderColor: `${accent}66`, height, width }]}
    >
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        {[0.25, 0.5, 0.75].map((fraction) => (
          <View
            key={`h-${fraction}`}
            style={[styles.gridLineH, { top: `${fraction * 100}%` }]}
          />
        ))}
        {[0.25, 0.5, 0.75].map((fraction) => (
          <View
            key={`v-${fraction}`}
            style={[styles.gridLineV, { left: `${fraction * 100}%` }]}
          />
        ))}
        <Text style={[styles.axisLabel, styles.axisX]}>{t('pads.xy.filter')}</Text>
        <Text style={[styles.axisLabel, styles.axisY]}>{t('pads.xy.resonance')}</Text>
      </View>
      <Animated.View
        pointerEvents="none"
        style={[
          styles.dot,
          {
            backgroundColor: `${accent}44`,
            borderColor: accent,
            opacity: dotOpacity,
            shadowColor: accent,
            transform: [
              { translateX: Animated.subtract(dotX, DOT_SIZE / 2) },
              { translateY: Animated.subtract(dotY, DOT_SIZE / 2) },
            ],
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  surface: {
    backgroundColor: '#101016',
    borderRadius: 14,
    borderWidth: 1.5,
    overflow: 'hidden',
  },
  gridLineH: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    height: 1,
    left: 0,
    position: 'absolute',
    right: 0,
  },
  gridLineV: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    bottom: 0,
    position: 'absolute',
    top: 0,
    width: 1,
  },
  axisLabel: {
    color: 'rgba(255,255,255,0.35)',
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.8,
    position: 'absolute',
    textTransform: 'uppercase',
  },
  axisX: {
    bottom: 6,
    right: 8,
  },
  axisY: {
    left: 8,
    top: 6,
  },
  dot: {
    borderRadius: DOT_SIZE / 2,
    borderWidth: 2,
    height: DOT_SIZE,
    left: 0,
    position: 'absolute',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
    top: 0,
    width: DOT_SIZE,
  },
});
