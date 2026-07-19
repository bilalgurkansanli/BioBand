import { useState, type ReactNode } from 'react';
import { Animated, StyleSheet, View, type ViewStyle } from 'react-native';

import {
  DRUM_KIT_LAYOUT,
  type DrumLayoutItem,
} from '../../instruments/drums/drumKitLayout';
import { shade, tint } from '../../utils/colorMix';

// Default kit palette — mirrors the real DrumPiece fallbacks so the card
// art matches what the drums screen shows.
const GOLD = '#D4A72C';
const HEAD_COAT = '#F2EEE2';
const HOOP = '#8E949E';
const ACCENT = '#2A9D8F';
const SNARE_SHELL = '#B9BEC7';

/** Stage pieces drawn a bit larger so the kit reads at card size. */
const SIZE_BOOST = 1.35;

type DrumsArtProps = {
  /**
   * Optional hit animations per drum sound id (0 = rest, 1 = hit). Pieces
   * without an entry render static.
   */
  keyAnims?: Map<string, Animated.Value>;
};

function Disc({
  size,
  color,
  borderColor,
  borderWidth = 0,
  children,
  style,
}: {
  size: number;
  color?: string;
  borderColor?: string;
  borderWidth?: number;
  children?: ReactNode;
  style?: ViewStyle;
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

function CymbalArt({ id, size }: { id: string; size: number }) {
  const base =
    id === 'ride' ? shade(GOLD, 0.16) : id.startsWith('hihat') ? shade(GOLD, 0.06) : GOLD;
  return (
    <Disc size={size} color={shade(base, 0.18)} borderColor={shade(base, 0.5)} borderWidth={1}>
      <Disc size={size * 0.74} color={tint(base, 0.1)} />
      <Disc size={size * 0.5} color={tint(base, 0.24)} />
      <Disc size={size * 0.24} color={tint(base, 0.05)} borderColor={shade(base, 0.4)} borderWidth={1} />
    </Disc>
  );
}

function HeadArt({ kind, size }: { kind: 'tom' | 'snare'; size: number }) {
  const shell = kind === 'snare' ? SNARE_SHELL : shade(ACCENT, 0.15);
  const head = kind === 'snare' ? tint(HEAD_COAT, 0.3) : HEAD_COAT;
  const hoopW = Math.max(2, size * 0.06);
  return (
    <Disc size={size} color={shade(HOOP, 0.25)} borderColor={shade(HOOP, 0.55)} borderWidth={1}>
      <Disc size={size - hoopW * 2} color={shell} />
      <Disc size={size * 0.78} color={head}>
        <Disc size={size * 0.5} color={shade(head, 0.07)} />
        <Disc size={size * 0.22} color={shade(head, 0.16)} />
      </Disc>
    </Disc>
  );
}

function KickArt({ size }: { size: number }) {
  const shell = shade(ACCENT, 0.15);
  const batter = shade(HEAD_COAT, 0.82);
  const badge = size * 0.26;
  return (
    <Disc size={size} color={shade(shell, 0.35)} borderColor={shade(shell, 0.55)} borderWidth={1.5}>
      <Disc size={size * 0.82} color={batter} borderColor={shade(batter, 0.45)} borderWidth={1}>
        <Disc size={size * 0.56} color={tint(batter, 0.07)} />
      </Disc>
      <Disc size={badge} color={shade(ACCENT, 0.1)} borderColor={tint(ACCENT, 0.25)} borderWidth={1.5}>
        <Disc size={badge * 0.4} color={tint(ACCENT, 0.5)} />
      </Disc>
    </Disc>
  );
}

function pieceArt(item: DrumLayoutItem, size: number): ReactNode {
  switch (item.kind) {
    case 'cymbal':
      return <CymbalArt id={item.id} size={size} />;
    case 'tom':
    case 'snare':
      return <HeadArt kind={item.kind} size={size} />;
    case 'kick':
      return <KickArt size={size} />;
  }
}

/**
 * Decorative top-down drum kit drawn with plain views, using the real
 * stage layout so it matches the drums screen. Fills its parent — the
 * parent decides size, position, and opacity.
 */
export function DrumsArt({ keyAnims }: DrumsArtProps) {
  const [stage, setStage] = useState({ width: 0, height: 0 });
  const shorter = Math.min(stage.width, stage.height);

  return (
    <View
      pointerEvents="none"
      style={styles.container}
      onLayout={(event) => {
        const { width, height } = event.nativeEvent.layout;
        setStage({ width, height });
      }}
    >
      {shorter > 0
        ? DRUM_KIT_LAYOUT.map((item) => {
            const size = item.size * shorter * SIZE_BOOST;
            const anim = keyAnims?.get(item.id);
            return (
              <Animated.View
                key={item.id}
                style={[
                  styles.piece,
                  {
                    left: item.cx * stage.width - size / 2,
                    top: item.cy * stage.height - size / 2,
                    width: size,
                    height: size,
                  },
                  anim
                    ? {
                        transform: [
                          {
                            scale: anim.interpolate({
                              inputRange: [0, 1],
                              outputRange: [1, 0.93],
                            }),
                          },
                        ],
                      }
                    : null,
                ]}
              >
                {pieceArt(item, size)}
                {anim ? (
                  <Animated.View
                    pointerEvents="none"
                    style={[
                      styles.hitGlow,
                      {
                        width: size,
                        height: size,
                        borderRadius: size / 2,
                        opacity: anim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0, 0.45],
                        }),
                      },
                    ]}
                  />
                ) : null}
              </Animated.View>
            );
          })
        : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  piece: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'absolute',
  },
  disc: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'absolute',
  },
  hitGlow: {
    backgroundColor: '#FFFFFF',
    position: 'absolute',
  },
});
