import { useCallback, useEffect, useMemo, useRef, type ReactNode } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text } from 'react-native';
import { useIsFocused } from '@react-navigation/native';

import { colors } from '../../theme/colors';

/** How long the card art takes to come forward and the texts to clear. */
const POP_MS = 350;
/**
 * The art renders fully opaque under this dark veil — fading the art itself
 * makes Android blend each piece separately (black piano keys turned
 * see-through). The veil dims everything uniformly and lifts on tap.
 */
const VEIL_REST_OPACITY = 0.6;

export type IntroMotifStep = {
  /** Sound key — must match an entry the art knows how to animate. */
  key: string;
  atMs: number;
};

type InstrumentIntroCardProps = {
  title: string;
  description: string;
  /** Full-card art; hitAnims has one value (0=rest, 1=hit) per motif key. */
  renderArt: (hitAnims: Map<string, Animated.Value>) => ReactNode;
  /** Short opening motif, ordered by atMs; the last step is the handover. */
  motif: IntroMotifStep[];
  /** Fire-and-forget sample preload — the sequence NEVER waits on it. */
  preload: () => Promise<void>;
  /** Plays one motif sound; must silently no-op until preload lands. */
  playSound: (key: string) => void;
  /** The intro started — the parent should block the rest of the screen. */
  onIntroStart?: () => void;
  /** The intro finished — open the real instrument screen. */
  onFinished: () => void;
};

/**
 * An instrument's list card: its art covers the whole card with the texts on
 * top. Tapping brings the art forward, clears the texts, auto-plays a short
 * opening motif on the art, and hands over to the real screen on the exact
 * tick of the final note — the sound bridges the transition, zero idle time.
 */
export function InstrumentIntroCard({
  title,
  description,
  renderArt,
  motif,
  preload,
  playSound,
  onIntroStart,
  onFinished,
}: InstrumentIntroCardProps) {
  const isFocused = useIsFocused();
  const introAnim = useRef(new Animated.Value(0)).current;
  const hitAnims = useMemo(() => {
    const map = new Map<string, Animated.Value>();
    for (const step of motif) {
      map.set(step.key, new Animated.Value(0));
    }
    return map;
    // Each wrapper passes a motif that is stable for the component's
    // lifetime (module constant or mount-time memo) — built once on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sequencing flags in one ref so animation callbacks, timers, and the
  // blur reset all agree without re-renders.
  const stateRef = useRef({
    running: false,
    motifStarted: false,
    finishing: false,
  });
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const onFinishedRef = useRef(onFinished);
  onFinishedRef.current = onFinished;

  const finish = useCallback(() => {
    const state = stateRef.current;
    if (!state.running || state.finishing) {
      return;
    }
    state.finishing = true;
    onFinishedRef.current();
  }, []);

  const hit = useCallback(
    (key: string) => {
      const anim = hitAnims.get(key);
      if (!anim) {
        return;
      }
      Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration: 70, useNativeDriver: true }),
        Animated.timing(anim, {
          toValue: 0,
          duration: 300,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
      ]).start();
      playSound(key);
    },
    [hitAnims, playSound],
  );

  /**
   * Runs as soon as the art is forward — never waits for sample loading.
   * If the sounds aren't in yet the art animates silently and the target
   * screen's own loading UI takes over after the handover.
   */
  const startMotif = useCallback(() => {
    const state = stateRef.current;
    if (!state.running || state.finishing || state.motifStarted) {
      return;
    }
    state.motifStarted = true;
    for (const { key, atMs } of motif) {
      timersRef.current.push(
        setTimeout(() => {
          if (stateRef.current.running) {
            hit(key);
          }
        }, atMs),
      );
    }
    // Hand over on the very tick of the final step — its timer was pushed
    // first, so the sound fires and the screen switches in the same frame.
    timersRef.current.push(
      setTimeout(finish, motif[motif.length - 1].atMs),
    );
  }, [finish, hit, motif]);

  const handlePress = () => {
    const state = stateRef.current;
    if (state.running) {
      return;
    }
    state.running = true;
    onIntroStart?.();

    // Best effort: the samples usually decode during the pop, making the
    // motif audible. If they don't make it, so be it — the sequence never
    // waits on loading (a visible stall reads worse than a silent motif).
    preload().catch((err: unknown) => {
      console.error(`${title} intro preload failed:`, err);
    });

    Animated.timing(introAnim, {
      toValue: 1,
      duration: POP_MS,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) {
        startMotif();
      }
    });
  };

  // Losing focus ends the intro — either our own navigation or the user
  // switching screens mid-intro. Rewind so the card is at rest on return.
  useEffect(() => {
    if (isFocused) {
      return;
    }
    for (const timer of timersRef.current) {
      clearTimeout(timer);
    }
    timersRef.current = [];
    introAnim.stopAnimation();
    introAnim.setValue(0);
    for (const anim of hitAnims.values()) {
      anim.stopAnimation();
      anim.setValue(0);
    }
    stateRef.current = {
      running: false,
      motifStarted: false,
      finishing: false,
    };
  }, [isFocused, introAnim, hitAnims]);

  useEffect(() => {
    return () => {
      for (const timer of timersRef.current) {
        clearTimeout(timer);
      }
    };
  }, []);

  return (
    <Pressable
      accessibilityLabel={title}
      accessibilityRole="button"
      onPress={handlePress}
      style={({ pressed }) => [
        styles.card,
        pressed && !stateRef.current.running && styles.pressed,
      ]}
    >
      <Animated.View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFill,
          {
            transform: [
              {
                scale: introAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [1, 1.06],
                }),
              },
            ],
          },
        ]}
      >
        {renderArt(hitAnims)}
      </Animated.View>

      <Animated.View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFill,
          styles.veil,
          {
            opacity: introAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [VEIL_REST_OPACITY, 0],
            }),
          },
        ]}
      />

      <Animated.View
        pointerEvents="none"
        style={[
          styles.textBlock,
          {
            opacity: introAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [1, 0],
            }),
            transform: [
              {
                translateY: introAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, -8],
                }),
              },
            ],
          },
        ]}
      >
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.description}>{description}</Text>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: 'center',
    marginBottom: 12,
    minHeight: 128,
    // Clips the art to the rounded corners.
    overflow: 'hidden',
  },
  pressed: {
    opacity: 0.85,
  },
  veil: {
    backgroundColor: colors.surface,
  },
  textBlock: {
    alignItems: 'center',
    padding: 16,
  },
  title: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 4,
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.7)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  },
  description: {
    color: colors.text,
    fontSize: 14,
    lineHeight: 20,
    opacity: 0.85,
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.7)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  },
});
