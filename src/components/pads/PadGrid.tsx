import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
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
import type {
  PadLabelMode,
  PadVelocityCurve,
  PadVelocityMode,
} from '../../storage/padsSettingsStorage';
import { LaunchPad } from './LaunchPad';

type PadGridProps = {
  width: number;
  height: number;
  bankId: PadBankId;
  onTrigger: (id: PadSoundId, velocity: number) => void;
  guidePadId?: PadSoundId | null;
  labelMode?: PadLabelMode;
  strongGuide?: boolean;
  stageBg?: string;
  stageOverlay?: string;
  accent?: string;
  noteRepeatEnabled?: boolean;
  noteRepeatRate?: NoteRepeatRate;
  noteRepeatBpm?: number;
  velocityMode?: PadVelocityMode;
  velocityCurve?: PadVelocityCurve;
  padTrail?: boolean;
  /** Looper playback flash: { id, stamp } — stamp changes retrigger it. */
  ghost?: { id: PadSoundId; stamp: number } | null;
  /** Stage light pulse (0..1) — driven by the screen on every hit. */
  stageLightPulse?: Animated.Value | null;
  /** Edit mode: taps select a pad instead of playing it. */
  editMode?: boolean;
  onEditPad?: (id: PadSoundId) => void;
  /** Long-press opens the pad editor (custom bank). */
  longPressEnabled?: boolean;
  onLongPressPad?: (id: PadSoundId) => void;
  /** Bump when custom slots change — refreshes labels/colors in place. */
  slotsRevision?: number;
};

const GRID_SIZE = 4;
/** Outer margin of the chassis inside the stage. */
const STAGE_INSET = 8;
/** How much of the available stage the pad chassis should fill (rest is margin). */
const FILL_RATIO = 0.92;
/** Chassis chrome padding around the pad grid. */
const CHASSIS_PAD = 12;
const GAP = 7;
/** Fraction of cell treated as dead gutter for hit-testing (matches LaunchPad inset). */
const HIT_INSET_RATIO = 0.06;
const LONG_PRESS_MS = 550;
const FIXED_VELOCITY = 0.85;

function applyVelocityCurve(velocity: number, curve: PadVelocityCurve): number {
  const v = Math.max(0, Math.min(1, velocity));
  if (curve === 'soft') {
    return v ** 1.6;
  }
  if (curve === 'hard') {
    return v ** 0.65;
  }
  return v;
}

export function PadGrid({
  width,
  height,
  bankId,
  onTrigger,
  guidePadId = null,
  labelMode = 'name',
  strongGuide = true,
  stageBg,
  stageOverlay,
  accent = '#2A9D8F',
  noteRepeatEnabled = false,
  noteRepeatRate = 'sixteenth',
  noteRepeatBpm = 100,
  velocityMode = 'position',
  velocityCurve = 'normal',
  padTrail = false,
  ghost = null,
  stageLightPulse = null,
  editMode = false,
  onEditPad,
  longPressEnabled = false,
  onLongPressPad,
  slotsRevision = 0,
}: PadGridProps) {
  const { t } = useTranslation();
  // eslint-disable-next-line react-hooks/exhaustive-deps -- slotsRevision invalidates the custom bank
  const launchPads = useMemo(() => getLaunchPads(bankId), [bankId, slotsRevision]);
  const onTriggerRef = useRef(onTrigger);
  onTriggerRef.current = onTrigger;
  const onEditPadRef = useRef(onEditPad);
  onEditPadRef.current = onEditPad;
  const onLongPressPadRef = useRef(onLongPressPad);
  onLongPressPadRef.current = onLongPressPad;
  const editModeRef = useRef(editMode);
  editModeRef.current = editMode;
  const velocityModeRef = useRef(velocityMode);
  velocityModeRef.current = velocityMode;
  const velocityCurveRef = useRef(velocityCurve);
  velocityCurveRef.current = velocityCurve;

  const fireTrigger = useCallback((id: PadSoundId) => {
    // Note-repeat rolls reuse the first hit's strength feel — solid rolls.
    onTriggerRef.current(id, applyVelocityCurve(0.8, velocityCurveRef.current));
  }, []);

  const { syncHeldPads } = usePadNoteRepeat(
    noteRepeatEnabled && !editMode,
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
  const heldRef = useRef<Set<PadSoundId>>(new Set());
  const longPressRef = useRef<{
    padId: PadSoundId;
    timer: ReturnType<typeof setTimeout>;
  } | null>(null);
  /**
   * After a long-press fires, the finger is still physically down while the
   * editor opens. Ignoring the responder until every touch lifts stops the
   * held touch from re-triggering the pad (and re-arming the long-press).
   */
  const suppressTouchesRef = useRef(false);

  const cancelLongPress = useCallback(() => {
    if (longPressRef.current) {
      clearTimeout(longPressRef.current.timer);
      longPressRef.current = null;
    }
  }, []);

  useEffect(() => {
    touchMapRef.current.clear();
    heldRef.current = new Set();
    setPressedPads(new Set());
    // Tell the hook the pads are no longer held — clearing only the timers
    // left its held-set stale, and the next enable/rate change started a
    // ghost roll on a pad nobody was touching.
    syncHeldPads(new Set());
    cancelLongPress();
  }, [bankId, padW, padH, editMode, cancelLongPress, syncHeldPads]);

  useEffect(() => () => cancelLongPress(), [cancelLongPress]);

  const resolvePadAtPoint = useCallback(
    (x: number, y: number): { padId: PadSoundId; velocity: number } | null => {
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
      const padId = launchPads[index]?.id;
      if (!padId) {
        return null;
      }

      let velocity = FIXED_VELOCITY;
      if (velocityModeRef.current === 'position') {
        // Radial: full strength at the pad center, softer toward the edges —
        // the closest thing to hit dynamics a capacitive screen offers.
        const nx = (localX - padW / 2) / (padW / 2);
        const ny = (localY - padH / 2) / (padH / 2);
        const dist = Math.min(1, Math.sqrt(nx * nx + ny * ny));
        velocity = 1 - 0.45 * dist;
      }
      velocity = applyVelocityCurve(velocity, velocityCurveRef.current);

      return { padId, velocity };
    },
    [gridW, gridH, launchPads, padW, padH],
  );

  const syncTouches = useCallback(
    (touches: readonly NativeTouchEvent[]) => {
      if (suppressTouchesRef.current) {
        if (touches.length === 0) {
          suppressTouchesRef.current = false;
        }
        return;
      }

      const nextTouchMap = new Map<string, PadSoundId>();
      const previous = touchMapRef.current;
      const toTrigger: { padId: PadSoundId; velocity: number }[] = [];

      for (const touch of touches) {
        const touchId = String(touch.identifier);
        const resolved = resolvePadAtPoint(touch.locationX, touch.locationY);
        if (!resolved) {
          continue;
        }
        nextTouchMap.set(touchId, resolved.padId);
        if (previous.get(touchId) !== resolved.padId) {
          toTrigger.push(resolved);
        }
      }

      touchMapRef.current = nextTouchMap;
      const held = new Set(nextTouchMap.values());

      // Long-press bookkeeping: a single steady touch on one pad arms the
      // editor; any pad change, extra finger, or lift cancels it.
      if (longPressEnabled && onLongPressPadRef.current && !editModeRef.current) {
        const single = held.size === 1 && nextTouchMap.size === 1;
        const heldPad = single ? [...held][0] : null;
        if (!heldPad || longPressRef.current?.padId !== heldPad) {
          cancelLongPress();
          if (heldPad && toTrigger.length > 0) {
            const padId = heldPad;
            const timer = setTimeout(() => {
              longPressRef.current = null;
              suppressTouchesRef.current = true;
              touchMapRef.current.clear();
              heldRef.current = new Set();
              setPressedPads(new Set());
              syncHeldPads(new Set());
              onLongPressPadRef.current?.(padId);
            }, LONG_PRESS_MS);
            longPressRef.current = { padId, timer };
          }
        }
      } else if (longPressRef.current) {
        cancelLongPress();
      }

      // Touch-move fires every frame — only re-render / resync the rolls
      // when the set of held pads actually changed.
      const previousHeld = heldRef.current;
      let heldChanged = held.size !== previousHeld.size;
      if (!heldChanged) {
        for (const padId of held) {
          if (!previousHeld.has(padId)) {
            heldChanged = true;
            break;
          }
        }
      }
      if (heldChanged) {
        heldRef.current = held;
        setPressedPads(held);
        syncHeldPads(held);
      }

      for (const hit of toTrigger) {
        if (editModeRef.current) {
          onEditPadRef.current?.(hit.padId);
        } else {
          onTriggerRef.current(hit.padId, hit.velocity);
        }
      }
    },
    [cancelLongPress, longPressEnabled, resolvePadAtPoint, syncHeldPads],
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

  const labelFor = useCallback(
    (pad: { labelKey: string; rawLabel?: string }, index: number): string => {
      if (labelMode === 'off') {
        return '';
      }
      if (labelMode === 'note') {
        // Melodic pads already carry note names; other banks show the grid
        // position — what finger drummers memorize.
        return bankId === 'melodic' ? t(pad.labelKey) : String(index + 1);
      }
      return pad.rawLabel ?? t(pad.labelKey);
    },
    [bankId, labelMode, t],
  );

  return (
    <View style={[styles.stage, { width, height, backgroundColor: stageBg }]}>
      {stageOverlay ? (
        <View
          pointerEvents="none"
          style={[styles.stageWash, { backgroundColor: stageOverlay }]}
        />
      ) : null}
      {stageLightPulse ? (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.stageWash,
            {
              backgroundColor: accent,
              opacity: stageLightPulse.interpolate({
                inputRange: [0, 1],
                outputRange: [0, 0.16],
              }),
            },
          ]}
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
        <View pointerEvents="none" style={[styles.chassisLip, { backgroundColor: `${accent}1E` }]} />
        <View pointerEvents="none" style={[styles.screw, styles.screwTopLeft]} />
        <View pointerEvents="none" style={[styles.screw, styles.screwTopRight]} />
        <View pointerEvents="none" style={[styles.screw, styles.screwBottomLeft]} />
        <View pointerEvents="none" style={[styles.screw, styles.screwBottomRight]} />
        <View
          onTouchCancel={handleTouchEnd}
          onTouchEnd={handleTouchEnd}
          onTouchMove={handleTouchMove}
          onTouchStart={handleTouchStart}
          style={[styles.grid, { width: gridW, height: gridH, gap: GAP }]}
        >
          {launchPads.map((pad, index) => (
            <LaunchPad
              key={`${bankId}-${pad.id}`}
              color={pad.color}
              ghostStamp={ghost && ghost.id === pad.id ? ghost.stamp : 0}
              height={padH}
              highlighted={guidePadId === pad.id}
              label={labelFor(pad, index)}
              pressed={pressedPads.has(pad.id)}
              showLabel={labelMode !== 'off'}
              strongGuide={strongGuide}
              trail={padTrail}
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
    backgroundColor: '#0C0C11',
    borderRadius: 22,
    borderWidth: 1.5,
    elevation: 10,
    justifyContent: 'center',
    padding: CHASSIS_PAD,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 16,
  },
  chassisLip: {
    borderRadius: 17,
    bottom: 5,
    left: 5,
    position: 'absolute',
    right: 5,
    top: 5,
  },
  screw: {
    backgroundColor: '#1E2028',
    borderColor: 'rgba(255,255,255,0.14)',
    borderRadius: 3,
    borderWidth: 1,
    height: 6,
    position: 'absolute',
    width: 6,
  },
  screwTopLeft: { left: 7, top: 7 },
  screwTopRight: { right: 7, top: 7 },
  screwBottomLeft: { bottom: 7, left: 7 },
  screwBottomRight: { bottom: 7, right: 7 },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    zIndex: 1,
  },
});
