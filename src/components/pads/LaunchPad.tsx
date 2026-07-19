import { memo, useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';

type LaunchPadProps = {
  label: string;
  color: string;
  width: number;
  height: number;
  showLabel?: boolean;
  highlighted?: boolean;
  strongGuide?: boolean;
  /** Finger currently down on this pad (multi-touch). */
  pressed?: boolean;
  /** LED afterglow: slower flash decay when releasing. */
  trail?: boolean;
  /** Looper playback flash — every stamp change fires a soft pulse. */
  ghostStamp?: number;
};

function withAlpha(hex: string, alpha: number): string {
  const a = Math.round(Math.max(0, Math.min(1, alpha)) * 255)
    .toString(16)
    .padStart(2, '0');
  if (hex.length === 7) {
    return `${hex}${a}`;
  }
  return hex;
}

/**
 * All animations are opacity/transform on the native driver — the pad face
 * flash is a colored overlay fading in/out, never an animated backgroundColor,
 * so fast rolls don't touch the JS thread. Memoized: only the pads whose
 * pressed/highlighted state changed re-render.
 */
function LaunchPadBase({
  label,
  color,
  width,
  height,
  showLabel = true,
  highlighted = false,
  strongGuide = true,
  pressed = false,
  trail = false,
  ghostStamp = 0,
}: LaunchPadProps) {
  const flash = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(1)).current;
  const guidePulse = useRef(new Animated.Value(0)).current;
  // Seeded from the initial prop: a pad that mounts while a stale ghost
  // stamp is still set (bank switch after the looper ran) must not replay
  // the flash on mount.
  const lastGhostStampRef = useRef(ghostStamp);

  useEffect(() => {
    if (pressed) {
      flash.setValue(1);
      scale.setValue(0.955);
      return;
    }
    Animated.parallel([
      Animated.timing(flash, {
        toValue: 0,
        duration: trail ? 750 : 200,
        useNativeDriver: true,
      }),
      Animated.spring(scale, {
        toValue: 1,
        friction: 5,
        tension: 220,
        useNativeDriver: true,
      }),
    ]).start();
  }, [pressed, flash, scale, trail]);

  useEffect(() => {
    // Only pulse when the stamp actually advanced — the effect also re-runs
    // on pressed/trail changes and must not replay a stale ghost flash over
    // the release fade.
    if (ghostStamp <= 0 || ghostStamp === lastGhostStampRef.current) {
      return;
    }
    lastGhostStampRef.current = ghostStamp;
    if (pressed) {
      return;
    }
    // Looper playback: a softer, hands-free version of the press flash.
    flash.setValue(0.6);
    Animated.timing(flash, {
      toValue: 0,
      duration: trail ? 600 : 180,
      useNativeDriver: true,
    }).start();
  }, [ghostStamp, flash, pressed, trail]);

  useEffect(() => {
    if (!highlighted) {
      guidePulse.stopAnimation();
      guidePulse.setValue(0);
      return;
    }

    guidePulse.setValue(0.35);
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(guidePulse, {
          toValue: 1,
          duration: strongGuide ? 260 : 400,
          useNativeDriver: true,
        }),
        Animated.timing(guidePulse, {
          toValue: 0.35,
          duration: strongGuide ? 260 : 400,
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => {
      loop.stop();
    };
  }, [highlighted, strongGuide, guidePulse]);

  const idleFace = withAlpha(color, 0.2);
  const pressedFace = withAlpha(color, 0.95);
  const idleBorder = withAlpha(color, highlighted ? 0.9 : 0.5);

  const glowOpacity = flash.interpolate({
    inputRange: [0, 1],
    outputRange: [highlighted ? 0.35 : 0.07, 0.8],
  });

  const ledOpacity = flash.interpolate({
    inputRange: [0, 1],
    outputRange: [0.5, 1],
  });

  const shortSide = Math.min(width, height);
  const radius = Math.max(9, Math.round(shortSide * 0.14));
  const fontSize = shortSide < 56 ? 9 : shortSide < 72 ? 11 : shortSide < 96 ? 12 : 13;
  const inset = Math.max(2, Math.round(shortSide * 0.04));

  return (
    <View pointerEvents="none" style={[styles.cell, { width, height, padding: inset }]}>
      <Animated.View
        style={[
          styles.glow,
          {
            borderRadius: radius + 5,
            backgroundColor: color,
            opacity: glowOpacity,
          },
        ]}
      />
      <Animated.View style={[styles.shell, { transform: [{ scale }] }]}>
        <View
          style={[
            styles.face,
            {
              backgroundColor: idleFace,
              borderColor: idleBorder,
              borderRadius: radius,
            },
          ]}
        >
          <View pointerEvents="none" style={[styles.sheen, { borderRadius: radius - 2 }]} />
          <View pointerEvents="none" style={[styles.shade, { borderRadius: radius - 2 }]} />
          <Animated.View
            pointerEvents="none"
            style={[
              styles.pressedOverlay,
              {
                backgroundColor: pressedFace,
                borderRadius: Math.max(4, radius - 2),
                opacity: flash,
              },
            ]}
          />
          {highlighted ? (
            <Animated.View
              pointerEvents="none"
              style={[
                styles.guideRing,
                {
                  borderColor: strongGuide ? '#FFFFFF' : color,
                  borderRadius: radius,
                  borderWidth: strongGuide ? 3 : 2.5,
                  opacity: guidePulse,
                },
              ]}
            />
          ) : null}
          <Animated.View
            style={[
              styles.led,
              {
                backgroundColor: color,
                opacity: ledOpacity,
                shadowColor: color,
              },
            ]}
          />
          {showLabel ? (
            <Text
              numberOfLines={2}
              style={[
                styles.label,
                {
                  fontSize,
                  textShadowColor: withAlpha(color, 0.8),
                },
              ]}
            >
              {label}
            </Text>
          ) : null}
        </View>
      </Animated.View>
    </View>
  );
}

export const LaunchPad = memo(LaunchPadBase);

const styles = StyleSheet.create({
  cell: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  glow: {
    ...StyleSheet.absoluteFillObject,
    margin: 1,
  },
  shell: {
    flex: 1,
    width: '100%',
  },
  face: {
    alignItems: 'center',
    borderWidth: 1.5,
    flex: 1,
    justifyContent: 'center',
    overflow: 'hidden',
    paddingHorizontal: 4,
    paddingVertical: 4,
  },
  // Fake lighting: a soft top sheen and a bottom shade give the flat face
  // a rubber-pad depth without gradients or images.
  sheen: {
    backgroundColor: 'rgba(255,255,255,0.07)',
    height: '42%',
    left: 1,
    position: 'absolute',
    right: 1,
    top: 1,
  },
  shade: {
    backgroundColor: 'rgba(0,0,0,0.22)',
    bottom: 1,
    height: '30%',
    left: 1,
    position: 'absolute',
    right: 1,
  },
  pressedOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderColor: 'rgba(255,255,255,0.9)',
    borderWidth: 1.5,
    margin: 1,
  },
  guideRing: {
    ...StyleSheet.absoluteFillObject,
  },
  led: {
    borderRadius: 2,
    height: 4,
    marginBottom: 5,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 5,
    width: '40%',
  },
  label: {
    color: '#F4F4F8',
    fontWeight: '800',
    letterSpacing: 0.3,
    textAlign: 'center',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 6,
  },
});
