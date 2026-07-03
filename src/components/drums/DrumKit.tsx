import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { DrumPiece } from './DrumPiece';
import { DRUM_KIT_LAYOUT } from '../../instruments/drums/drumKitLayout';
import { DRUM_PADS, type DrumSoundId } from '../../instruments/drums/drumsSounds';

type DrumKitProps = {
  width: number;
  height: number;
  onHit: (id: DrumSoundId) => void;
};

const STAGE_BG = '#141820';
const STAGE_BG_LIGHT = '#1C2330';

function KitCable({ x1, y1, x2, y2 }: { x1: number; y1: number; x2: number; y2: number }) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const length = Math.sqrt(dx * dx + dy * dy);
  const angle = (Math.atan2(dy, dx) * 180) / Math.PI;

  return (
    <View
      pointerEvents="none"
      style={[
        styles.cable,
        {
          left: x1,
          top: y1,
          width: length,
          transform: [{ rotate: `${angle}deg` }],
        },
      ]}
    />
  );
}

function pieceBounds(item: (typeof DRUM_KIT_LAYOUT)[number], size: number) {
  if (item.kind === 'kick') {
    return { width: size * 1.35, height: size * 0.85 + size * 0.04 + size * 0.28 };
  }
  if (item.kind === 'tom' || item.kind === 'snare') {
    return { width: size, height: size + size * 0.22 * 0.5 };
  }
  return { width: size, height: size };
}

export function DrumKit({ width, height, onHit }: DrumKitProps) {
  const { t } = useTranslation();
  const base = Math.min(width, height);

  const labelById = Object.fromEntries(DRUM_PADS.map((p) => [p.id, t(p.labelKey)]));

  const positions = DRUM_KIT_LAYOUT.map((item) => {
    const size = Math.floor(item.size * base);
    const cx = item.cx * width;
    const cy = item.cy * height;
    const bounds = pieceBounds(item, size);

    return {
      ...item,
      size,
      left: cx - bounds.width / 2,
      top: cy - bounds.height / 2,
      centerX: cx,
      centerY: cy,
    };
  });

  const snare = positions.find((p) => p.id === 'snare');
  const kick = positions.find((p) => p.id === 'kick');
  const hihat = positions.find((p) => p.id === 'hihatClosed');

  return (
    <View style={[styles.stage, { width, height }]}>
      <View pointerEvents="none" style={styles.textureOverlay} />

      {snare && kick ? (
        <KitCable
          x1={snare.centerX}
          y1={snare.centerY}
          x2={kick.centerX - kick.size * 0.2}
          y2={kick.centerY - kick.size * 0.15}
        />
      ) : null}
      {hihat && snare ? (
        <KitCable x1={hihat.centerX} y1={hihat.centerY} x2={snare.centerX - snare.size * 0.3} y2={snare.centerY} />
      ) : null}

      {positions.map((item) => (
        <View
          key={item.id}
          style={[
            styles.pieceWrap,
            {
              left: item.left,
              top: item.top,
            },
          ]}
        >
          <DrumPiece
            accessibilityLabel={labelById[item.id]}
            kind={item.kind}
            onHit={() => onHit(item.id)}
            size={item.size}
          />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  stage: {
    backgroundColor: STAGE_BG,
    borderRadius: 12,
    overflow: 'hidden',
  },
  textureOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: STAGE_BG_LIGHT,
    opacity: 0.15,
  },
  pieceWrap: {
    position: 'absolute',
  },
  cable: {
    backgroundColor: '#0A0A0A',
    height: 2,
    opacity: 0.35,
    position: 'absolute',
    transformOrigin: 'left center',
  },
});
