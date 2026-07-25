import { memo, useMemo, useRef, useState } from 'react';
import {
  Animated,
  PanResponder,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  Vibration,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';

import { colors } from '../../../theme/colors';
import { formatDuration } from '../../../utils/formatDuration';
import { INSTRUMENT_TITLE_KEYS } from '../../../utils/recordingLabels';
import type { StudioTrack } from '../../../types/studio';
import { getTrackStartMs } from '../../../types/studio';
import { LANE_HEIGHT, withAlpha } from './timelineGeometry';

const DRAG_THRESHOLD = 6;

type Props = {
  track: StudioTrack;
  pxPerMs: number;
  /** Grid quantize step (ms) applied when a drag is released. */
  snapMs: number;
  color: string;
  onCommitStart: (startMs: number) => void;
  onPress: () => void;
};

function hashSeed(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Heights (0..1) for the little bar strip drawn inside a clip. */
function computeBars(track: StudioTrack, barCount: number): number[] {
  if (barCount <= 0) {
    return [];
  }
  if (track.mode === 'instrument' && track.events && track.events.length > 0) {
    const buckets = new Array(barCount).fill(0);
    const dur = track.durationMs || 1;
    for (const event of track.events) {
      const i = Math.max(0, Math.min(barCount - 1, Math.floor((event.atMs / dur) * barCount)));
      buckets[i] = Math.max(buckets[i], event.velocity ?? 0.8);
    }
    return buckets.map((v) => (v > 0 ? 0.35 + 0.6 * Math.min(1, v) : 0.12));
  }
  // Mic (or empty) tracks: a deterministic pseudo-waveform from the track id.
  const rng = mulberry32(hashSeed(track.id));
  const out: number[] = [];
  for (let i = 0; i < barCount; i += 1) {
    out.push(0.25 + rng() * 0.7);
  }
  return out;
}

function StudioTimelineClipBase({ track, pxPerMs, snapMs, color, onCommitStart, onPress }: Props) {
  const { t } = useTranslation();
  const startMs = getTrackStartMs(track);
  const width = Math.max(24, track.durationMs * pxPerMs);
  const left = startMs * pxPerMs;

  const dragX = useRef(new Animated.Value(0)).current;
  const [dragging, setDragging] = useState(false);
  const startMsRef = useRef(startMs);
  startMsRef.current = startMs;

  const barCount = Math.max(6, Math.min(200, Math.round(width / 5)));
  const bars = useMemo(
    () => computeBars(track, barCount),
    // Recompute only when the shape inputs change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [track.id, track.mode, track.events, barCount],
  );

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => false,
        onStartShouldSetPanResponderCapture: () => false,
        onMoveShouldSetPanResponder: (_evt, gesture) =>
          Math.abs(gesture.dx) > DRAG_THRESHOLD &&
          Math.abs(gesture.dx) > Math.abs(gesture.dy),
        onMoveShouldSetPanResponderCapture: (_evt, gesture) =>
          Math.abs(gesture.dx) > DRAG_THRESHOLD &&
          Math.abs(gesture.dx) > Math.abs(gesture.dy),
        onPanResponderGrant: () => {
          setDragging(true);
          if (Platform.OS !== 'web') {
            Vibration.vibrate(8);
          }
        },
        onPanResponderMove: (_evt, gesture) => {
          dragX.setValue(gesture.dx);
        },
        onPanResponderRelease: (_evt, gesture) => {
          const deltaMs = gesture.dx / pxPerMs;
          const step = snapMs > 0 ? snapMs : 50;
          const next = Math.max(0, Math.round((startMsRef.current + deltaMs) / step) * step);
          dragX.setValue(0);
          setDragging(false);
          onCommitStart(next);
        },
        onPanResponderTerminate: () => {
          dragX.setValue(0);
          setDragging(false);
        },
      }),
    [dragX, onCommitStart, pxPerMs, snapMs],
  );

  return (
    <Animated.View
      {...panResponder.panHandlers}
      style={[
        styles.clip,
        {
          backgroundColor: withAlpha(color, 0.26),
          borderColor: dragging ? '#FFFFFF' : withAlpha(color, 0.9),
          left,
          transform: [{ translateX: dragX }],
          width,
          zIndex: dragging ? 5 : 1,
        },
        dragging && styles.clipDragging,
        track.muted && styles.clipMuted,
      ]}
    >
      <View style={[styles.accentEdge, { backgroundColor: color }]} />
      <Pressable
        accessibilityLabel={t('studio.trackOptions')}
        onPress={onPress}
        style={styles.pressArea}
      >
        <View style={styles.bars} pointerEvents="none">
          {bars.map((h, index) => (
            <View
              key={index}
              style={[
                styles.bar,
                { backgroundColor: withAlpha(color, 0.85), height: `${Math.round(h * 100)}%` },
              ]}
            />
          ))}
        </View>
        <View style={styles.labelRow} pointerEvents="none">
          <Text numberOfLines={1} style={styles.label}>
            {t(INSTRUMENT_TITLE_KEYS[track.instrument])}
          </Text>
          <Text style={styles.duration}>{formatDuration(track.durationMs)}</Text>
        </View>
      </Pressable>
    </Animated.View>
  );
}

export const StudioTimelineClip = memo(StudioTimelineClipBase);

const styles = StyleSheet.create({
  clip: {
    borderRadius: 10,
    borderWidth: 1.5,
    height: LANE_HEIGHT,
    overflow: 'hidden',
    position: 'absolute',
    top: 0,
  },
  clipDragging: {
    shadowColor: '#000000',
    shadowOffset: { height: 4, width: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
  },
  clipMuted: {
    opacity: 0.55,
  },
  accentEdge: {
    bottom: 0,
    left: 0,
    position: 'absolute',
    top: 0,
    width: 3,
  },
  pressArea: {
    flex: 1,
    justifyContent: 'flex-start',
    paddingLeft: 6,
  },
  bars: {
    alignItems: 'flex-end',
    bottom: 0,
    flexDirection: 'row',
    gap: 2,
    left: 6,
    position: 'absolute',
    right: 4,
    top: 22,
  },
  bar: {
    borderRadius: 1,
    flex: 1,
    minWidth: 1,
  },
  labelRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
    paddingTop: 5,
  },
  label: {
    color: colors.text,
    flexShrink: 1,
    fontSize: 11,
    fontWeight: '700',
  },
  duration: {
    color: colors.textSecondary,
    fontSize: 10,
    fontVariant: ['tabular-nums'],
    fontWeight: '600',
  },
});
