import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  type GestureResponderEvent,
  type LayoutChangeEvent,
  type NativeTouchEvent,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';

import { getNoteLabel, POSITION_COUNT } from '../../instruments/violin/violinNotes';
import {
  parseViolinSoundId,
  VIOLIN_STRINGS,
  type ViolinStringId,
} from '../../instruments/violin/violinSounds';
import type { ViolinVoiceTheme } from '../../instruments/violin/violinVoices';
import type { ViolinNoteLabelMode } from '../../storage/violinSettingsStorage';
import { ViolinNoteCell } from './ViolinNoteCell';

/** G thickest → E thinnest (player view: E on top). */
const STRING_THICKNESS: Record<ViolinStringId, number> = {
  v1: 1.4,
  v2: 1.9,
  v3: 2.5,
  v4: 3.2,
};

const SCROLL_WIDTH = 36;
const SCROLL_MARGIN_RIGHT = 2;
const BRIDGE_WIDTH = 14;
const LABEL_WIDTH = 22;
/** Rows stretch to the available height between these bounds. */
const MIN_ROW_HEIGHT = 36;
const MAX_ROW_HEIGHT = 84;
const ROW_GAP = 2;
const MIN_CELL_WIDTH = 26;
const STRING_COUNT = VIOLIN_STRINGS.length;
/** Card paddings + safety margin around the four string rows. */
const CARD_CHROME_HEIGHT = 34;

const STRING_INDEX: Record<ViolinStringId, number> = Object.fromEntries(
  VIOLIN_STRINGS.map((string, index) => [string.id, index]),
) as Record<ViolinStringId, number>;

/** Bow-sweep arpeggio spacing for strings crossed in one gesture. */
const SWEEP_STAGGER_MS = 22;

/** Pedagogic first-position fingering for semitone positions 0..9. */
const FINGER_LABELS = ['0', '1', '1', '2', '2', '3', '3', '4', '4', '4'];

/** Four tuning pegs — two per side, like the real pegbox. */
const PEG_SLOTS = [
  { key: 'peg1', top: '12%', side: 'left' },
  { key: 'peg2', top: '30%', side: 'right' },
  { key: 'peg3', top: '48%', side: 'left' },
  { key: 'peg4', top: '66%', side: 'right' },
] as const;

type FingerCell = {
  stringId: ViolinStringId;
  position: number;
};

type BoardLayout = {
  width: number;
  height: number;
  labelWidth: number;
  /** Fixed visual cell width — the touch grid must match it exactly. */
  cellWidth: number;
};

function cellKey(cell: FingerCell): string {
  return `${cell.stringId}:${cell.position}`;
}

function resolveCellAtPoint(
  x: number,
  y: number,
  layout: BoardLayout,
): FingerCell | null {
  const { width, height, labelWidth, cellWidth } = layout;
  if (width <= 0 || height <= 0 || cellWidth <= 0) {
    return null;
  }

  if (x < labelWidth || x > width || y < 0 || y > height) {
    return null;
  }

  const stringIndex = Math.min(
    STRING_COUNT - 1,
    Math.max(0, Math.floor((y / height) * STRING_COUNT)),
  );
  const stringId = VIOLIN_STRINGS[stringIndex].id;

  // Cells are laid out at a fixed cellWidth from the strip's left edge, so
  // divide by that — a proportional split drifted a few px at the right end.
  const position = Math.min(
    POSITION_COUNT - 1,
    Math.max(0, Math.floor((x - labelWidth) / cellWidth)),
  );

  return { stringId, position };
}

type ViolinFingerboardProps = {
  onPlayNote: (stringId: ViolinStringId, position: number) => void;
  theme: ViolinVoiceTheme;
  noteLabelMode?: ViolinNoteLabelMode;
  guideSoundId?: string | null;
  strongGuide?: boolean;
};

export function ViolinFingerboard({
  onPlayNote,
  theme,
  noteLabelMode = 'note',
  guideSoundId = null,
  strongGuide = false,
}: ViolinFingerboardProps) {
  const { t } = useTranslation();
  const [boardWidth, setBoardWidth] = useState(0);
  const [containerHeight, setContainerHeight] = useState(0);
  const [touchSize, setTouchSize] = useState({ width: 0, height: 0 });
  const [activeKeys, setActiveKeys] = useState<Set<string>>(new Set());
  const touchCellsRef = useRef<Map<string, FingerCell>>(new Map());
  const sweepTimersRef = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());

  // Fill the vertical space instead of a fixed 36px strip — the violin used
  // to float small in the middle of a landscape screen.
  const rowHeight = useMemo(() => {
    if (containerHeight <= 0) {
      return MIN_ROW_HEIGHT;
    }
    const available = containerHeight - CARD_CHROME_HEIGHT;
    const perRow = Math.floor(available / STRING_COUNT) - ROW_GAP;
    return Math.min(MAX_ROW_HEIGHT, Math.max(MIN_ROW_HEIGHT, perRow));
  }, [containerHeight]);

  const cellWidth = useMemo(() => {
    if (boardWidth <= 0) {
      return MIN_CELL_WIDTH;
    }
    const fixed = SCROLL_WIDTH + BRIDGE_WIDTH + LABEL_WIDTH + 20;
    const available = boardWidth - fixed;
    return Math.max(MIN_CELL_WIDTH, Math.floor(available / POSITION_COUNT));
  }, [boardWidth]);

  const boardLayout = useMemo<BoardLayout>(
    () => ({
      width: touchSize.width,
      height: touchSize.height,
      labelWidth: LABEL_WIDTH,
      cellWidth,
    }),
    [cellWidth, touchSize],
  );

  useEffect(() => {
    touchCellsRef.current.clear();
    setActiveKeys(new Set());
  }, [touchSize.width, touchSize.height]);

  const parsedGuide = guideSoundId ? parseViolinSoundId(guideSoundId) : null;
  const guideNoteKey =
    parsedGuide?.kind === 'note'
      ? `${parsedGuide.stringId}:${parsedGuide.position}`
      : null;

  const syncTouches = useCallback(
    (touches: readonly NativeTouchEvent[]) => {
      const nextTouchMap = new Map<string, FingerCell>();
      const cellsToTrigger: { cell: FingerCell; delayMs: number }[] = [];
      const previousTouchMap = touchCellsRef.current;

      for (const touch of touches) {
        const touchId = String(touch.identifier);
        const cell = resolveCellAtPoint(
          touch.locationX,
          touch.locationY,
          boardLayout,
        );
        if (!cell) {
          continue;
        }

        nextTouchMap.set(touchId, cell);
        const prev = previousTouchMap.get(touchId);
        if (
          !prev ||
          prev.stringId !== cell.stringId ||
          prev.position !== cell.position
        ) {
          // Bow sweep: a fast vertical swipe can jump rows between move
          // events — fill the skipped strings (position interpolated along
          // the gesture) with a short stagger so the arpeggio speaks.
          let delayMs = 0;
          if (prev && prev.stringId !== cell.stringId) {
            const from = STRING_INDEX[prev.stringId];
            const to = STRING_INDEX[cell.stringId];
            const step = to > from ? 1 : -1;
            const gap = Math.abs(to - from);
            let crossed = 0;
            for (let i = from + step; i !== to; i += step) {
              crossed += 1;
              const position = Math.round(
                prev.position + ((cell.position - prev.position) * crossed) / gap,
              );
              cellsToTrigger.push({
                cell: { stringId: VIOLIN_STRINGS[i].id, position },
                delayMs: (crossed - 1) * SWEEP_STAGGER_MS,
              });
              delayMs = crossed * SWEEP_STAGGER_MS;
            }
          }
          cellsToTrigger.push({ cell, delayMs });
        }
      }

      touchCellsRef.current = nextTouchMap;
      setActiveKeys(new Set([...nextTouchMap.values()].map((cell) => cellKey(cell))));

      for (const { cell, delayMs } of cellsToTrigger) {
        if (delayMs <= 0) {
          onPlayNote(cell.stringId, cell.position);
        } else {
          const timer = setTimeout(() => {
            sweepTimersRef.current.delete(timer);
            onPlayNote(cell.stringId, cell.position);
          }, delayMs);
          sweepTimersRef.current.add(timer);
        }
      }
    },
    [boardLayout, onPlayNote],
  );

  useEffect(() => {
    const timers = sweepTimersRef.current;
    return () => {
      for (const timer of timers) {
        clearTimeout(timer);
      }
      timers.clear();
    };
  }, []);

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

  const handleInstrumentLayout = (event: LayoutChangeEvent) => {
    setBoardWidth(event.nativeEvent.layout.width);
  };

  const handleTouchSurfaceLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setTouchSize({ width, height });
  };

  const board = theme.fingerboard;

  return (
    <View
      onLayout={(event) => setContainerHeight(event.nativeEvent.layout.height)}
      style={styles.container}
    >
      <View
        onLayout={handleInstrumentLayout}
        style={[
          styles.instrument,
          {
            backgroundColor: board.wood,
            borderColor: board.woodEdge,
          },
        ]}
      >
        <View
          pointerEvents="none"
          style={[styles.woodWash, { backgroundColor: `${board.woodEdge}33` }]}
        />

        <View style={styles.neckRow}>
          <View
            pointerEvents="none"
            style={[styles.scroll, { backgroundColor: board.wood }]}
          >
            {/* Volute: two offset rings + a core dot read as the spiral. */}
            <View
              style={[
                styles.volute,
                {
                  borderColor: board.woodEdge,
                  backgroundColor: `${board.woodEdge}22`,
                },
              ]}
            >
              <View
                style={[styles.voluteInner, { borderColor: board.woodEdge }]}
              />
              <View
                style={[styles.voluteDot, { backgroundColor: board.woodEdge }]}
              />
            </View>

            {/* Ebony pegbox with four protruding tuning pegs. */}
            <View
              style={[
                styles.pegbox,
                {
                  backgroundColor: board.board,
                  borderColor: `${board.woodEdge}66`,
                },
              ]}
            >
              {PEG_SLOTS.map((slot) => (
                <View
                  key={slot.key}
                  style={[
                    styles.peg,
                    { top: slot.top, backgroundColor: board.woodEdge },
                    slot.side === 'left' ? styles.pegLeft : styles.pegRight,
                  ]}
                >
                  <View
                    style={[
                      styles.pegTip,
                      { backgroundColor: board.nut },
                      slot.side === 'left'
                        ? styles.pegTipLeft
                        : styles.pegTipRight,
                    ]}
                  />
                </View>
              ))}
            </View>
          </View>

          {/* Multi-touch surface — same pattern as guitar fretboard. */}
          <View
            onLayout={handleTouchSurfaceLayout}
            onTouchCancel={handleTouchEnd}
            onTouchEnd={handleTouchEnd}
            onTouchMove={handleTouchMove}
            onTouchStart={handleTouchStart}
            style={styles.stringsBlock}
          >
            {VIOLIN_STRINGS.map((string) => {
              const thickness = STRING_THICKNESS[string.id];
              return (
                <View
                  key={string.id}
                  pointerEvents="none"
                  style={[styles.stringRow, { height: rowHeight }]}
                >
                  <Text style={[styles.stringLabel, { color: board.label }]}>
                    {t(string.labelKey)}
                  </Text>

                  <View
                    style={[
                      styles.boardStrip,
                      { backgroundColor: board.board },
                    ]}
                  >
                    <View
                      style={[
                        styles.stringWire,
                        {
                          height: thickness,
                          top: (rowHeight - thickness) / 2,
                          backgroundColor: board.string,
                          shadowColor: board.string,
                        },
                      ]}
                    />

                    <View style={styles.tapeRow}>
                      {Array.from({ length: POSITION_COUNT }, (_, position) =>
                        position === 0 ? (
                          <View key={position} style={{ width: cellWidth }} />
                        ) : (
                          <View
                            key={position}
                            style={[
                              styles.tapeMark,
                              {
                                left: position * cellWidth - 0.5,
                                backgroundColor: `${board.positionDot}AA`,
                              },
                            ]}
                          />
                        ),
                      )}
                    </View>

                    <View style={styles.padsRow}>
                      {Array.from({ length: POSITION_COUNT }, (_, position) => {
                        const key = `${string.id}:${position}`;
                        const isOpen = position === 0;
                        const label =
                          noteLabelMode === 'note'
                            ? getNoteLabel(string.id, position)
                            : noteLabelMode === 'finger'
                              ? FINGER_LABELS[position]
                              : undefined;
                        return (
                          <View
                            key={key}
                            style={[
                              isOpen && styles.nutColumn,
                              isOpen && {
                                backgroundColor: `${board.nut}22`,
                                borderRightColor: board.nut,
                              },
                              { width: cellWidth },
                            ]}
                          >
                            <ViolinNoteCell
                              guideAccent={theme.accent}
                              height={rowHeight}
                              isActive={activeKeys.has(key)}
                              isGuide={guideNoteKey === key}
                              isOpenString={isOpen}
                              label={label}
                              labelColor={board.positionLabel}
                              nutColor={board.nut}
                              positionDotColor={board.positionDot}
                              stringColor={board.string}
                              strongGuide={strongGuide}
                              width={cellWidth}
                            />
                          </View>
                        );
                      })}
                    </View>
                  </View>
                </View>
              );
            })}
          </View>

          <View
            pointerEvents="none"
            style={[styles.bridge, { backgroundColor: board.bridge }]}
          >
            <View
              style={[styles.bridgeTop, { backgroundColor: board.woodEdge }]}
            />
            {VIOLIN_STRINGS.map((string) => (
              <View
                key={string.id}
                style={[
                  styles.bridgeNotch,
                  {
                    height: STRING_THICKNESS[string.id],
                    backgroundColor: board.string,
                  },
                ]}
              />
            ))}
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  instrument: {
    borderRadius: 18,
    borderWidth: 2,
    overflow: 'hidden',
    paddingBottom: 12,
    paddingHorizontal: 8,
    paddingTop: 10,
  },
  woodWash: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.35,
  },
  neckRow: {
    alignItems: 'stretch',
    flexDirection: 'row',
  },
  scroll: {
    alignItems: 'center',
    marginRight: SCROLL_MARGIN_RIGHT,
    paddingBottom: 6,
    paddingTop: 4,
    width: SCROLL_WIDTH,
  },
  volute: {
    borderRadius: 14,
    borderWidth: 2.5,
    height: 28,
    width: 28,
  },
  voluteInner: {
    borderRadius: 7,
    borderWidth: 2,
    height: 14,
    marginLeft: 5,
    marginTop: 5,
    width: 14,
  },
  voluteDot: {
    borderRadius: 2,
    height: 4,
    left: 12,
    position: 'absolute',
    top: 12,
    width: 4,
  },
  pegbox: {
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
    borderTopLeftRadius: 3,
    borderTopRightRadius: 3,
    borderWidth: 1,
    flex: 1,
    marginTop: 3,
    width: 16,
  },
  peg: {
    borderRadius: 3,
    height: 5,
    position: 'absolute',
    width: 12,
  },
  pegLeft: {
    left: -9,
  },
  pegRight: {
    right: -9,
  },
  pegTip: {
    borderRadius: 1.5,
    height: 3,
    position: 'absolute',
    top: 1,
    width: 3,
  },
  pegTipLeft: {
    left: 1,
  },
  pegTipRight: {
    right: 1,
  },
  stringsBlock: {
    flex: 1,
  },
  stringRow: {
    alignItems: 'center',
    flexDirection: 'row',
    marginBottom: ROW_GAP,
  },
  stringLabel: {
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.5,
    textAlign: 'center',
    width: LABEL_WIDTH,
  },
  boardStrip: {
    borderRadius: 4,
    flex: 1,
    height: '100%',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  stringWire: {
    left: 0,
    opacity: 0.9,
    position: 'absolute',
    right: 0,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.45,
    shadowRadius: 2,
  },
  tapeRow: {
    ...StyleSheet.absoluteFillObject,
  },
  tapeMark: {
    bottom: 4,
    position: 'absolute',
    top: 4,
    width: 1,
  },
  padsRow: {
    alignItems: 'center',
    flexDirection: 'row',
    height: '100%',
  },
  nutColumn: {
    borderRightWidth: 2.5,
  },
  bridge: {
    alignItems: 'center',
    borderBottomRightRadius: 6,
    borderTopRightRadius: 6,
    justifyContent: 'space-evenly',
    marginLeft: 4,
    paddingVertical: 6,
    width: BRIDGE_WIDTH,
  },
  bridgeTop: {
    borderRadius: 2,
    height: 4,
    marginBottom: 2,
    width: 10,
  },
  bridgeNotch: {
    borderRadius: 1,
    width: 8,
  },
});
