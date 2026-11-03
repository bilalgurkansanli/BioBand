import { memo, useCallback, useMemo, useRef, useState } from 'react';
import {
  Animated,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';

import { INSTRUMENT_COLORS } from '../../../utils/recordingLabels';
import type { StudioTrack } from '../../../types/studio';
import type { PlaybackPosition } from './playbackPosition';
import { StudioPlayhead } from './StudioPlayhead';
import { StudioTimelineLanes } from './StudioTimelineLanes';
import { StudioTimelineRuler } from './StudioTimelineRuler';
import { StudioTrackHeader } from './StudioTrackHeader';
import { HEADER_WIDTH, LANE_GAP, RULER_HEIGHT } from './timelineGeometry';

type Props = {
  tracks: StudioTrack[];
  pxPerMs: number;
  pixelsPerSecond: number;
  timelineWidth: number;
  bpm: number;
  snapMs: number;
  showGrid: boolean;
  /** Read by the playhead alone — see playbackPosition.ts. */
  position: PlaybackPosition;
  durationMs: number;
  isPlaying: boolean;
  onSeek: (positionMs: number) => void;
  onClipCommitStart: (trackId: string, startMs: number) => void;
  onClipPress: (track: StudioTrack) => void;
  onToggleMute: (trackId: string) => void;
  onToggleSolo: (trackId: string) => void;
};

function StudioTimelineBase({
  tracks,
  pxPerMs,
  pixelsPerSecond,
  timelineWidth,
  bpm,
  snapMs,
  showGrid,
  position,
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

  /**
   * The screen rebuilds these handlers whenever it re-renders. Kept behind a
   * ref and handed out as fixed identities, they stop an unrelated screen
   * render from looking like a change to the memoised headers, ruler and
   * lanes — the expensive halves of the tree.
   */
  const handlersRef = useRef({
    onSeek,
    onClipCommitStart,
    onClipPress,
    onToggleMute,
    onToggleSolo,
  });
  handlersRef.current = { onSeek, onClipCommitStart, onClipPress, onToggleMute, onToggleSolo };

  const handleSeek = useCallback((ms: number) => handlersRef.current.onSeek(ms), []);
  const handleClipCommitStart = useCallback(
    (trackId: string, startMs: number) => handlersRef.current.onClipCommitStart(trackId, startMs),
    [],
  );
  const handleClipPress = useCallback(
    (track: StudioTrack) => handlersRef.current.onClipPress(track),
    [],
  );
  const handleToggleMute = useCallback(
    (trackId: string) => handlersRef.current.onToggleMute(trackId),
    [],
  );
  const handleToggleSolo = useCallback(
    (trackId: string) => handlersRef.current.onToggleSolo(trackId),
    [],
  );

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

  const onHeaderScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (scrollOwner.current === 'lane') {
      return;
    }
    laneScrollRef.current?.scrollTo({ y: event.nativeEvent.contentOffset.y, animated: false });
  }, []);
  const onLaneScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (scrollOwner.current === 'header') {
      return;
    }
    headerScrollRef.current?.scrollTo({ y: event.nativeEvent.contentOffset.y, animated: false });
  }, []);
  const onHeaderScrollBeginDrag = useCallback(() => {
    scrollOwner.current = 'header';
  }, []);
  const onLaneScrollBeginDrag = useCallback(() => {
    scrollOwner.current = 'lane';
  }, []);

  const handleBodyLayout = useCallback((event: LayoutChangeEvent) => {
    setBodyHeight(event.nativeEvent.layout.height);
  }, []);

  return (
    <View style={styles.root}>
      {/* Frozen left header column — scrollable vertically, synced to lanes. */}
      <View style={styles.headerColumn}>
        <View style={styles.corner} />
        <ScrollView
          ref={headerScrollRef}
          onScroll={onHeaderScroll}
          onScrollBeginDrag={onHeaderScrollBeginDrag}
          scrollEventThrottle={16}
          showsVerticalScrollIndicator={false}
          style={styles.headerClip}
        >
          <View style={styles.headerStack}>
            {tracks.map((track) => (
              <StudioTrackHeader
                key={track.id}
                color={INSTRUMENT_COLORS[track.instrument]}
                onToggleMute={handleToggleMute}
                onToggleSolo={handleToggleSolo}
                track={track}
              />
            ))}
          </View>
        </ScrollView>
      </View>

      {/* Scrollable timeline region */}
      <View onLayout={handleBodyLayout} style={styles.body}>
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
              onSeek={handleSeek}
              pixelsPerSecond={pixelsPerSecond}
              pxPerMs={pxPerMs}
              timelineWidth={timelineWidth}
            />
            {laneViewportHeight > 0 ? (
              <ScrollView
                ref={laneScrollRef}
                onScroll={onLaneScroll}
                onScrollBeginDrag={onLaneScrollBeginDrag}
                scrollEnabled={!clipHeld}
                scrollEventThrottle={16}
                showsVerticalScrollIndicator={tracks.length > 4}
                style={{ height: laneViewportHeight }}
              >
                <StudioTimelineLanes
                  bpm={bpm}
                  onClipCommitStart={handleClipCommitStart}
                  onClipPress={handleClipPress}
                  onDragActiveChange={setClipHeld}
                  pxPerMs={pxPerMs}
                  showGrid={showGrid}
                  snapMs={snapMs}
                  timelineWidth={timelineWidth}
                  tracks={tracks}
                />
              </ScrollView>
            ) : null}
          </View>
        </Animated.ScrollView>

        <StudioPlayhead
          durationMs={durationMs}
          isPlaying={isPlaying}
          onSeek={handleSeek}
          position={position}
          pxPerMs={pxPerMs}
          scrollX={scrollX}
        />
      </View>
    </View>
  );
}

/**
 * Memoised: playback progress reaches only the playhead (through `position`),
 * so the timeline itself redraws for edits, zoom and transport changes only.
 */
export const StudioTimeline = memo(StudioTimelineBase);

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
});
