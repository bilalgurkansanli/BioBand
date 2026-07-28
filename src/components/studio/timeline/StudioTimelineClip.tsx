import { hapticSelection } from '../../../utils/haptics';
import { memo, useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  PanResponder,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';

import { colors } from '../../../theme/colors';
import { formatDuration } from '../../../utils/formatDuration';
import { INSTRUMENT_TITLE_KEYS } from '../../../utils/recordingLabels';
import type { StudioTrack } from '../../../types/studio';
import { getTrackStartMs } from '../../../types/studio';
import { LANE_HEIGHT, withAlpha } from './timelineGeometry';

/**
 * Hold this long to pick a clip up.
 *
 * Short enough to feel immediate, long enough that a tap meant for the clip
 * menu never trips it — a deliberate tap is well under 200 ms.
 */
const LIFT_DELAY_MS = 250;

/** Once lifted, the smallest movement should move the clip. */
const DRAG_THRESHOLD = 2;

type Props = {
  track: StudioTrack;
  pxPerMs: number;
  /** Grid quantize step (ms) applied when a drag is released. */
  snapMs: number;
  color: string;
  /**
   * Both take the clip's own track back rather than being closed over it, so
   * the lane can hand every clip the same two handlers — a per-clip arrow
   * changes identity on every parent render and defeats the memo below.
   */
  onCommitStart: (trackId: string, startMs: number) => void;
  onPress: (track: StudioTrack) => void;
  /**
   * Fires as soon as the clip is picked up, and again when it is put down.
   * The timeline freezes its scroll views in between — otherwise the
   * horizontal scroll and this drag both want the same finger movement, and
   * the scroll usually wins.
   */
  onDragActiveChange: (active: boolean) => void;
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

function StudioTimelineClipBase({
  track,
  pxPerMs,
  snapMs,
  color,
  onCommitStart,
  onPress,
  onDragActiveChange,
}: Props) {
  const { t } = useTranslation();
  const startMs = getTrackStartMs(track);
  const width = Math.max(24, track.durationMs * pxPerMs);

  /**
   * The clip's horizontal position, in pixels, and the *only* thing that
   * decides where it sits.
   *
   * It used to be two things — a `left` style fed by the committed `startMs`,
   * plus an animated drag offset. Those reach the native view through
   * different pipelines (a React prop commit vs. the Animated system), and
   * nothing guarantees they land in the same frame. Whenever the offset
   * cleared first, the clip flicked back to its old spot for a frame before
   * the new `left` arrived. One value cannot disagree with itself.
   */
  const posX = useRef(new Animated.Value(startMs * pxPerMs)).current;
  const lift = useRef(new Animated.Value(0)).current;
  const [lifted, setLifted] = useState(false);

  // The pan handlers are created once and read these, so every value they
  // need lives in a ref rather than in their closure.
  const liftedRef = useRef(false);
  // Set the moment the pan responder decides to take the gesture, which
  // happens *before* the Pressable underneath is terminated. Without it the
  // termination would read as "finger lifted" and drop the clip back home in
  // the middle of the drag.
  const draggingRef = useRef(false);
  const trackIdRef = useRef(track.id);
  const startMsRef = useRef(startMs);
  const pxPerMsRef = useRef(pxPerMs);
  const snapMsRef = useRef(snapMs);
  const onCommitRef = useRef(onCommitStart);
  const onDragActiveRef = useRef(onDragActiveChange);
  trackIdRef.current = track.id;
  startMsRef.current = startMs;
  pxPerMsRef.current = pxPerMs;
  snapMsRef.current = snapMs;
  onCommitRef.current = onCommitStart;
  onDragActiveRef.current = onDragActiveChange;

  const setLiftState = useCallback(
    (next: boolean) => {
      if (liftedRef.current === next) {
        return;
      }
      liftedRef.current = next;
      setLifted(next);
      onDragActiveRef.current(next);
      Animated.spring(lift, {
        bounciness: next ? 10 : 0,
        speed: 20,
        toValue: next ? 1 : 0,
        useNativeDriver: true,
      }).start();
    },
    [lift],
  );

  const pickUp = useCallback(() => {
    setLiftState(true);
    if (Platform.OS !== 'web') {
      hapticSelection();
    }
  }, [setLiftState]);

  /** Drops the clip without moving it — the offset is left to the caller. */
  const putDown = useCallback(() => {
    draggingRef.current = false;
    setLiftState(false);
  }, [setLiftState]);

  /** Abandon the drag: back to where it was picked up. */
  const cancelDrag = useCallback(() => {
    posX.setValue(startMsRef.current * pxPerMsRef.current);
    putDown();
  }, [posX, putDown]);

  // Follow the committed position whenever it (or the zoom) changes. Skipped
  // mid-drag so a re-render cannot yank the clip out from under the finger.
  //
  // After a release this runs with the value the drag already wrote, so it is
  // a no-op — which is the point. If the parent stored something else, this is
  // what moves the clip to where it truly ended up.
  useLayoutEffect(() => {
    if (draggingRef.current) {
      return;
    }
    posX.setValue(startMs * pxPerMs);
  }, [posX, pxPerMs, startMs]);

  const barCount = Math.max(6, Math.min(200, Math.round(width / 5)));
  const bars = useMemo(
    () => computeBars(track, barCount),
    // Recompute only when the shape inputs change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [track.id, track.mode, track.events, barCount],
  );

  const handlePress = useCallback(() => onPress(track), [onPress, track]);

  const claimDrag = useCallback((dx: number) => {
    if (!liftedRef.current || Math.abs(dx) <= DRAG_THRESHOLD) {
      return false;
    }
    draggingRef.current = true;
    return true;
  }, []);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        // Never claim the touch itself — a plain press belongs to the clip
        // menu, and a swipe that starts on a clip should still scroll the
        // timeline. The drag only exists after the clip has been picked up.
        onStartShouldSetPanResponder: () => false,
        onStartShouldSetPanResponderCapture: () => false,
        // Once lifted, take the gesture in the capture phase so the inner
        // Pressable cannot swallow it, and accept movement in any direction —
        // a finger dragging sideways always wanders a little vertically.
        onMoveShouldSetPanResponder: (_evt, gesture) => claimDrag(gesture.dx),
        onMoveShouldSetPanResponderCapture: (_evt, gesture) => claimDrag(gesture.dx),
        onPanResponderMove: (_evt, gesture) => {
          posX.setValue(startMsRef.current * pxPerMsRef.current + gesture.dx);
        },
        onPanResponderRelease: (_evt, gesture) => {
          const deltaMs = gesture.dx / pxPerMsRef.current;
          const step = snapMsRef.current > 0 ? snapMsRef.current : 50;
          const next = Math.max(0, Math.round((startMsRef.current + deltaMs) / step) * step);
          // Settle onto the grid and stop. This is the final position — the
          // commit below only writes it down; nothing further moves the clip.
          posX.setValue(next * pxPerMsRef.current);
          putDown();
          onCommitRef.current(trackIdRef.current, next);
        },
        onPanResponderTerminate: cancelDrag,
        // Nothing above us should be able to take a drag back mid-flight.
        onPanResponderTerminationRequest: () => false,
      }),
    [cancelDrag, claimDrag, posX, putDown],
  );

  return (
    <Animated.View
      {...panResponder.panHandlers}
      style={[
        styles.clip,
        {
          backgroundColor: withAlpha(color, lifted ? 0.4 : 0.26),
          borderColor: lifted ? '#FFFFFF' : withAlpha(color, 0.9),
          // No `left` here on purpose — see `posX`. The clip is pinned to the
          // lane's origin and translated into place, so its position only ever
          // has one owner.
          transform: [
            { translateX: posX },
            { scale: lift.interpolate({ inputRange: [0, 1], outputRange: [1, 1.04] }) },
          ],
          width,
          zIndex: lifted ? 5 : 1,
        },
        lifted && styles.clipLifted,
        track.muted && styles.clipMuted,
      ]}
    >
      <View style={[styles.accentEdge, { backgroundColor: color }]} />
      <Pressable
        accessibilityHint={t('studio.clipDragHint')}
        accessibilityLabel={t('studio.trackOptions')}
        delayLongPress={LIFT_DELAY_MS}
        onLongPress={pickUp}
        onPress={handlePress}
        // Fires on lift-off and when the drag steals the gesture. The drag
        // puts the clip down itself, so only a release without a drag is
        // handled here.
        onPressOut={() => {
          if (liftedRef.current && !draggingRef.current) {
            cancelDrag();
          }
        }}
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
    // Pinned to the lane origin; `posX` translates it from here. Stated
    // explicitly rather than left to `auto` so the origin can never drift.
    left: 0,
    overflow: 'hidden',
    position: 'absolute',
    top: 0,
  },
  clipLifted: {
    borderWidth: 2,
    shadowColor: '#000000',
    shadowOffset: { height: 5, width: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
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
