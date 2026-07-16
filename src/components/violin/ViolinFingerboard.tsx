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

import { POSITION_COUNT } from '../../instruments/violin/violinNotes';
import {
  VIOLIN_PHRASES,
  type PhraseId,
} from '../../instruments/violin/violinPhrases';
import {
  parseViolinSoundId,
  VIOLIN_STRINGS,
  type ViolinStringId,
} from '../../instruments/violin/violinSounds';
import type { ViolinVoiceTheme } from '../../instruments/violin/violinVoices';
import { PhraseBar } from './PhraseBar';
import { ViolinNoteCell } from './ViolinNoteCell';

/** G thickest → E thinnest (player view: E on top). */
const STRING_THICKNESS: Record<ViolinStringId, number> = {
  v1: 1.4,
  v2: 1.9,
  v3: 2.5,
  v4: 3.2,
};

const SCROLL_WIDTH = 36;
const BRIDGE_WIDTH = 14;
const LABEL_WIDTH = 22;
const ROW_HEIGHT = 36;
const ROW_GAP = 2;
const MIN_CELL_WIDTH = 26;
const STRING_COUNT = VIOLIN_STRINGS.length;

type FingerCell = {
  stringId: ViolinStringId;
  position: number;
};

type BoardLayout = {
  width: number;
  height: number;
  labelWidth: number;
};

function cellKey(cell: FingerCell): string {
  return `${cell.stringId}:${cell.position}`;
}

function resolveCellAtPoint(
  x: number,
  y: number,
  layout: BoardLayout,
): FingerCell | null {
  const { width, height, labelWidth } = layout;
  if (width <= 0 || height <= 0) {
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

  const playableWidth = width - labelWidth;
  const position = Math.min(
    POSITION_COUNT - 1,
    Math.max(0, Math.floor(((x - labelWidth) / playableWidth) * POSITION_COUNT)),
  );

  return { stringId, position };
}

type ViolinFingerboardProps = {
  onPlayNote: (stringId: ViolinStringId, position: number) => void;
  onPlayPhrase: (phraseId: PhraseId) => void;
  theme: ViolinVoiceTheme;
  showPositionNumbers?: boolean;
  visiblePhraseIds?: PhraseId[];
  guideSoundId?: string | null;
  strongGuide?: boolean;
};

export function ViolinFingerboard({
  onPlayNote,
  onPlayPhrase,
  theme,
  showPositionNumbers = true,
  visiblePhraseIds,
  guideSoundId = null,
  strongGuide = false,
}: ViolinFingerboardProps) {
  const { t } = useTranslation();
  const [boardWidth, setBoardWidth] = useState(0);
  const [touchSize, setTouchSize] = useState({ width: 0, height: 0 });
  const [activeKeys, setActiveKeys] = useState<Set<string>>(new Set());
  const touchCellsRef = useRef<Map<string, FingerCell>>(new Map());

  const boardLayout = useMemo<BoardLayout>(
    () => ({
      width: touchSize.width,
      height: touchSize.height,
      labelWidth: LABEL_WIDTH,
    }),
    [touchSize],
  );

  useEffect(() => {
    touchCellsRef.current.clear();
    setActiveKeys(new Set());
  }, [touchSize.width, touchSize.height]);

  const parsedGuide = guideSoundId ? parseViolinSoundId(guideSoundId) : null;
  const guidePhraseId =
    parsedGuide?.kind === 'phrase' ? parsedGuide.phraseId : null;
  const guideNoteKey =
    parsedGuide?.kind === 'note'
      ? `${parsedGuide.stringId}:${parsedGuide.position}`
      : null;

  const phrases = useMemo(() => {
    const list = VIOLIN_PHRASES.filter((phrase) =>
      visiblePhraseIds ? visiblePhraseIds.includes(phrase.id) : true,
    ).map((phrase) => ({
      id: phrase.id,
      label: t(phrase.labelKey),
    }));

    if (
      guidePhraseId &&
      !list.some((phrase) => phrase.id === guidePhraseId)
    ) {
      const guidePhrase = VIOLIN_PHRASES.find(
        (phrase) => phrase.id === guidePhraseId,
      );
      if (guidePhrase) {
        list.unshift({
          id: guidePhrase.id,
          label: t(guidePhrase.labelKey),
        });
      }
    }
    return list;
  }, [guidePhraseId, t, visiblePhraseIds]);

  const cellWidth = useMemo(() => {
    if (boardWidth <= 0) {
      return MIN_CELL_WIDTH;
    }
    const fixed = SCROLL_WIDTH + BRIDGE_WIDTH + LABEL_WIDTH + 20;
    const available = boardWidth - fixed;
    return Math.max(MIN_CELL_WIDTH, Math.floor(available / POSITION_COUNT));
  }, [boardWidth]);

  const syncTouches = useCallback(
    (touches: readonly NativeTouchEvent[]) => {
      const nextTouchMap = new Map<string, FingerCell>();
      const cellsToTrigger: FingerCell[] = [];
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
          cellsToTrigger.push(cell);
        }
      }

      touchCellsRef.current = nextTouchMap;
      setActiveKeys(new Set([...nextTouchMap.values()].map((cell) => cellKey(cell))));

      for (const cell of cellsToTrigger) {
        onPlayNote(cell.stringId, cell.position);
      }
    },
    [boardLayout, onPlayNote],
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

  const handleInstrumentLayout = (event: LayoutChangeEvent) => {
    setBoardWidth(event.nativeEvent.layout.width);
  };

  const handleTouchSurfaceLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setTouchSize({ width, height });
  };

  const board = theme.fingerboard;
  const playableWidth = cellWidth * POSITION_COUNT;

  return (
    <View style={styles.container}>
      <PhraseBar
        accent={theme.accent}
        guidePhraseId={guidePhraseId}
        phrases={phrases}
        strongGuide={strongGuide}
        wood={board.wood}
        onPlayPhrase={(id) => onPlayPhrase(id as PhraseId)}
      />

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

        {showPositionNumbers ? (
          <View pointerEvents="none" style={styles.headerRow}>
            <View style={{ width: SCROLL_WIDTH + LABEL_WIDTH }} />
            <View style={[styles.positionRow, { width: playableWidth }]}>
              {Array.from({ length: POSITION_COUNT }, (_, position) => (
                <Text
                  key={position}
                  style={[
                    styles.positionLabel,
                    {
                      color: board.positionLabel,
                      width: cellWidth,
                    },
                  ]}
                >
                  {position}
                </Text>
              ))}
            </View>
            <View style={{ width: BRIDGE_WIDTH }} />
          </View>
        ) : null}

        <View style={styles.neckRow}>
          <View
            pointerEvents="none"
            style={[styles.scroll, { backgroundColor: board.wood }]}
          >
            <View
              style={[styles.scrollCurve, { borderColor: board.woodEdge }]}
            />
            <View style={[styles.peg, { backgroundColor: board.woodEdge }]} />
            <View
              style={[
                styles.peg,
                styles.pegLower,
                { backgroundColor: board.woodEdge },
              ]}
            />
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
                  style={[styles.stringRow, { height: ROW_HEIGHT }]}
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
                          top: (ROW_HEIGHT - thickness) / 2,
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
                              height={ROW_HEIGHT}
                              isActive={activeKeys.has(key)}
                              isGuide={guideNoteKey === key}
                              isOpenString={isOpen}
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
  headerRow: {
    alignItems: 'center',
    flexDirection: 'row',
    marginBottom: 4,
  },
  positionRow: {
    flexDirection: 'row',
  },
  positionLabel: {
    fontSize: 10,
    fontWeight: '600',
    textAlign: 'center',
  },
  neckRow: {
    alignItems: 'stretch',
    flexDirection: 'row',
  },
  scroll: {
    alignItems: 'center',
    borderBottomLeftRadius: 20,
    borderTopLeftRadius: 20,
    justifyContent: 'center',
    marginRight: 2,
    paddingVertical: 8,
    width: SCROLL_WIDTH,
  },
  scrollCurve: {
    borderRadius: 14,
    borderWidth: 2,
    height: 28,
    marginBottom: 10,
    width: 22,
  },
  peg: {
    borderRadius: 4,
    height: 8,
    marginVertical: 3,
    width: 14,
  },
  pegLower: {
    opacity: 0.75,
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
    fontSize: 13,
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
