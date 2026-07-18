import { useEffect, useRef } from 'react';
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

export function LaunchPad({
  label,
  color,
  width,
  height,
  showLabel = true,
  highlighted = false,
  strongGuide = true,
  pressed = false,
}: LaunchPadProps) {
  const flash = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(1)).current;
  const guidePulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (pressed) {
      flash.setValue(1);
      scale.setValue(0.96);
      return;
    }
    Animated.parallel([
      Animated.timing(flash, {
        toValue: 0,
        duration: 180,
        useNativeDriver: false,
      }),
      Animated.spring(scale, {
        toValue: 1,
        friction: 5,
        tension: 220,
        useNativeDriver: false,
      }),
    ]).start();
  }, [pressed, flash, scale]);

  useEffect(() => {
    if (!highlighted) {
      guidePulse.stopAnimation();
      guidePulse.setValue(0);
      return;
    }

    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(guidePulse, {
          toValue: 1,
          duration: strongGuide ? 260 : 400,
          useNativeDriver: false,
        }),
        Animated.timing(guidePulse, {
          toValue: 0.3,
          duration: strongGuide ? 260 : 400,
          useNativeDriver: false,
        }),
      ]),
    );
    loop.start();
    return () => {
      loop.stop();
    };
  }, [highlighted, strongGuide, guidePulse]);

  const idleFace = withAlpha(color, 0.22);
  const pressedFace = withAlpha(color, 0.92);
  const idleBorder = withAlpha(color, 0.55);

  const backgroundColor = flash.interpolate({
    inputRange: [0, 1],
    outputRange: [idleFace, pressedFace],
  });

  const borderColor = highlighted
    ? guidePulse.interpolate({
        inputRange: [0, 1],
        outputRange: [color, strongGuide ? '#FFFFFF' : color],
      })
    : flash.interpolate({
        inputRange: [0, 1],
        outputRange: [idleBorder, '#FFFFFF'],
      });

  const glowOpacity = flash.interpolate({
    inputRange: [0, 1],
    outputRange: [highlighted ? 0.35 : 0.08, 0.75],
  });

  const ledOpacity = flash.interpolate({
    inputRange: [0, 1],
    outputRange: [0.45, 1],
  });

  const borderWidth = highlighted ? (strongGuide ? 3 : 2.5) : 1.5;
  const shortSide = Math.min(width, height);
  const radius = Math.max(8, Math.round(shortSide * 0.12));
  const fontSize = shortSide < 56 ? 9 : shortSide < 72 ? 11 : shortSide < 96 ? 12 : 13;
  const inset = Math.max(2, Math.round(shortSide * 0.04));

  return (
    <View
      pointerEvents="none"
      style={[styles.pressable, { width, height, padding: inset }]}
    >
      <Animated.View
        style={[
          styles.glow,
          {
            borderRadius: radius + 4,
            backgroundColor: color,
            opacity: glowOpacity,
          },
        ]}
      />
      <Animated.View
        style={[
          styles.pad,
          {
            backgroundColor,
            borderColor,
            borderWidth,
            borderRadius: radius,
            transform: [{ scale }],
          },
        ]}
      >
        <View style={styles.bevel} />
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
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  pressable: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  glow: {
    ...StyleSheet.absoluteFillObject,
    margin: 1,
  },
  pad: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    overflow: 'hidden',
    paddingHorizontal: 4,
    paddingVertical: 4,
    width: '100%',
  },
  bevel: {
    ...StyleSheet.absoluteFillObject,
    borderColor: 'rgba(255,255,255,0.08)',
    borderTopWidth: 1,
    borderLeftWidth: 1,
  },
  led: {
    borderRadius: 2,
    height: 3,
    marginBottom: 4,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 4,
    width: '36%',
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
