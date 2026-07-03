import { useRef } from 'react';
import { Animated, Pressable, StyleSheet, View, type ViewStyle } from 'react-native';

import type { DrumPieceKind } from '../../instruments/drums/drumKitLayout';

type DrumPieceProps = {
  kind: DrumPieceKind;
  size: number;
  onHit: () => void;
  accessibilityLabel: string;
};

const CYMBAL_GOLD = '#C9A227';
const CYMBAL_DARK = '#8B6914';
const CYMBAL_LIGHT = '#E8C547';
const RIM_SILVER = '#B0B0B0';
const HEAD_WHITE = '#F2F0EA';
const SHELL_RED = '#C0392B';
const SHELL_DARK = '#922B21';
const KICK_SHELL = '#D63031';
const PEDAL_BLACK = '#1C1C1C';
const PEDAL_METAL = '#6B6B6B';

function useHitFlash() {
  const flash = useRef(new Animated.Value(0)).current;

  const trigger = () => {
    flash.setValue(1);
    Animated.timing(flash, {
      toValue: 0,
      duration: 180,
      useNativeDriver: false,
    }).start();
  };

  return { flash, trigger };
}

function pieceShadow(size: number): ViewStyle {
  return {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: size * 0.06 },
    shadowOpacity: 0.45,
    shadowRadius: size * 0.08,
    elevation: 6,
  };
}

function CymbalPiece({
  size,
  flash,
  onPressIn,
}: {
  size: number;
  flash: Animated.Value;
  onPressIn: () => void;
}) {
  const hitGlow = flash.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.45],
  });

  const hitScale = flash.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0.96],
  });

  return (
    <Pressable onPressIn={onPressIn} style={{ width: size, height: size }}>
      <Animated.View
        style={[
          styles.cymbalOuter,
          pieceShadow(size),
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            transform: [{ scale: hitScale }],
          },
        ]}
      >
        <View style={[styles.cymbalRing, { width: size * 0.88, height: size * 0.88, borderRadius: size * 0.44 }]}>
          <View style={[styles.cymbalRingMid, { width: size * 0.72, height: size * 0.72, borderRadius: size * 0.36 }]}>
            <View style={[styles.cymbalCenter, { width: size * 0.18, height: size * 0.18, borderRadius: size * 0.09 }]} />
          </View>
        </View>
        <Animated.View
          style={[
            styles.hitGlow,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              opacity: hitGlow,
            },
          ]}
        />
      </Animated.View>
    </Pressable>
  );
}

function DrumHeadPiece({
  size,
  kind,
  flash,
  onPressIn,
}: {
  size: number;
  kind: 'tom' | 'snare';
  flash: Animated.Value;
  onPressIn: () => void;
}) {
  const shellWidth = size * 1.08;
  const shellHeight = size * 0.22;
  const headScale = flash.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0.94],
  });

  return (
    <Pressable onPressIn={onPressIn} style={{ width: size, height: size + shellHeight * 0.5 }}>
      <View style={{ alignItems: 'center' }}>
        <Animated.View
          style={[
            styles.drumHead,
            pieceShadow(size),
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              transform: [{ scale: headScale }],
              borderWidth: Math.max(2, size * 0.035),
            },
          ]}
        >
          <View
            style={[
              styles.drumHeadInner,
              {
                width: size * 0.82,
                height: size * 0.82,
                borderRadius: size * 0.41,
              },
            ]}
          />
          {kind === 'snare' ? (
            <View style={[styles.snareWire, { width: size * 0.55, height: size * 0.04, borderRadius: 2 }]} />
          ) : null}
        </Animated.View>
        <View
          style={[
            styles.shell,
            {
              width: shellWidth,
              height: shellHeight,
              borderBottomLeftRadius: shellWidth * 0.12,
              borderBottomRightRadius: shellWidth * 0.12,
              marginTop: -size * 0.06,
            },
          ]}
        />
      </View>
    </Pressable>
  );
}

function KickPiece({
  size,
  flash,
  onPressIn,
}: {
  size: number;
  flash: Animated.Value;
  onPressIn: () => void;
}) {
  const kickWidth = size * 1.35;
  const kickHeight = size * 0.85;
  const headSize = size * 0.72;
  const pedalWidth = size * 0.55;
  const pedalHeight = size * 0.28;

  const headScale = flash.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0.92],
  });

  const handleHit = () => {
    onPressIn();
  };

  return (
    <View style={{ alignItems: 'center' }}>
      <Pressable onPressIn={handleHit}>
        <View style={[styles.kickBody, pieceShadow(size), { width: kickWidth, height: kickHeight, borderRadius: kickHeight * 0.45 }]}>
          <View style={[styles.kickShellSide, { width: kickWidth * 0.35, height: kickHeight * 0.9, borderRadius: kickHeight * 0.2 }]} />
          <Animated.View
            style={[
              styles.kickHead,
              {
                width: headSize,
                height: headSize,
                borderRadius: headSize / 2,
                borderWidth: Math.max(2, headSize * 0.04),
                transform: [{ scale: headScale }],
              },
            ]}
          />
        </View>
      </Pressable>

      <Pressable onPressIn={handleHit} style={{ marginTop: size * 0.04 }}>
        <View style={[styles.pedalBase, { width: pedalWidth, height: pedalHeight, borderRadius: 6 }]}>
          <View style={[styles.pedalBeater, { width: pedalWidth * 0.35, height: pedalHeight * 0.45, borderRadius: 4 }]} />
        </View>
      </Pressable>
    </View>
  );
}

export function DrumPiece({ kind, size, onHit, accessibilityLabel }: DrumPieceProps) {
  const { flash, trigger } = useHitFlash();

  const handlePressIn = () => {
    trigger();
    onHit();
  };

  const content = (() => {
    switch (kind) {
      case 'cymbal':
        return <CymbalPiece flash={flash} onPressIn={handlePressIn} size={size} />;
      case 'tom':
        return <DrumHeadPiece flash={flash} kind="tom" onPressIn={handlePressIn} size={size} />;
      case 'snare':
        return <DrumHeadPiece flash={flash} kind="snare" onPressIn={handlePressIn} size={size} />;
      case 'kick':
        return <KickPiece flash={flash} onPressIn={handlePressIn} size={size} />;
    }
  })();

  return (
    <View accessibilityLabel={accessibilityLabel} accessibilityRole="button">
      {content}
    </View>
  );
}

const styles = StyleSheet.create({
  cymbalOuter: {
    alignItems: 'center',
    backgroundColor: CYMBAL_GOLD,
    borderColor: CYMBAL_DARK,
    borderWidth: 1,
    justifyContent: 'center',
    overflow: 'hidden',
  },
  hitGlow: {
    backgroundColor: '#FFFFFF',
    position: 'absolute',
  },
  cymbalRing: {
    alignItems: 'center',
    borderColor: CYMBAL_LIGHT,
    borderWidth: 1,
    justifyContent: 'center',
    opacity: 0.85,
  },
  cymbalRingMid: {
    alignItems: 'center',
    borderColor: CYMBAL_DARK,
    borderWidth: 1,
    justifyContent: 'center',
  },
  cymbalCenter: {
    backgroundColor: CYMBAL_DARK,
    borderColor: '#5C4A0E',
    borderWidth: 1,
  },
  drumHead: {
    alignItems: 'center',
    backgroundColor: HEAD_WHITE,
    borderColor: RIM_SILVER,
    justifyContent: 'center',
  },
  drumHeadInner: {
    backgroundColor: '#E8E6E0',
    opacity: 0.35,
  },
  snareWire: {
    backgroundColor: '#888',
    bottom: '18%',
    opacity: 0.5,
    position: 'absolute',
  },
  shell: {
    backgroundColor: SHELL_RED,
    borderColor: SHELL_DARK,
    borderWidth: 1,
  },
  kickBody: {
    alignItems: 'center',
    backgroundColor: KICK_SHELL,
    flexDirection: 'row',
    justifyContent: 'flex-start',
    overflow: 'hidden',
    paddingHorizontal: 8,
  },
  kickShellSide: {
    backgroundColor: SHELL_DARK,
    opacity: 0.6,
  },
  kickHead: {
    backgroundColor: HEAD_WHITE,
    borderColor: RIM_SILVER,
    marginLeft: 'auto',
  },
  pedalBase: {
    alignItems: 'center',
    backgroundColor: PEDAL_BLACK,
    borderColor: PEDAL_METAL,
    borderWidth: 1,
    justifyContent: 'flex-end',
    paddingBottom: 3,
  },
  pedalBeater: {
    backgroundColor: PEDAL_METAL,
  },
});
