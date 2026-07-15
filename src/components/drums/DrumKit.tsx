import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { DrumPiece, getDrumPieceBounds } from './DrumPiece';
import { DRUM_KIT_LAYOUT } from '../../instruments/drums/drumKitLayout';
import { DRUM_PADS, type DrumSoundId } from '../../instruments/drums/drumsSounds';

type DrumKitProps = {
  width: number;
  height: number;
  onHit: (id: DrumSoundId) => void;
  guidePadId?: DrumSoundId | null;
  strongGuide?: boolean;
  showPadLabels?: boolean;
  stageBg?: string;
  stageOverlay?: string;
};

const STAGE_BG = '#12161E';
const STAGE_BG_LIGHT = '#1A2230';

function StageBackdrop({
  width,
  height,
  stageBg,
  stageOverlay,
}: {
  width: number;
  height: number;
  stageBg: string;
  stageOverlay: string;
}) {
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: stageBg }]}>
      <View
        style={[
          styles.stageTopWash,
          { backgroundColor: stageOverlay, height: height * 0.35 },
        ]}
      />
      <View
        style={[
          styles.floorOval,
          {
            width: width * 0.84,
            height: height * 0.42,
            left: width * 0.08,
            top: height * 0.52,
          },
        ]}
      />
      <View style={[styles.vignetteTop, { height: height * 0.18 }]} />
      <View style={[styles.vignetteBottom, { height: height * 0.22 }]} />
    </View>
  );
}

function HardwareStands({
  width,
  height,
  positions,
}: {
  width: number;
  height: number;
  positions: Array<{
    id: DrumSoundId;
    kind: string;
    centerX: number;
    centerY: number;
    size: number;
  }>;
}) {
  const byId = Object.fromEntries(positions.map((p) => [p.id, p]));
  const crash = byId.crash;
  const ride = byId.ride;
  const hat = byId.hihatClosed;

  const stand = (
    fromX: number,
    fromY: number,
    toX: number,
    toY: number,
    key: string,
  ) => {
    const dx = toX - fromX;
    const dy = toY - fromY;
    const length = Math.sqrt(dx * dx + dy * dy);
    const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
    return (
      <View
        key={key}
        pointerEvents="none"
        style={[
          styles.standLine,
          {
            left: fromX,
            top: fromY,
            width: length,
            transform: [{ rotate: `${angle}deg` }],
          },
        ]}
      />
    );
  };

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {crash
        ? stand(
            crash.centerX,
            crash.centerY + crash.size * 0.35,
            crash.centerX - width * 0.02,
            height * 0.78,
            'crash-stand',
          )
        : null}
      {ride
        ? stand(
            ride.centerX,
            ride.centerY + ride.size * 0.35,
            ride.centerX + width * 0.02,
            height * 0.78,
            'ride-stand',
          )
        : null}
      {hat
        ? stand(
            hat.centerX,
            hat.centerY + hat.size * 0.4,
            hat.centerX - width * 0.01,
            height * 0.8,
            'hat-stand',
          )
        : null}
    </View>
  );
}

export function DrumKit({
  width,
  height,
  onHit,
  guidePadId = null,
  strongGuide = true,
  showPadLabels = false,
  stageBg = STAGE_BG,
  stageOverlay = STAGE_BG_LIGHT,
}: DrumKitProps) {
  const { t } = useTranslation();
  const base = Math.min(width, height);

  const labelById = Object.fromEntries(DRUM_PADS.map((p) => [p.id, t(p.labelKey)]));

  const positions = DRUM_KIT_LAYOUT.map((item) => {
    const size = Math.floor(item.size * base);
    const cx = item.cx * width;
    const cy = item.cy * height;
    const bounds = getDrumPieceBounds(item.kind, size);

    return {
      ...item,
      size,
      left: cx - bounds.width / 2,
      top: cy - bounds.height / 2,
      centerX: cx,
      centerY: cy,
    };
  });

  const drawOrder = [...positions].sort((a, b) => {
    const rank = (kind: string) =>
      kind === 'kick' ? 0 : kind === 'tom' || kind === 'snare' ? 1 : 2;
    const d = rank(a.kind) - rank(b.kind);
    return d !== 0 ? d : a.centerY - b.centerY;
  });

  return (
    <View style={[styles.stage, { width, height, backgroundColor: stageBg }]}>
      <StageBackdrop
        height={height}
        stageBg={stageBg}
        stageOverlay={stageOverlay}
        width={width}
      />
      <HardwareStands height={height} positions={positions} width={width} />

      {drawOrder.map((item) => (
        <View
          key={item.id}
          style={[
            styles.pieceWrap,
            {
              left: item.left,
              top: item.top,
              zIndex: item.kind === 'cymbal' ? 3 : item.kind === 'kick' ? 1 : 2,
            },
          ]}
        >
          <DrumPiece
            accessibilityLabel={labelById[item.id]}
            guided={guidePadId === item.id}
            kind={item.kind}
            onHit={() => onHit(item.id)}
            size={item.size}
            soundId={item.id}
            strongGuide={strongGuide}
          />
          {showPadLabels ? (
            <Text numberOfLines={1} style={styles.padLabel}>
              {labelById[item.id]}
            </Text>
          ) : null}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  stage: {
    borderRadius: 14,
    overflow: 'hidden',
  },
  stageTopWash: {
    left: 0,
    opacity: 0.45,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  floorOval: {
    backgroundColor: '#1E2636',
    borderColor: '#3A4558',
    borderRadius: 999,
    borderWidth: 1,
    opacity: 0.55,
    position: 'absolute',
  },
  vignetteTop: {
    backgroundColor: '#000',
    left: 0,
    opacity: 0.28,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  vignetteBottom: {
    backgroundColor: '#000',
    bottom: 0,
    left: 0,
    opacity: 0.35,
    position: 'absolute',
    right: 0,
  },
  standLine: {
    backgroundColor: '#5A5A64',
    height: 2.5,
    opacity: 0.55,
    position: 'absolute',
    transformOrigin: 'left center',
  },
  pieceWrap: {
    position: 'absolute',
  },
  padLabel: {
    color: '#D0D4DC',
    fontSize: 9,
    fontWeight: '600',
    marginTop: 2,
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
});
