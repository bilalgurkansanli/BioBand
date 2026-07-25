import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { type GestureResponderEvent, type NativeTouchEvent, StyleSheet, View } from 'react-native';

import {
  BLACK_PIANO_NOTES,
  WHITE_PIANO_NOTES,
  type NoteId,
} from '../../instruments/piano/pianoNotes';
import type { PianoKeyColors } from '../../instruments/piano/pianoVoices';
import type { PianoLabelMode } from '../../storage/pianoSettingsStorage';
import { PianoKey } from './PianoKey';

const KEY_GAP = 2;
// Uncapped, keys stretch to fill a tablet's full landscape width awkwardly —
// this keeps them at a comfortable playing size; `wrapper`'s alignItems:
// 'center' centers the now-narrower keyboard in the remaining space.
const MAX_WHITE_KEY_WIDTH = 72;

type KeyLayout = {
  whiteKeyWidth: number;
  blackKeyWidth: number;
  blackKeyHeight: number;
  keyboardWidth: number;
};

function resolveNoteAtPoint(x: number, y: number, layout: KeyLayout): NoteId | null {
  const { whiteKeyWidth, blackKeyWidth, blackKeyHeight, keyboardWidth } = layout;
  const slot = whiteKeyWidth + KEY_GAP;

  if (x < 0 || y < 0 || x > keyboardWidth) {
    return null;
  }

  if (y <= blackKeyHeight) {
    for (const note of BLACK_PIANO_NOTES) {
      const left =
        (note.blackKeyAfterWhite ?? 0) * slot + whiteKeyWidth - blackKeyWidth / 2;

      if (x >= left && x <= left + blackKeyWidth) {
        return note.id;
      }
    }
  }

  for (let index = 0; index < WHITE_PIANO_NOTES.length; index++) {
    const keyLeft = index * slot;
    const keyRight =
      index === WHITE_PIANO_NOTES.length - 1 ? keyboardWidth : keyLeft + whiteKeyWidth;

    if (x >= keyLeft && x <= keyRight) {
      return WHITE_PIANO_NOTES[index].id;
    }
  }

  return null;
}

export type PianoKeyboardTheme = {
  background: string;
  badgeLow: string;
  badgeHigh: string;
  keys?: PianoKeyColors;
};

const DEFAULT_THEME: PianoKeyboardTheme = {
  background: '#0A0A0A',
  badgeLow: '#8BC34A',
  badgeHigh: '#64B5F6',
};

type PianoKeyboardProps = {
  width: number;
  height: number;
  onNotePressIn: (noteId: NoteId) => void;
  onNotePressOut?: (noteId: NoteId) => void;
  enableSound?: boolean;
  guideNoteId?: NoteId | null;
  demoNoteId?: NoteId | null;
  /** Notes belonging to the selected scale (soft highlight). */
  scaleNoteIds?: ReadonlySet<NoteId> | null;
  theme?: PianoKeyboardTheme;
  labelMode?: PianoLabelMode;
};

export function PianoKeyboard({
  width,
  height,
  onNotePressIn,
  onNotePressOut,
  enableSound = true,
  guideNoteId = null,
  demoNoteId = null,
  scaleNoteIds = null,
  theme = DEFAULT_THEME,
  labelMode = 'both',
}: PianoKeyboardProps) {
  const { whiteKeyWidth, whiteKeyHeight, blackKeyWidth, blackKeyHeight, keyboardWidth, keyLayout } =
    useMemo(() => {
      const whiteKeyCount = WHITE_PIANO_NOTES.length;
      const computedWhiteWidth = Math.min(
        MAX_WHITE_KEY_WIDTH,
        Math.max(24, Math.floor((width - whiteKeyCount * KEY_GAP) / whiteKeyCount)),
      );
      const computedKeyboardWidth = whiteKeyCount * (computedWhiteWidth + KEY_GAP) - KEY_GAP;
      const computedWhiteHeight = Math.max(100, height * 0.98);
      const computedBlackWidth = Math.round(computedWhiteWidth * 0.58);
      const computedBlackHeight = Math.round(computedWhiteHeight * 0.6);

      return {
        whiteKeyWidth: computedWhiteWidth,
        whiteKeyHeight: computedWhiteHeight,
        blackKeyWidth: computedBlackWidth,
        blackKeyHeight: computedBlackHeight,
        keyboardWidth: computedKeyboardWidth,
        keyLayout: {
          whiteKeyWidth: computedWhiteWidth,
          blackKeyWidth: computedBlackWidth,
          blackKeyHeight: computedBlackHeight,
          keyboardWidth: computedKeyboardWidth,
        },
      };
    }, [width, height]);

  const [activeNotes, setActiveNotes] = useState<Set<NoteId>>(new Set());
  const touchNotesRef = useRef<Map<string, NoteId>>(new Map());

  useEffect(() => {
    touchNotesRef.current.clear();
    setActiveNotes(new Set());
  }, [keyLayout]);

  const syncTouches = useCallback(
    (touches: readonly NativeTouchEvent[]) => {
      const nextTouchMap = new Map<string, NoteId>();
      const notesToTrigger: NoteId[] = [];
      const previousTouchMap = touchNotesRef.current;

      for (const touch of touches) {
        const touchId = String(touch.identifier);
        const noteId = resolveNoteAtPoint(touch.locationX, touch.locationY, keyLayout);
        if (!noteId) {
          continue;
        }

        nextTouchMap.set(touchId, noteId);

        if (previousTouchMap.get(touchId) !== noteId) {
          notesToTrigger.push(noteId);
        }
      }

      const nextActiveNotes = new Set(nextTouchMap.values());
      const previousActiveNotes = new Set(previousTouchMap.values());

      for (const noteId of previousActiveNotes) {
        if (!nextActiveNotes.has(noteId)) {
          onNotePressOut?.(noteId);
        }
      }

      touchNotesRef.current = nextTouchMap;
      setActiveNotes(nextActiveNotes);

      if (enableSound) {
        for (const noteId of notesToTrigger) {
          onNotePressIn(noteId);
        }
      }
    },
    [enableSound, keyLayout, onNotePressIn, onNotePressOut],
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
    <View style={[styles.wrapper, { width, height, backgroundColor: theme.background }]}>
      <View
        onTouchCancel={handleTouchEnd}
        onTouchEnd={handleTouchEnd}
        onTouchMove={handleTouchMove}
        onTouchStart={handleTouchStart}
        style={[styles.keyboard, { width: keyboardWidth, height: whiteKeyHeight }]}
      >
        <View pointerEvents="none" style={styles.whiteKeysRow}>
          {WHITE_PIANO_NOTES.map((note) => (
            <PianoKey
              key={note.id}
              badgeColorHigh={theme.badgeHigh}
              badgeColorLow={theme.badgeLow}
              height={whiteKeyHeight}
              isActive={activeNotes.has(note.id)}
              isBlackKey={false}
              isDemo={demoNoteId === note.id}
              isGuide={guideNoteId === note.id}
              isInScale={scaleNoteIds?.has(note.id) ?? false}
              keyColors={theme.keys}
              labelMode={labelMode}
              letterLabel={note.label}
              noteId={note.id}
              solfegeLabel={note.solfegeLabel}
              width={whiteKeyWidth}
            />
          ))}
        </View>

        {BLACK_PIANO_NOTES.map((note) => {
          const left =
            (note.blackKeyAfterWhite ?? 0) * (whiteKeyWidth + KEY_GAP) +
            whiteKeyWidth -
            blackKeyWidth / 2;

          return (
            <View key={note.id} pointerEvents="none" style={[styles.blackKeyWrapper, { left }]}>
              <PianoKey
                height={blackKeyHeight}
                isActive={activeNotes.has(note.id)}
                isBlackKey
                isDemo={demoNoteId === note.id}
                isGuide={guideNoteId === note.id}
                isInScale={scaleNoteIds?.has(note.id) ?? false}
                keyColors={theme.keys}
                labelMode={labelMode}
                letterLabel={note.label}
                noteId={note.id}
                solfegeLabel={note.solfegeLabel}
                width={blackKeyWidth}
              />
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    backgroundColor: '#0A0A0A',
    justifyContent: 'flex-end',
  },
  keyboard: {
    position: 'relative',
  },
  whiteKeysRow: {
    flexDirection: 'row',
  },
  blackKeyWrapper: {
    elevation: 8,
    position: 'absolute',
    top: 0,
    zIndex: 10,
  },
});
