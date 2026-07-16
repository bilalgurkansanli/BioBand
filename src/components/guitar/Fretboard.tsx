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

import { ChordBar } from './ChordBar';
import { ChordPlayModeBar } from './ChordPlayModeBar';
import { GuitarStringRow } from './GuitarStringRow';
import {
  ALL_GUITAR_CHORD_IDS,
  getChordById,
  getChordFretting,
  GUITAR_CHORDS,
  type ChordFretting,
  type ChordId,
} from '../../instruments/guitar/guitarChords';
import {
  GUITAR_CHORD_PLAY_MODES,
  type GuitarChordGesture,
  type GuitarChordPlayMode,
} from '../../instruments/guitar/guitarChordPatterns';
import {
  GUITAR_MAX_FRET,
  GUITAR_STRINGS,
  parseGuitarSoundId,
  type GuitarStringId,
} from '../../instruments/guitar/guitarSounds';
import type { GuitarStrumDirection } from '../../instruments/guitar/guitarEngine';
import { guitarVelocityFromStringLocalY } from '../../instruments/guitar/guitarVelocity';
import type { GuitarVoiceTheme } from '../../instruments/guitar/guitarVoices';
import { getGuitarVoice } from '../../instruments/guitar/guitarVoices';
import { colors } from '../../theme/colors';

const DEFAULT_THEME = getGuitarVoice('nylon').theme;

type FretCell = {
  stringId: GuitarStringId;
  fret: number;
  /** 0 soft (finger) → 1 hard (pick), from Y in the string band. */
  velocity: number;
};

type BoardLayout = {
  width: number;
  height: number;
  labelWidth: number;
};

type FretboardProps = {
  onPluckIn: (stringId: GuitarStringId, fret: number, velocity: number) => void;
  onPluckOut?: (stringId: GuitarStringId, fret: number) => void;
  /** Arm + play (`direction`), or deselect when `direction` is null. */
  onSelectChord: (
    chordId: ChordId,
    direction: GuitarStrumDirection | null,
    gesture: GuitarChordGesture,
  ) => void;
  selectedChordId?: ChordId | null;
  chordPlayMode?: GuitarChordPlayMode;
  onChordPlayModeChange?: (mode: GuitarChordPlayMode) => void;
  /** When false, hide Strum / Arpeggio / Rasgueado bar (mode still applies). */
  showChordPlayModeBar?: boolean;
  /** Which play-mode buttons appear on the bar. */
  visiblePlayModes?: readonly GuitarChordPlayMode[];
  /** Allow-list for ChordBar; catalog order. Guide chord is always appended if missing. */
  visibleChordIds?: readonly ChordId[];
  guideSoundId?: string | null;
  strongGuide?: boolean;
  showFretNumbers?: boolean;
  /** Full voice look — stage + fretboard colors (like piano theme). */
  theme?: GuitarVoiceTheme;
};

const STRING_THICKNESS: Record<GuitarStringId, number> = {
  s6: 3.5,
  s5: 3,
  s4: 2.5,
  s3: 2,
  s2: 1.5,
  s1: 1.2,
};

const LABEL_WIDTH = 18;
const LABEL_GAP = 6;
const FRET_COUNT = GUITAR_MAX_FRET + 1;

function cellKey(cell: FretCell): string {
  return `${cell.stringId}:f${cell.fret}`;
}

function resolveCellAtPoint(
  x: number,
  y: number,
  layout: BoardLayout,
  chordFretting: ChordFretting | null,
): FretCell | null {
  const { width, height, labelWidth } = layout;
  if (width <= 0 || height <= 0) {
    return null;
  }

  const fretsLeft = labelWidth + LABEL_GAP;
  if (x < fretsLeft || x > width || y < 0 || y > height) {
    return null;
  }

  const stringCount = GUITAR_STRINGS.length;
  const stringIndex = Math.min(
    stringCount - 1,
    Math.max(0, Math.floor((y / height) * stringCount)),
  );
  const stringId = GUITAR_STRINGS[stringIndex].id;
  const stringBand = height / stringCount;
  const localY = stringBand > 0 ? (y - stringIndex * stringBand) / stringBand : 0.5;
  const velocity = guitarVelocityFromStringLocalY(localY);

  // Chord armed: any touch on a sounding string uses that string's chord fret.
  if (chordFretting) {
    const chordFret = chordFretting[stringId];
    if (chordFret === null) {
      return null;
    }
    return { stringId, fret: chordFret, velocity };
  }

  const fretsWidth = width - fretsLeft;
  const fret = Math.min(
    GUITAR_MAX_FRET,
    Math.max(0, Math.floor(((x - fretsLeft) / fretsWidth) * FRET_COUNT)),
  );

  return { stringId, fret, velocity };
}

export function Fretboard({
  onPluckIn,
  onPluckOut,
  onSelectChord,
  selectedChordId = null,
  chordPlayMode = 'strum',
  onChordPlayModeChange,
  showChordPlayModeBar = true,
  visiblePlayModes = GUITAR_CHORD_PLAY_MODES,
  visibleChordIds = ALL_GUITAR_CHORD_IDS,
  guideSoundId = null,
  strongGuide = true,
  showFretNumbers = false,
  theme = DEFAULT_THEME,
}: FretboardProps) {
  const { accent, stageBg, stageOverlay, fretboard } = theme;
  const { t } = useTranslation();
  const [boardSize, setBoardSize] = useState({ width: 0, height: 0 });
  const [activeKeys, setActiveKeys] = useState<Set<string>>(new Set());
  const touchCellsRef = useRef<Map<string, FretCell>>(new Map());

  const boardLayout = useMemo<BoardLayout>(
    () => ({
      width: boardSize.width,
      height: boardSize.height,
      labelWidth: LABEL_WIDTH,
    }),
    [boardSize],
  );

  const chordFretting = useMemo(() => {
    if (!selectedChordId) {
      return null;
    }
    const chord = getChordById(selectedChordId);
    return chord ? getChordFretting(chord) : null;
  }, [selectedChordId]);

  useEffect(() => {
    touchCellsRef.current.clear();
    setActiveKeys(new Set());
  }, [boardLayout.width, boardLayout.height, selectedChordId]);

  const parsed = guideSoundId ? parseGuitarSoundId(guideSoundId) : null;
  const guideChordId = parsed?.kind === 'chord' ? parsed.chordId : null;
  const guideStringId = parsed?.kind === 'pluck' ? parsed.stringId : null;
  const guideFret = parsed?.kind === 'pluck' ? parsed.fret : null;

  const chords = useMemo(() => {
    const allowed = new Set(visibleChordIds);
    if (guideChordId) {
      allowed.add(guideChordId);
    }
    return GUITAR_CHORDS.filter((chord) => allowed.has(chord.id)).map((chord) => ({
      id: chord.id,
      label: t(chord.labelKey),
      family: chord.family,
    }));
  }, [guideChordId, t, visibleChordIds]);

  const armedChord = selectedChordId ? getChordById(selectedChordId) : undefined;
  const barreFret = armedChord?.barreFret ?? null;

  const fretHeaders = Array.from({ length: FRET_COUNT }, (_, i) => i);

  const activeByString = useMemo(() => {
    const map = new Map<GuitarStringId, Set<number>>();
    for (const key of activeKeys) {
      const match = key.match(/^(s[1-6]):f(\d+)$/);
      if (!match) {
        continue;
      }
      const stringId = match[1] as GuitarStringId;
      const fret = Number(match[2]);
      let set = map.get(stringId);
      if (!set) {
        set = new Set();
        map.set(stringId, set);
      }
      set.add(fret);
    }
    return map;
  }, [activeKeys]);

  const syncTouches = useCallback(
    (touches: readonly NativeTouchEvent[]) => {
      const nextTouchMap = new Map<string, FretCell>();
      const cellsToTrigger: FretCell[] = [];
      const previousTouchMap = touchCellsRef.current;

      for (const touch of touches) {
        const touchId = String(touch.identifier);
        const cell = resolveCellAtPoint(
          touch.locationX,
          touch.locationY,
          boardLayout,
          chordFretting,
        );
        if (!cell) {
          continue;
        }

        nextTouchMap.set(touchId, cell);
        const prev = previousTouchMap.get(touchId);
        if (!prev || prev.stringId !== cell.stringId || prev.fret !== cell.fret) {
          cellsToTrigger.push(cell);
        }
      }

      const nextActive = new Set(
        [...nextTouchMap.values()].map((cell) => cellKey(cell)),
      );
      const previousActive = new Set(
        [...previousTouchMap.values()].map((cell) => cellKey(cell)),
      );

      for (const key of previousActive) {
        if (!nextActive.has(key)) {
          const match = key.match(/^(s[1-6]):f(\d+)$/);
          if (match) {
            onPluckOut?.(match[1] as GuitarStringId, Number(match[2]));
          }
        }
      }

      touchCellsRef.current = nextTouchMap;
      setActiveKeys(nextActive);

      for (const cell of cellsToTrigger) {
        onPluckIn(cell.stringId, cell.fret, cell.velocity);
      }
    },
    [boardLayout, chordFretting, onPluckIn, onPluckOut],
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

  const onBoardLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setBoardSize({ width, height });
  };

  return (
    <View style={[styles.container, { backgroundColor: stageBg }]}>
      <View
        pointerEvents="none"
        style={[styles.stageWash, { backgroundColor: stageOverlay }]}
      />
      <View style={styles.content}>
        <View style={styles.chordBarSlot}>
          {showChordPlayModeBar && onChordPlayModeChange ? (
            <ChordPlayModeBar
              accent={accent}
              mode={chordPlayMode}
              onChange={onChordPlayModeChange}
              visibleModes={visiblePlayModes}
            />
          ) : null}
          <ChordBar
            accent={accent}
            chords={chords}
            guideChordId={guideChordId}
            onSelectChord={(id, direction, gesture) =>
              onSelectChord(id as ChordId, direction, gesture)
            }
            selectedChordId={selectedChordId}
            strongGuide={strongGuide}
          />
        </View>

        <View style={styles.board}>
          {showFretNumbers ? (
            <View style={styles.headerRow}>
              <View style={styles.headerSpacer} />
              <View style={styles.headerFrets}>
                {fretHeaders.map((fret) => (
                  <Text key={fret} style={[styles.headerLabel, { color: accent }]}>
                    {fret === 0 ? 'O' : String(fret)}
                  </Text>
                ))}
              </View>
            </View>
          ) : null}

          <View
            onLayout={onBoardLayout}
            onTouchCancel={handleTouchEnd}
            onTouchEnd={handleTouchEnd}
            onTouchMove={handleTouchMove}
            onTouchStart={handleTouchStart}
            style={styles.strings}
          >
            {GUITAR_STRINGS.map((string) => {
              const shapeFret = chordFretting ? chordFretting[string.id] : undefined;
              return (
                <GuitarStringRow
                  key={string.id}
                  accent={accent}
                  activeFrets={activeByString.get(string.id) ?? EMPTY_FRETS}
                  barreFret={barreFret}
                  chordFret={shapeFret === undefined ? undefined : shapeFret}
                  chordMuted={shapeFret === null}
                  fretboard={fretboard}
                  guideFret={guideStringId === string.id ? guideFret : null}
                  label={string.label}
                  showFretNumbers={false}
                  stringThickness={STRING_THICKNESS[string.id]}
                  strongGuide={strongGuide}
                />
              );
            })}
          </View>
        </View>
      </View>
    </View>
  );
}

const EMPTY_FRETS: ReadonlySet<number> = new Set();

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    overflow: 'hidden',
    paddingVertical: 4,
  },
  stageWash: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.55,
    top: '28%',
  },
  content: {
    flex: 1,
    zIndex: 1,
  },
  chordBarSlot: {
    paddingHorizontal: 8,
  },
  board: {
    flex: 1,
    minHeight: 0,
    paddingHorizontal: 8,
  },
  headerRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: LABEL_GAP,
    marginBottom: 2,
  },
  headerSpacer: {
    width: LABEL_WIDTH,
  },
  headerFrets: {
    flex: 1,
    flexDirection: 'row',
  },
  headerLabel: {
    color: colors.textSecondary,
    flex: 1,
    fontSize: 9,
    fontWeight: '600',
    textAlign: 'center',
  },
  strings: {
    flex: 1,
    justifyContent: 'space-evenly',
  },
});
