import { useCallback, useEffect, useRef, type ReactNode } from 'react';
import {
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  View,
  type GestureResponderEvent,
  type ViewStyle,
} from 'react-native';

import type { DrumPieceKind } from '../../instruments/drums/drumKitLayout';
import type { DrumSoundId } from '../../instruments/drums/drumsSounds';
import { getMetronomeBpm } from '../../instruments/piano/pianoMetronome';
import { shade, tint } from '../../utils/colorMix';
import { SCREEN_READER_HIDDEN } from '../../utils/accessibility';

type DrumPieceProps = {
  kind: DrumPieceKind;
  soundId: DrumSoundId;
  size: number;
  /** Fired per hit with the resolved sound (snare rim zone → snareRim) and 0..1 velocity. */
  onHit: (soundId: DrumSoundId, velocity: number) => void;
  /** Grab-choke a ringing cymbal (long-press on cymbals). */
  onChoke?: (soundId: DrumSoundId) => void;
  accessibilityLabel: string;
  /** Kit theme accent — badge / detail tint. */
  accent?: string;
  /** Tom / kick shell wrap color. */
  shellColor?: string;
  /** Cymbal alloy base color. */
  cymbalColor?: string;
  /** Drum head (batter) color. */
  headColor?: string;
  guided?: boolean;
  strongGuide?: boolean;
};

/** Center hit = 1, edge hit ≈ 0.55 — natural dynamics from touch position. */
function velocityFromTouch(
  event: GestureResponderEvent,
  size: number,
): { velocity: number; edgeRatio: number } {
  const { locationX, locationY } = event.nativeEvent;
  if (typeof locationX !== 'number' || typeof locationY !== 'number') {
    return { velocity: 1, edgeRatio: 0 };
  }
  const dx = locationX - size / 2;
  const dy = locationY - size / 2;
  const edgeRatio = Math.min(1, Math.sqrt(dx * dx + dy * dy) / (size / 2));
  return { velocity: 1 - 0.45 * edgeRatio, edgeRatio };
}

/** Snare outer ring plays the side-stick / rim click. */
const RIM_ZONE_RATIO = 0.72;
/** Hold a snare/tom this long to start a BPM-locked roll. */
const ROLL_START_MS = 280;
/** Hold a cymbal this long to grab-choke it. */
const CHOKE_HOLD_MS = 400;

const DEFAULT_ACCENT = '#2A9D8F';
const GOLD = '#D4A72C';
const HEAD_COAT = '#F2EEE2';
const HOOP = '#8E949E';

function pieceShadow(size: number): ViewStyle {
  return {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: size * 0.06 },
    shadowOpacity: 0.45,
    shadowRadius: size * 0.12,
    elevation: 8,
  };
}

/** Centered circle — building block for the concentric “radial gradient” look. */
function Disc({
  size,
  color,
  borderColor,
  borderWidth = 0,
  style,
  children,
}: {
  size: number;
  color?: string;
  borderColor?: string;
  borderWidth?: number;
  style?: ViewStyle;
  children?: ReactNode;
}) {
  return (
    <View
      pointerEvents="none"
      style={[
        styles.disc,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
          borderColor,
          borderWidth,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

function useHitFlash() {
  const flash = useRef(new Animated.Value(0)).current;

  const trigger = () => {
    flash.setValue(1);
    Animated.timing(flash, {
      toValue: 0,
      duration: 170,
      useNativeDriver: true,
    }).start();
  };

  return { flash, trigger };
}

/** Pulsing halo shown on the pad the tutorial wants you to hit. */
function GuidePulse({ size, strong }: { size: number; strong: boolean }) {
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 460,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 460,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  const scale = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [1, strong ? 1.1 : 1.05],
  });
  const opacity = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [strong ? 0.95 : 0.75, strong ? 0.55 : 0.4],
  });

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.guideRing,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: strong ? Math.max(3, size * 0.035) : 2,
          opacity,
          transform: [{ scale }],
        },
      ]}
    />
  );
}

function HitGlow({ flash, size }: { flash: Animated.Value; size: number }) {
  const opacity = flash.interpolate({ inputRange: [0, 1], outputRange: [0, 0.4] });
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.hitGlow,
        { width: size, height: size, borderRadius: size / 2, opacity },
      ]}
    />
  );
}

// ---- cymbals (crash / ride / hi-hats) ----

function CymbalPiece({
  size,
  soundId,
  cymbalColor,
  flash,
  wobble,
  onPressIn,
  onLongPress,
  delayLongPress,
}: {
  size: number;
  soundId: DrumSoundId;
  cymbalColor: string;
  flash: Animated.Value;
  wobble: Animated.Value;
  onPressIn: (event: GestureResponderEvent) => void;
  onLongPress?: () => void;
  delayLongPress?: number;
}) {
  const isHat = soundId === 'hihatClosed' || soundId === 'hihatOpen';
  const isOpen = soundId === 'hihatOpen';
  const isRide = soundId === 'ride';

  // Ride reads darker / more bronze; crash and hats brighter.
  const base = isRide
    ? shade(cymbalColor, 0.16)
    : isHat
      ? shade(cymbalColor, 0.06)
      : cymbalColor;
  const scale = flash.interpolate({ inputRange: [0, 1], outputRange: [1, 0.95] });
  // Damped see-saw: the disc rocks after a hit and settles back.
  const rock = wobble.interpolate({
    inputRange: [0, 0.18, 0.4, 0.65, 1],
    outputRange: ['0deg', '-5deg', '3.5deg', '-1.5deg', '0deg'],
  });

  const disc = size * 0.96;
  const bell = isHat ? disc * 0.2 : isRide ? disc * 0.3 : disc * 0.26;

  return (
    <Pressable
      {...SCREEN_READER_HIDDEN}
      delayLongPress={delayLongPress}
      onLongPress={onLongPress}
      onPressIn={onPressIn}
      style={{ width: size, height: size }}
    >
      {/* Bottom hi-hat cymbal peeks out under the top one. */}
      {isHat ? (
        <Disc
          size={disc}
          color={shade(base, 0.35)}
          borderColor={shade(base, 0.55)}
          borderWidth={1}
          style={{
            position: 'absolute',
            left: (size - disc) / 2 + size * (isOpen ? 0.05 : 0.02),
            top: (size - disc) / 2 + size * (isOpen ? 0.07 : 0.035),
          }}
        />
      ) : null}

      <Animated.View
        style={[
          styles.center,
          pieceShadow(size),
          { width: size, height: size, transform: [{ scale }, { rotate: rock }] },
        ]}
      >
        {/* Concentric tonal rings fake a lit metal dome. */}
        <Disc size={disc} color={shade(base, 0.22)} borderColor={shade(base, 0.5)} borderWidth={1.5}>
          <Disc size={disc * 0.86} color={shade(base, 0.08)} />
          <Disc size={disc * 0.68} color={tint(base, 0.1)} />
          <Disc size={disc * 0.5} color={tint(base, 0.22)} />
          {/* lathe grooves */}
          <Disc size={disc * 0.9} color="transparent" borderColor="rgba(0,0,0,0.14)" borderWidth={1} />
          <Disc size={disc * 0.58} color="transparent" borderColor="rgba(0,0,0,0.12)" borderWidth={1} />
          {/* bell */}
          <Disc size={bell} color={tint(base, 0.05)} borderColor={shade(base, 0.4)} borderWidth={1}>
            <Disc size={bell * 0.55} color={tint(base, 0.45)} />
          </Disc>
          {/* shine wedge */}
          <View
            style={[
              styles.shine,
              {
                width: disc * 0.62,
                height: disc * 0.16,
                borderRadius: disc * 0.1,
                top: disc * 0.12,
                left: disc * 0.08,
                transform: [{ rotate: '-24deg' }],
              },
            ]}
          />
        </Disc>
        <HitGlow flash={flash} size={disc} />
      </Animated.View>
    </Pressable>
  );
}

// ---- toms & snare ----

function DrumHeadPiece({
  size,
  kind,
  shellColor: shellBase,
  headColor,
  flash,
  onPressIn,
  onLongPress,
  onPressOut,
  delayLongPress,
}: {
  size: number;
  kind: 'tom' | 'snare';
  shellColor: string;
  headColor: string;
  flash: Animated.Value;
  onPressIn: (event: GestureResponderEvent) => void;
  onLongPress?: () => void;
  onPressOut?: () => void;
  delayLongPress?: number;
}) {
  const scale = flash.interpolate({ inputRange: [0, 1], outputRange: [1, 0.94] });
  const hoopW = Math.max(3, size * 0.055);
  const shellW = Math.max(2.5, size * 0.05);
  const shellColor = kind === 'snare' ? '#B9BEC7' : shellBase;
  const head = kind === 'snare' ? tint(headColor, 0.3) : headColor;

  const lugCount = 8;
  const lugSize = Math.max(3, size * 0.05);
  const lugR = size / 2 - hoopW / 2;

  return (
    <Pressable
      {...SCREEN_READER_HIDDEN}
      delayLongPress={delayLongPress}
      onLongPress={onLongPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      style={{ width: size, height: size }}
    >
      <Animated.View
        style={[
          styles.center,
          pieceShadow(size),
          { width: size, height: size, transform: [{ scale }] },
        ]}
      >
        {/* hoop */}
        <Disc size={size} color={shade(HOOP, 0.25)} borderColor={shade(HOOP, 0.55)} borderWidth={1}>
          {/* shell ring (kit accent on toms, steel on snare) */}
          <Disc size={size - hoopW * 2} color={shellColor} />
          {/* head with concentric wear rings */}
          <Disc size={size - hoopW * 2 - shellW * 2} color={head}>
            <Disc size={size * 0.66} color={shade(head, 0.05)} />
            <Disc size={size * 0.42} color={shade(head, 0.1)} />
            <Disc size={size * 0.16} color={shade(head, 0.18)} />
          </Disc>
          <View
            style={[
              styles.shine,
              {
                width: size * 0.4,
                height: size * 0.14,
                borderRadius: size * 0.08,
                top: size * 0.16,
                left: size * 0.14,
                transform: [{ rotate: '-24deg' }],
              },
            ]}
          />
        </Disc>

        {/* lugs on the hoop */}
        {Array.from({ length: lugCount }, (_, i) => {
          const angle = (i / lugCount) * Math.PI * 2 - Math.PI / 2;
          return (
            <View
              key={i}
              pointerEvents="none"
              style={[
                styles.lug,
                {
                  width: lugSize,
                  height: lugSize,
                  borderRadius: lugSize / 2,
                  left: size / 2 + Math.cos(angle) * lugR - lugSize / 2,
                  top: size / 2 + Math.sin(angle) * lugR - lugSize / 2,
                },
              ]}
            />
          );
        })}

        <HitGlow flash={flash} size={size} />
      </Animated.View>
    </Pressable>
  );
}

// ---- kick (top-down bass drum) ----

function KickPiece({
  size,
  accent,
  shellColor,
  headColor,
  flash,
  onPressIn,
}: {
  size: number;
  accent: string;
  shellColor: string;
  headColor: string;
  flash: Animated.Value;
  onPressIn: (event: GestureResponderEvent) => void;
}) {
  const scale = flash.interpolate({ inputRange: [0, 1], outputRange: [1, 0.96] });
  const shellW = Math.max(5, size * 0.09);
  const headSize = size - shellW * 2;
  const badge = size * 0.24;
  // Batter head: near-black version of the kit head color.
  const batter = shade(headColor, 0.82);

  return (
    <Pressable
      {...SCREEN_READER_HIDDEN}
      onPressIn={onPressIn}
      style={{ width: size, height: size }}
    >
      <Animated.View
        style={[
          styles.center,
          pieceShadow(size),
          { width: size, height: size, transform: [{ scale }] },
        ]}
      >
        {/* shell — thick ring in the kit wrap color */}
        <Disc
          size={size}
          color={shade(shellColor, 0.35)}
          borderColor={shade(shellColor, 0.55)}
          borderWidth={1.5}
        >
          <Disc size={size - shellW} color={shade(shellColor, 0.18)} />
          {/* dark batter head */}
          <Disc size={headSize} color={batter} borderColor={shade(batter, 0.45)} borderWidth={1}>
            <Disc size={headSize * 0.7} color={tint(batter, 0.05)} />
            <Disc size={headSize * 0.44} color={tint(batter, 0.1)} />
          </Disc>
          {/* center badge */}
          <Disc size={badge} color={shade(accent, 0.1)} borderColor={tint(accent, 0.25)} borderWidth={1.5}>
            <Disc size={badge * 0.4} color={tint(accent, 0.5)} />
          </Disc>
          {/* beater wear mark above the badge */}
          <View
            style={[
              styles.beaterMark,
              {
                width: size * 0.1,
                height: size * 0.1,
                borderRadius: size * 0.05,
                top: size * 0.2,
              },
            ]}
          />
          <View
            style={[
              styles.shine,
              {
                width: size * 0.5,
                height: size * 0.15,
                borderRadius: size * 0.09,
                top: size * 0.13,
                left: size * 0.12,
                transform: [{ rotate: '-24deg' }],
              },
            ]}
          />
        </Disc>
        <HitGlow flash={flash} size={size} />
      </Animated.View>
    </Pressable>
  );
}

export function DrumPiece({
  kind,
  soundId,
  size,
  onHit,
  onChoke,
  accessibilityLabel,
  accent = DEFAULT_ACCENT,
  shellColor,
  cymbalColor = GOLD,
  headColor = HEAD_COAT,
  guided = false,
  strongGuide = true,
}: DrumPieceProps) {
  const { flash, trigger } = useHitFlash();
  const wobble = useRef(new Animated.Value(0)).current;
  const rollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const shell = shellColor ?? shade(accent, 0.15);

  const triggerWobble = useCallback(() => {
    wobble.setValue(0);
    Animated.timing(wobble, {
      toValue: 1,
      duration: 560,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();
  }, [wobble]);

  const stopRoll = useCallback(() => {
    if (rollTimerRef.current) {
      clearInterval(rollTimerRef.current);
      rollTimerRef.current = null;
    }
  }, []);

  useEffect(() => stopRoll, [stopRoll]);

  const handlePressIn = (event: GestureResponderEvent) => {
    const { velocity, edgeRatio } = velocityFromTouch(event, size);
    const resolved: DrumSoundId =
      kind === 'snare' && edgeRatio > RIM_ZONE_RATIO ? 'snareRim' : soundId;
    trigger();
    if (kind === 'cymbal') {
      triggerWobble();
    }
    onHit(resolved, velocity);
  };

  /** Hold a snare/tom: 16th-note buzz roll locked to the metronome BPM. */
  const startRoll = useCallback(() => {
    stopRoll();
    const bpm = getMetronomeBpm() || 100;
    const intervalMs = Math.max(60, 60000 / bpm / 4);
    let accented = false;
    rollTimerRef.current = setInterval(() => {
      accented = !accented;
      trigger();
      onHit(soundId, accented ? 0.75 : 0.55);
    }, intervalMs);
  }, [onHit, soundId, stopRoll, trigger]);

  const handleChoke = useCallback(() => {
    // Kill the wobble along with the sound — the grab looks instant.
    wobble.stopAnimation();
    wobble.setValue(1);
    onChoke?.(soundId);
  }, [onChoke, soundId, wobble]);

  const content = (() => {
    switch (kind) {
      case 'cymbal':
        return (
          <CymbalPiece
            cymbalColor={cymbalColor}
            delayLongPress={CHOKE_HOLD_MS}
            flash={flash}
            onLongPress={onChoke ? handleChoke : undefined}
            onPressIn={handlePressIn}
            size={size}
            soundId={soundId}
            wobble={wobble}
          />
        );
      case 'tom':
        return (
          <DrumHeadPiece
            delayLongPress={ROLL_START_MS}
            flash={flash}
            headColor={headColor}
            kind="tom"
            onLongPress={startRoll}
            onPressIn={handlePressIn}
            onPressOut={stopRoll}
            shellColor={shell}
            size={size}
          />
        );
      case 'snare':
        return (
          <DrumHeadPiece
            delayLongPress={ROLL_START_MS}
            flash={flash}
            headColor={headColor}
            kind="snare"
            onLongPress={startRoll}
            onPressIn={handlePressIn}
            onPressOut={stopRoll}
            shellColor={shell}
            size={size}
          />
        );
      case 'kick':
        return (
          <KickPiece
            accent={accent}
            flash={flash}
            headColor={headColor}
            onPressIn={handlePressIn}
            shellColor={shell}
            size={size}
          />
        );
    }
  })();

  return (
    <View
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      style={[styles.pieceRoot, { width: size, height: size }]}
    >
      {guided ? <GuidePulse size={size} strong={strongGuide} /> : null}
      {content}
    </View>
  );
}

export function getDrumPieceBounds(_kind: DrumPieceKind, size: number) {
  return { width: size, height: size };
}

const styles = StyleSheet.create({
  pieceRoot: {
    position: 'relative',
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  disc: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'absolute',
  },
  guideRing: {
    borderColor: '#FFD54F',
    position: 'absolute',
    zIndex: 2,
  },
  hitGlow: {
    backgroundColor: '#FFFFFF',
    position: 'absolute',
  },
  shine: {
    backgroundColor: '#FFFFFF',
    opacity: 0.16,
    position: 'absolute',
  },
  lug: {
    backgroundColor: '#CDD2DA',
    borderColor: '#4E545E',
    borderWidth: 0.8,
    position: 'absolute',
  },
  beaterMark: {
    backgroundColor: '#3A4150',
    opacity: 0.8,
    position: 'absolute',
  },
});
