import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  StyleSheet,
  View,
  type GestureResponderEvent,
  type NativeTouchEvent,
} from 'react-native';
import { useTranslation } from 'react-i18next';

import { usePadNoteRepeat, type NoteRepeatRate } from '../../hooks/usePadNoteRepeat';
import { getLaunchPads } from '../../instruments/pads/padsBanks';
import type { PadBankId } from '../../instruments/pads/padsBanks';
import type { PadSoundId } from '../../instruments/pads/padsSounds';
import { LaunchPad } from './LaunchPad';

type PadGridProps = {
  width: number;
  height: number;
  bankId: PadBankId;
  onTrigger: (id: PadSoundId) => void;
  guidePadId?: PadSoundId | null;
  showPadLabels?: boolean;
  strongGuide?: boolean;
  stageBg?: string;
  stageOverlay?: string;
  accent?: string;
  noteRepeatEnabled?: boolean;
  noteRepeatRate?: NoteRepeatRate;
  noteRepeatBpm?: number;
};

const GRID_SIZE = 4;
/** Outer margin of the chassis inside the stage. */
const STAGE_INSET = 8;
/** How much of the available stage the pad chassis should fill (rest is margin). */
const FILL_RATIO = 0.82;
/** Chassis chrome padding around the pad grid. */
const CHASSIS_PAD = 10;
const GAP = 6;
/** Fraction of cell treated as dead gutter for hit-testing (matches LaunchPad inset). */
const HIT_INSET_RATIO = 0.06;

export function PadGrid({
  width,
  height,
  bankId,
  onTrigger,
  guidePadId = null,
  showPadLabels = true,
  strongGuide = true,
  stageBg,
  stageOverlay,
  accent = '#2A9D8F',
  noteRepeatEnabled = false,
  noteRepeatRate = 'sixteenth',
  noteRepeatBpm = 100,
}: PadGridProps) {
  const { t } = useTranslation();
  const launchPads = useMemo(() => getLaunchPads(bankId), [bankId]);
  const onTriggerRef = useRef(onTrigger);
  onTriggerRef.current = onTrigger;

  const fireTrigger = useCallback((id: PadSoundId) => {
    onTriggerRef.current(id);
  }, []);

  const { syncHeldPads, clearAll: clearNoteRepeat } = usePadNoteRepeat(
    noteRepeatEnabled,
    noteRepeatRate,
    noteRepeatBpm,
    fireTrigger,
  );

  const layout = useMemo(() => {
    const availW = Math.max(0, width - STAGE_INSET * 2);
    const availH = Math.max(0, height - STAGE_INSET * 2);
    const chassisW = Math.floor(availW * FILL_RATIO);
    const chassisH = Math.floor(availH * FILL_RATIO);
    const innerW = Math.max(0, chassisW - CHASSIS_PAD * 2);
    const innerH = Math.max(0, chassisH - CHASSIS_PAD * 2);
    const padW = Math.max(44, Math.floor((innerW - GAP * (GRID_SIZE - 1)) / GRID_SIZE));
    const padH = Math.max(36, Math.floor((innerH - GAP * (GRID_SIZE - 1)) / GRID_SIZE));
    const gridW = padW * GRID_SIZE + GAP * (GRID_SIZE - 1);
    const gridH = padH * GRID_SIZE + GAP * (GRID_SIZE - 1);
    return { chassisW, chassisH, padW, padH, gridW, gridH };
  }, [width, height]);

  const { chassisW, chassisH, padW, padH, gridW, gridH } = layout;
  const touchMapRef = useRef<Map<string, PadSoundId>>(new Map());
  const [pressedPads, setPressedPads] = useState<Set<PadSoundId>>(() => new Set());

  useEffect(() => {
    touchMapRef.current.clear();
    setPressedPads(new Set());
    clearNoteRepeat();
  }, [bankId, padW, padH, clearNoteRepeat]);

  const resolvePadAtPoint = useCallback(
    (x: number, y: number): PadSoundId | null => {
      if (x < 0 || y < 0 || x >= gridW || y >= gridH) {
        return null;
      }
      const strideX = padW + GAP;
      const strideY = padH + GAP;
      const col = Math.min(GRID_SIZE - 1, Math.floor(x / strideX));
      const row = Math.min(GRID_SIZE - 1, Math.floor(y / strideY));
      const localX = x - col * strideX;
      const localY = y - row * strideY;
      const insetX = Math.max(2, padW * HIT_INSET_RATIO);
      const insetY = Math.max(2, padH * HIT_INSET_RATIO);
      if (
        localX < insetX ||
        localY < insetY ||
        localX > padW - insetX ||
        localY > padH - insetY
      ) {
        return null;
      }
      const index = row * GRID_SIZE + col;
      return launchPads[index]?.id ?? null;
    },
    [gridW, gridH, launchPads, padW, padH],
  );

  const syncTouches = useCallback(
    (touches: readonly NativeTouchEvent[]) => {
      const nextTouchMap = new Map<string, PadSoundId>();
      const previous = touchMapRef.current;
      const toTrigger: PadSoundId[] = [];

      for (const touch of touches) {
        const touchId = String(touch.identifier);
        const padId = resolvePadAtPoint(touch.locationX, touch.locationY);
        if (!padId) {
          continue;
        }
        nextTouchMap.set(touchId, padId);
        if (previous.get(touchId) !== padId) {
          toTrigger.push(padId);
        }
      }

      touchMapRef.current = nextTouchMap;
      const held = new Set(nextTouchMap.values());
      setPressedPads(held);
      syncHeldPads(held);

      for (const padId of toTrigger) {
        onTriggerRef.current(padId);
      }
    },
    [resolvePadAtPoint, syncHeldPads],
  );

  const handleTouchStart = useCallback(
    (event: GestureResponderEvent) => {
      const touches =
        event.nativeEvent.touches.length > 0
          ? event.nativeEvent.touches
          : event.nativeEvent.changedTouches;
      syncTouches(touches);
    },
    [syncTouches],
  );

  const handleTouchMove = useCallback(
    (event: GestureResponderEvent) => {
      syncTouches(event.nativeEvent.touches);
    },
    [syncTouches],
  );

  const handleTouchEnd = useCallback(
    (event: GestureResponderEvent) => {
      syncTouches(event.nativeEvent.touches);
    },
    [syncTouches],
  );

  return (
    <View style={[styles.stage, { width, height, backgroundColor: stageBg }]}>
      {stageOverlay ? (
        <View
          pointerEvents="none"
          style={[styles.stageWash, { backgroundColor: stageOverlay }]}
        />
      ) : null}

      <View
        style={[
          styles.chassis,
          {
            borderColor: `${accent}55`,
            shadowColor: accent,
            width: chassisW,
            height: chassisH,
          },
        ]}
      >
        <View pointerEvents="none" style={[styles.chassisLip, { backgroundColor: `${accent}22` }]} />
        <View
          onTouchCancel={handleTouchEnd}
          onTouchEnd={handleTouchEnd}
          onTouchMove={handleTouchMove}
          onTouchStart={handleTouchStart}
          style={[styles.grid, { width: gridW, height: gridH, gap: GAP }]}
        >
          {launchPads.map((pad) => (
            <LaunchPad
              key={`${bankId}-${pad.id}`}
              color={pad.color}
              height={padH}
              highlighted={guidePadId === pad.id}
              label={t(pad.labelKey)}
              pressed={pressedPads.has(pad.id)}
              showLabel={showPadLabels}
              strongGuide={strongGuide}
              width={padW}
            />
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  stage: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  stageWash: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.35,
  },
  chassis: {
    alignItems: 'center',
    backgroundColor: '#101014',
    borderRadius: 18,
    borderWidth: 1.5,
    elevation: 8,
    justifyContent: 'center',
    padding: CHASSIS_PAD,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
  },
  chassisLip: {
    borderRadius: 14,
    bottom: 4,
    left: 4,
    position: 'absolute',
    right: 4,
    top: 4,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    zIndex: 1,
  },
});
