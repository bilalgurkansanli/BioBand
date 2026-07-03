import { useCallback, useMemo, useRef, useState } from 'react';
import { type GestureResponderEvent, StyleSheet, View } from 'react-native';

import {
  BLACK_PIANO_NOTES,
  WHITE_PIANO_NOTES,
  type NoteId,
} from '../../instruments/piano/pianoNotes';
import { PianoKey } from './PianoKey';

const KEY_GAP = 2;

type KeyLayout = {
  whiteKeyWidth: number;
  blackKeyWidth: number;
  blackKeyHeight: number;
};

function resolveNoteAtPoint(x: number, y: number, layout: KeyLayout): NoteId | null {
  const { whiteKeyWidth, blackKeyWidth, blackKeyHeight } = layout;
  const slot = whiteKeyWidth + KEY_GAP;

  for (const note of BLACK_PIANO_NOTES) {
    const left =
      (note.blackKeyAfterWhite ?? 0) * slot + whiteKeyWidth - blackKeyWidth / 2;

    if (y >= 0 && y <= blackKeyHeight && x >= left && x <= left + blackKeyWidth) {
      return note.id;
    }
  }

  const whiteIndex = Math.floor(x / slot);
  if (whiteIndex < 0 || whiteIndex >= WHITE_PIANO_NOTES.length) {
    return null;
  }

  const keyLeft = whiteIndex * slot;
  if (x < keyLeft || x > keyLeft + whiteKeyWidth) {
    return null;
  }

  return WHITE_PIANO_NOTES[whiteIndex].id;
}

type PianoKeyboardProps = {
  width: number;
  height: number;
  onNotePressIn: (noteId: NoteId) => void;
  onNotePressOut?: (noteId: NoteId) => void;
  enableSound?: boolean;
  guideNoteId?: NoteId | null;
  demoNoteId?: NoteId | null;
};

export function PianoKeyboard({
  width,
  height,
  onNotePressIn,
  onNotePressOut,
  enableSound = true,
  guideNoteId = null,
  demoNoteId = null,
}: PianoKeyboardProps) {
  const { whiteKeyWidth, whiteKeyHeight, blackKeyWidth, blackKeyHeight, keyboardWidth, keyLayout } =
    useMemo(() => {
      const whiteKeyCount = WHITE_PIANO_NOTES.length;
      const computedWhiteWidth = Math.max(
        24,
        Math.floor((width - whiteKeyCount * KEY_GAP) / whiteKeyCount),
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
        },
      };
    }, [width, height]);

  const [activeNotes, setActiveNotes] = useState<Set<NoteId>>(new Set());
  const touchNotesRef = useRef<Map<string, NoteId>>(new Map());
  const holdCountRef = useRef<Map<NoteId, number>>(new Map());

  const pressNote = useCallback(
    (noteId: NoteId) => {
      const count = holdCountRef.current.get(noteId) ?? 0;
      holdCountRef.current.set(noteId, count + 1);

      if (count === 0) {
        if (enableSound) {
          onNotePressIn(noteId);
        }
        setActiveNotes((current) => new Set(current).add(noteId));
      }
    },
    [enableSound, onNotePressIn],
  );

  const releaseNote = useCallback(
    (noteId: NoteId) => {
      const count = holdCountRef.current.get(noteId) ?? 0;
      if (count <= 1) {
        holdCountRef.current.delete(noteId);
        setActiveNotes((current) => {
          const next = new Set(current);
          next.delete(noteId);
          return next;
        });
        onNotePressOut?.(noteId);
        return;
      }

      holdCountRef.current.set(noteId, count - 1);
    },
    [onNotePressOut],
  );

  const setTouchNote = useCallback(
    (touchId: string, noteId: NoteId | null) => {
      const previous = touchNotesRef.current.get(touchId);

      if (previous === noteId) {
        return;
      }

      if (previous) {
        releaseNote(previous);
        touchNotesRef.current.delete(touchId);
      }

      if (noteId) {
        touchNotesRef.current.set(touchId, noteId);
        pressNote(noteId);
      }
    },
    [pressNote, releaseNote],
  );

  const clearTouch = useCallback(
    (touchId: string) => {
      const previous = touchNotesRef.current.get(touchId);
      if (!previous) {
        return;
      }

      touchNotesRef.current.delete(touchId);
      releaseNote(previous);
    },
    [releaseNote],
  );

  const handleTouches = useCallback(
    (event: GestureResponderEvent, phase: 'start' | 'move' | 'end') => {
      if (phase === 'end') {
        for (const touch of event.nativeEvent.changedTouches) {
          clearTouch(String(touch.identifier));
        }
        return;
      }

      let touches = event.nativeEvent.changedTouches;
      if (phase === 'start' && touches.length === 0) {
        touches = event.nativeEvent.touches;
      }
      if (phase === 'move') {
        touches = event.nativeEvent.touches;
      }

      for (const touch of touches) {
        const noteId = resolveNoteAtPoint(touch.locationX, touch.locationY, keyLayout);
        if (noteId) {
          setTouchNote(String(touch.identifier), noteId);
        } else {
          clearTouch(String(touch.identifier));
        }
      }
    },
    [clearTouch, keyLayout, setTouchNote],
  );

  const handleTouchStart = useCallback(
    (event: GestureResponderEvent) => handleTouches(event, 'start'),
    [handleTouches],
  );

  const handleTouchMove = useCallback(
    (event: GestureResponderEvent) => handleTouches(event, 'move'),
    [handleTouches],
  );

  const handleTouchEnd = useCallback(
    (event: GestureResponderEvent) => handleTouches(event, 'end'),
    [handleTouches],
  );

  return (
    <View style={[styles.wrapper, { width, height }]}>
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
              height={whiteKeyHeight}
              isActive={activeNotes.has(note.id)}
              isBlackKey={false}
              isDemo={demoNoteId === note.id}
              isGuide={guideNoteId === note.id}
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
