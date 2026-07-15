import { useRef } from 'react';
import { Animated, Pressable, StyleSheet, View, type ViewStyle } from 'react-native';

import type { DrumPieceKind } from '../../instruments/drums/drumKitLayout';
import type { DrumSoundId } from '../../instruments/drums/drumsSounds';

type DrumPieceProps = {
  kind: DrumPieceKind;
  soundId: DrumSoundId;
  size: number;
  onHit: () => void;
  accessibilityLabel: string;
  guided?: boolean;
  strongGuide?: boolean;
};

const CYMBAL = {
  outer: '#C9A227',
  mid: '#E0C04A',
  light: '#F5E6A8',
  dark: '#6E5214',
  bell: '#7A5C18',
};
const HEAD = { fill: '#F4F0E6', inner: '#E4DED0', rim: '#A8A8B0' };
const SHELL = { red: '#C0392B', dark: '#7A1212', snare: '#8E1B1B' };

function useHitFlash() {
  const flash = useRef(new Animated.Value(0)).current;

  const trigger = () => {
    flash.setValue(1);
    Animated.timing(flash, {
      toValue: 0,
      duration: 160,
      useNativeDriver: true,
    }).start();
  };

  return { flash, trigger };
}

function pieceShadow(size: number): ViewStyle {
  return {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: size * 0.05 },
    shadowOpacity: 0.4,
    shadowRadius: size * 0.1,
    elevation: 7,
  };
}

function CymbalPiece({
  size,
  soundId,
  flash,
  onPressIn,
}: {
  size: number;
  soundId: DrumSoundId;
  flash: Animated.Value;
  onPressIn: () => void;
}) {
  const isOpen = soundId === 'hihatOpen';
  const isHat = soundId === 'hihatClosed' || soundId === 'hihatOpen';
  const hitScale = flash.interpolate({ inputRange: [0, 1], outputRange: [1, 0.95] });
  const hitGlow = flash.interpolate({ inputRange: [0, 1], outputRange: [0, 0.45] });

  return (
    <Pressable onPressIn={onPressIn} style={{ width: size, height: size }}>
      <View style={styles.cymbalStandWrap}>
        <View style={[styles.cymbalStand, { height: size * 0.22, width: Math.max(2, size * 0.035) }]} />
        <View style={[styles.cymbalStandBase, { width: size * 0.18, height: size * 0.04 }]} />
      </View>

      {isHat && isOpen ? (
        <View
          style={[
            styles.cymbalDisc,
            {
              width: size * 0.88,
              height: size * 0.88,
              borderRadius: size * 0.44,
              top: size * 0.02,
              left: size * 0.06,
              opacity: 0.75,
              position: 'absolute',
            },
          ]}
        />
      ) : null}

      <Animated.View
        style={[
          styles.cymbalDisc,
          pieceShadow(size),
          {
            width: size * 0.92,
            height: size * 0.92,
            borderRadius: size * 0.46,
            marginTop: isOpen ? size * 0.06 : size * 0.04,
            marginLeft: size * 0.04,
            transform: [{ scale: hitScale }],
          },
        ]}
      >
        <View style={[styles.cymbalRing, { width: '82%', height: '82%', borderRadius: 999 }]}>
          <View style={[styles.cymbalRingMid, { width: '72%', height: '72%', borderRadius: 999 }]}>
            <View
              style={[
                styles.cymbalBell,
                {
                  width: isHat ? '22%' : '28%',
                  height: isHat ? '22%' : '28%',
                  borderRadius: 999,
                },
              ]}
            />
          </View>
        </View>
        <View style={[styles.cymbalShine, { width: '40%', height: '22%', borderRadius: 999 }]} />
        {isHat && !isOpen ? <View style={styles.cymbalHatEdge} /> : null}
        <Animated.View style={[styles.hitGlow, { borderRadius: 999, opacity: hitGlow }]} />
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
  const shellH = size * 0.22;
  const headScale = flash.interpolate({ inputRange: [0, 1], outputRange: [1, 0.94] });
  const hitGlow = flash.interpolate({ inputRange: [0, 1], outputRange: [0, 0.4] });
  const shellColor = kind === 'snare' ? SHELL.snare : SHELL.red;

  return (
    <Pressable onPressIn={onPressIn} style={{ width: size, height: size + shellH * 0.55 }}>
      <View style={{ alignItems: 'center' }}>
        <Animated.View
          style={[
            styles.drumHead,
            pieceShadow(size),
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              borderWidth: Math.max(2.5, size * 0.04),
              transform: [{ scale: headScale }],
            },
          ]}
        >
          <View
            style={[
              styles.drumHeadInner,
              { width: size * 0.78, height: size * 0.78, borderRadius: size * 0.39 },
            ]}
          />
          {/* Lug hints */}
          {[0, 60, 120, 180, 240, 300].map((deg) => {
            const rad = (deg * Math.PI) / 180;
            const r = size * 0.44;
            return (
              <View
                key={deg}
                style={[
                  styles.lug,
                  {
                    width: Math.max(3, size * 0.045),
                    height: Math.max(3, size * 0.045),
                    borderRadius: 99,
                    left: size / 2 + Math.cos(rad) * r - size * 0.022,
                    top: size / 2 + Math.sin(rad) * r - size * 0.022,
                  },
                ]}
              />
            );
          })}
          {kind === 'snare' ? (
            <View style={[styles.snareWires, { width: size * 0.55 }]}>
              {[0, 1, 2, 3].map((i) => (
                <View key={i} style={styles.snareWire} />
              ))}
            </View>
          ) : null}
          <View style={[styles.headShine, { width: size * 0.35, height: size * 0.18 }]} />
          <Animated.View style={[styles.hitGlow, { borderRadius: 999, opacity: hitGlow }]} />
        </Animated.View>

        <View
          style={[
            styles.shell,
            {
              width: size * 1.06,
              height: shellH,
              marginTop: -size * 0.08,
              backgroundColor: shellColor,
              borderBottomLeftRadius: size * 0.12,
              borderBottomRightRadius: size * 0.12,
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
  const w = size * 1.42;
  const h = size * 1.05;
  const headSize = size * 0.7;
  const headScale = flash.interpolate({ inputRange: [0, 1], outputRange: [1, 0.93] });
  const hitGlow = flash.interpolate({ inputRange: [0, 1], outputRange: [0, 0.35] });

  return (
    <Pressable onPressIn={onPressIn} style={{ width: w, height: h, alignItems: 'center' }}>
      <View style={[styles.kickShadow, { width: w * 0.7, height: h * 0.08 }]} />
      <View
        style={[
          styles.kickBody,
          pieceShadow(size),
          {
            width: w * 0.92,
            height: h * 0.62,
            borderRadius: h * 0.3,
          },
        ]}
      >
        <View style={[styles.kickRear, { width: w * 0.18, height: '78%', borderRadius: h * 0.2 }]} />
        <Animated.View
          style={[
            styles.kickHead,
            {
              width: headSize,
              height: headSize,
              borderRadius: headSize / 2,
              borderWidth: Math.max(2.5, headSize * 0.04),
              transform: [{ scale: headScale }],
            },
          ]}
        >
          <View
            style={[
              styles.drumHeadInner,
              { width: headSize * 0.72, height: headSize * 0.72, borderRadius: headSize * 0.36 },
            ]}
          />
          <Animated.View style={[styles.hitGlow, { borderRadius: 999, opacity: hitGlow }]} />
        </Animated.View>
      </View>

      <View style={[styles.pedalBase, { width: w * 0.34, height: h * 0.14, marginTop: size * 0.04 }]}>
        <View style={[styles.pedalBeater, { width: '32%', height: '42%' }]} />
      </View>
    </Pressable>
  );
}

export function DrumPiece({
  kind,
  soundId,
  size,
  onHit,
  accessibilityLabel,
  guided = false,
  strongGuide = true,
}: DrumPieceProps) {
  const { flash, trigger } = useHitFlash();

  const handlePressIn = () => {
    trigger();
    onHit();
  };

  const content = (() => {
    switch (kind) {
      case 'cymbal':
        return (
          <CymbalPiece flash={flash} onPressIn={handlePressIn} size={size} soundId={soundId} />
        );
      case 'tom':
        return <DrumHeadPiece flash={flash} kind="tom" onPressIn={handlePressIn} size={size} />;
      case 'snare':
        return <DrumHeadPiece flash={flash} kind="snare" onPressIn={handlePressIn} size={size} />;
      case 'kick':
        return <KickPiece flash={flash} onPressIn={handlePressIn} size={size} />;
    }
  })();

  const ringPad = strongGuide ? 6 : 3;

  return (
    <View
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      style={styles.pieceRoot}
    >
      {guided ? (
        <View
          pointerEvents="none"
          style={[
            styles.guideRing,
            {
              borderWidth: strongGuide ? 3 : 2,
              bottom: -ringPad,
              left: -ringPad,
              right: -ringPad,
              top: -ringPad,
            },
          ]}
        />
      ) : null}
      {content}
    </View>
  );
}

export function getDrumPieceBounds(kind: DrumPieceKind, size: number) {
  if (kind === 'kick') {
    return { width: size * 1.42, height: size * 1.05 };
  }
  if (kind === 'tom' || kind === 'snare') {
    return { width: size, height: size + size * 0.22 * 0.55 };
  }
  return { width: size, height: size };
}

const styles = StyleSheet.create({
  pieceRoot: {
    position: 'relative',
  },
  guideRing: {
    borderColor: '#FFD54F',
    borderRadius: 999,
    opacity: 0.9,
    position: 'absolute',
    zIndex: 2,
  },
  hitGlow: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#FFFFFF',
  },
  cymbalStandWrap: {
    alignItems: 'center',
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
  },
  cymbalStand: {
    backgroundColor: '#4A4A52',
    borderRadius: 1,
  },
  cymbalStandBase: {
    backgroundColor: '#2A2A30',
    borderRadius: 99,
    marginTop: 2,
    opacity: 0.7,
  },
  cymbalDisc: {
    alignItems: 'center',
    backgroundColor: CYMBAL.outer,
    borderColor: CYMBAL.dark,
    borderWidth: 1.5,
    justifyContent: 'center',
    overflow: 'hidden',
  },
  cymbalRing: {
    alignItems: 'center',
    borderColor: CYMBAL.light,
    borderWidth: 1.5,
    justifyContent: 'center',
    opacity: 0.9,
  },
  cymbalRingMid: {
    alignItems: 'center',
    borderColor: CYMBAL.dark,
    borderWidth: 1,
    justifyContent: 'center',
  },
  cymbalBell: {
    backgroundColor: CYMBAL.bell,
    borderColor: '#4A3A0C',
    borderWidth: 1,
  },
  cymbalShine: {
    backgroundColor: '#FFFFFF',
    left: '18%',
    opacity: 0.28,
    position: 'absolute',
    top: '18%',
  },
  cymbalHatEdge: {
    backgroundColor: CYMBAL.dark,
    bottom: '8%',
    height: '10%',
    left: '4%',
    opacity: 0.4,
    position: 'absolute',
    right: '4%',
    borderRadius: 99,
  },
  drumHead: {
    alignItems: 'center',
    backgroundColor: HEAD.fill,
    borderColor: HEAD.rim,
    justifyContent: 'center',
    overflow: 'hidden',
  },
  drumHeadInner: {
    backgroundColor: HEAD.inner,
    opacity: 0.55,
  },
  lug: {
    backgroundColor: '#D4D4DC',
    borderColor: '#5A5A62',
    borderWidth: 0.8,
    position: 'absolute',
  },
  snareWires: {
    bottom: '16%',
    gap: 3,
    position: 'absolute',
  },
  snareWire: {
    backgroundColor: '#6A6A70',
    height: 1.5,
    opacity: 0.45,
    width: '100%',
  },
  headShine: {
    backgroundColor: '#FFFFFF',
    borderRadius: 99,
    left: '18%',
    opacity: 0.28,
    position: 'absolute',
    top: '18%',
  },
  shell: {
    borderColor: SHELL.dark,
    borderWidth: 1,
  },
  kickShadow: {
    backgroundColor: '#000',
    borderRadius: 99,
    bottom: '8%',
    opacity: 0.3,
    position: 'absolute',
  },
  kickBody: {
    alignItems: 'center',
    backgroundColor: '#C0392B',
    borderColor: '#5C1512',
    borderWidth: 1.5,
    flexDirection: 'row',
    justifyContent: 'flex-start',
    overflow: 'hidden',
    paddingHorizontal: 10,
  },
  kickRear: {
    backgroundColor: '#8A1E18',
    opacity: 0.7,
  },
  kickHead: {
    alignItems: 'center',
    backgroundColor: HEAD.fill,
    borderColor: HEAD.rim,
    justifyContent: 'center',
    marginLeft: 'auto',
    overflow: 'hidden',
  },
  pedalBase: {
    alignItems: 'center',
    backgroundColor: '#1C1C20',
    borderColor: '#6B6B72',
    borderRadius: 6,
    borderWidth: 1,
    justifyContent: 'flex-end',
    paddingBottom: 4,
  },
  pedalBeater: {
    backgroundColor: '#8A8A90',
    borderRadius: 3,
  },
});
