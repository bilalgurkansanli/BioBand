import { memo, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { colors } from '../../../theme/colors';
import { INSTRUMENT_COLORS } from '../../../utils/recordingLabels';
import type { StudioTrack } from '../../../types/studio';
import { StudioTimelineClip } from './StudioTimelineClip';
import { LANE_HEIGHT, laneOffsetY, lanesHeight } from './timelineGeometry';

type Props = {
  tracks: StudioTrack[];
  pxPerMs: number;
  timelineWidth: number;
  bpm: number;
  snapMs: number;
  showGrid: boolean;
  onClipCommitStart: (trackId: string, startMs: number) => void;
  onClipPress: (track: StudioTrack) => void;
  onDragActiveChange: (active: boolean) => void;
};

/**
 * Everything that scrolls under the playhead: lane stripes, the beat grid and
 * the clips.
 *
 * Split out of the timeline and memoised because playback pushes a new
 * position ten times a second, and rebuilding this subtree meant re-creating
 * up to 400 grid lines plus every clip's waveform — hundreds of views per
 * tick — for a change none of them can see. It is handed only the things that
 * decide what the lanes look like, so a progress tick leaves it alone.
 */
function StudioTimelineLanesBase({
  tracks,
  pxPerMs,
  timelineWidth,
  bpm,
  snapMs,
  showGrid,
  onClipCommitStart,
  onClipPress,
  onDragActiveChange,
}: Props) {
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
            onCommitStart={onClipCommitStart}
            onDragActiveChange={onDragActiveChange}
            onPress={onClipPress}
            pxPerMs={pxPerMs}
            snapMs={snapMs}
            track={track}
          />
        </View>
      ))}
    </View>
  );
}

export const StudioTimelineLanes = memo(StudioTimelineLanesBase);

const styles = StyleSheet.create({
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
