import { useMemo, useRef, useState } from 'react';
import {
  Animated,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';

import { colors } from '../../../theme/colors';
import { INSTRUMENT_COLORS } from '../../../utils/recordingLabels';
import type { StudioTrack } from '../../../types/studio';
import { StudioPlayhead } from './StudioPlayhead';
import { StudioTimelineClip } from './StudioTimelineClip';
import { StudioTimelineRuler } from './StudioTimelineRuler';
import { StudioTrackHeader } from './StudioTrackHeader';
import {
  HEADER_WIDTH,
  LANE_GAP,
  LANE_HEIGHT,
  RULER_HEIGHT,
  laneOffsetY,
  lanesHeight,
} from './timelineGeometry';

type Props = {
  tracks: StudioTrack[];
  pxPerMs: number;
  pixelsPerSecond: number;
  timelineWidth: number;
  bpm: number;
  snapMs: number;
  showGrid: boolean;
  positionMs: number;
  durationMs: number;
  isPlaying: boolean;
  onSeek: (positionMs: number) => void;
  onClipCommitStart: (trackId: string, startMs: number) => void;
  onClipPress: (track: StudioTrack) => void;
  onToggleMute: (trackId: string) => void;
  onToggleSolo: (trackId: string) => void;
};

export function StudioTimeline({
  tracks,
  pxPerMs,
  pixelsPerSecond,
  timelineWidth,
  bpm,
  snapMs,
  showGrid,
  positionMs,
  durationMs,
  isPlaying,
  onSeek,
  onClipCommitStart,
  onClipPress,
  onToggleMute,
  onToggleSolo,
}: Props) {
  const scrollX = useRef(new Animated.Value(0)).current;
  const [bodyHeight, setBodyHeight] = useState(0);
  const laneViewportHeight = Math.max(0, bodyHeight - RULER_HEIGHT);

  // A lifted clip and the scroll views want the same finger movement, and the
  // scroll view wins that fight roughly every other time — which is what made
  // dragging a clip feel unreliable. While a clip is held, scrolling is off.
  const [clipHeld, setClipHeld] = useState(false);

  const onHScroll = useMemo(
    () =>
      Animated.event([{ nativeEvent: { contentOffset: { x: scrollX } } }], {
        useNativeDriver: true,
      }),
    [scrollX],
  );

  // Two-way vertical sync between the frozen header column and the lanes, so
  // the user can scroll up/down by dragging on EITHER — much easier to grab
  // than only the lane area (which competes with horizontal scrolling).
  const headerScrollRef = useRef<ScrollView>(null);
  const laneScrollRef = useRef<ScrollView>(null);
  const scrollOwner = useRef<'header' | 'lane' | null>(null);

  const onHeaderScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (scrollOwner.current === 'lane') {
      return;
    }
    laneScrollRef.current?.scrollTo({ y: event.nativeEvent.contentOffset.y, animated: false });
  };
  const onLaneScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (scrollOwner.current === 'header') {
      return;
    }
    headerScrollRef.current?.scrollTo({ y: event.nativeEvent.contentOffset.y, animated: false });
  };

  const contentHeight = lanesHeight(tracks.length) + 16;

  // Beat grid driven by BPM (hidden when the grid setting is off).
  const beatMs = 60000 / bpm;
  const gridLines = useMemo(() => {
    if (!showGrid) {
      return [];
    }
    const beatPx = beatMs * pxPerMs;
    if (beatPx < 6) {
      return [];
    }
    const out: { x: number; bar: boolean }[] = [];
    for (let i = 1; i * beatPx <= timelineWidth && out.length < 400; i += 1) {
      out.push({ x: i * beatPx, bar: i % 4 === 0 });
    }
    return out;
  }, [beatMs, pxPerMs, showGrid, timelineWidth]);

  return (
    <View style={styles.root}>
      {/* Frozen left header column — scrollable vertically, synced to lanes. */}
      <View style={styles.headerColumn}>
        <View style={styles.corner} />
        <ScrollView
          ref={headerScrollRef}
          onScroll={onHeaderScroll}
          onScrollBeginDrag={() => {
            scrollOwner.current = 'header';
          }}
          scrollEventThrottle={16}
          showsVerticalScrollIndicator={false}
          style={styles.headerClip}
        >
          <View style={styles.headerStack}>
            {tracks.map((track) => (
              <StudioTrackHeader
                key={track.id}
                color={INSTRUMENT_COLORS[track.instrument]}
                onToggleMute={() => onToggleMute(track.id)}
                onToggleSolo={() => onToggleSolo(track.id)}
                track={track}
              />
            ))}
          </View>
        </ScrollView>
      </View>

      {/* Scrollable timeline region */}
      <View onLayout={(event) => setBodyHeight(event.nativeEvent.layout.height)} style={styles.body}>
        <Animated.ScrollView
          horizontal
          onScroll={onHScroll}
          scrollEnabled={!clipHeld}
          scrollEventThrottle={16}
          showsHorizontalScrollIndicator={false}
          style={styles.hScroll}
        >
          <View style={{ height: bodyHeight, width: timelineWidth }}>
            <StudioTimelineRuler
              onSeek={onSeek}
              pixelsPerSecond={pixelsPerSecond}
              pxPerMs={pxPerMs}
              timelineWidth={timelineWidth}
            />
            {laneViewportHeight > 0 ? (
              <ScrollView
                ref={laneScrollRef}
                onScroll={onLaneScroll}
                onScrollBeginDrag={() => {
                  scrollOwner.current = 'lane';
                }}
                scrollEnabled={!clipHeld}
                scrollEventThrottle={16}
                showsVerticalScrollIndicator={tracks.length > 4}
                style={{ height: laneViewportHeight }}
              >
                <View style={{ height: contentHeight, width: timelineWidth }}>
                  {/* Background layer: lane stripes + beat grid (under clips). */}
                  {tracks.map((track, index) => (
                    <View
                      key={`bg-${track.id}`}
                      style={[styles.laneBg, { top: laneOffsetY(index), width: timelineWidth }]}
                    />
                  ))}
                  {gridLines.map((line, index) => (
                    <View
                      key={`grid-${index}`}
                      style={[
                        styles.gridLine,
                        line.bar ? styles.gridLineBar : styles.gridLineBeat,
                        { left: line.x, height: contentHeight },
                      ]}
                    />
                  ))}

                  {/* Clip layer (drawn on top of the grid). */}
                  {tracks.map((track, index) => (
                    <View
                      key={track.id}
                      pointerEvents="box-none"
                      style={[styles.laneClip, { top: laneOffsetY(index), width: timelineWidth }]}
                    >
                      <StudioTimelineClip
                        color={INSTRUMENT_COLORS[track.instrument]}
                        onCommitStart={(startMs) => onClipCommitStart(track.id, startMs)}
                        onDragActiveChange={setClipHeld}
                        onPress={() => onClipPress(track)}
                        pxPerMs={pxPerMs}
                        snapMs={snapMs}
                        track={track}
                      />
                    </View>
                  ))}
                </View>
              </ScrollView>
            ) : null}
          </View>
        </Animated.ScrollView>

        <StudioPlayhead
          durationMs={durationMs}
          isPlaying={isPlaying}
          onSeek={onSeek}
          positionMs={positionMs}
          pxPerMs={pxPerMs}
          scrollX={scrollX}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    flexDirection: 'row',
  },
  headerColumn: {
    width: HEADER_WIDTH,
  },
  corner: {
    height: RULER_HEIGHT,
  },
  headerClip: {
    flex: 1,
  },
  headerStack: {
    gap: LANE_GAP,
    paddingBottom: 16,
  },
  body: {
    flex: 1,
    // Clip the playhead overlay to the timeline region so it can't bleed left
    // over the frozen header column when scrolled right.
    overflow: 'hidden',
  },
  hScroll: {
    flex: 1,
  },
  laneBg: {
    backgroundColor: colors.surfaceLight,
    borderRadius: 10,
    height: LANE_HEIGHT,
    position: 'absolute',
  },
  laneClip: {
    height: LANE_HEIGHT,
    position: 'absolute',
  },
  gridLine: {
    position: 'absolute',
    top: 0,
    width: 1,
  },
  gridLineBeat: {
    backgroundColor: colors.border,
    opacity: 0.5,
  },
  gridLineBar: {
    backgroundColor: colors.textSecondary,
    opacity: 0.55,
    width: 1.5,
  },
});
