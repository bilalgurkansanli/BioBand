import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import {
  BLACK_PIANO_NOTES,
  WHITE_PIANO_NOTES,
  type NoteId,
} from '../../instruments/piano/pianoNotes';
import { PianoKey } from './PianoKey';

const KEY_GAP = 2;

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
  const { whiteKeyWidth, whiteKeyHeight, blackKeyWidth, blackKeyHeight, keyboardWidth } =
    useMemo(() => {
      const whiteKeyCount = WHITE_PIANO_NOTES.length;
      const computedWhiteWidth = Math.max(
        28,
        Math.floor(width / whiteKeyCount) - KEY_GAP,
      );
      const computedKeyboardWidth = whiteKeyCount * (computedWhiteWidth + KEY_GAP);
      const computedWhiteHeight = Math.max(100, height * 0.96);
      const computedBlackWidth = Math.round(computedWhiteWidth * 0.6);
      const computedBlackHeight = Math.round(computedWhiteHeight * 0.62);

      return {
        whiteKeyWidth: computedWhiteWidth,
        whiteKeyHeight: computedWhiteHeight,
        blackKeyWidth: computedBlackWidth,
        blackKeyHeight: computedBlackHeight,
        keyboardWidth: computedKeyboardWidth,
      };
    }, [width, height]);

  const [activeNotes, setActiveNotes] = useState<Set<NoteId>>(new Set());

  const handlePressIn = (noteId: NoteId) => {
    setActiveNotes((current) => new Set(current).add(noteId));
    if (enableSound) {
      onNotePressIn(noteId);
    }
  };

  const handlePressOut = (noteId: NoteId) => {
    setActiveNotes((current) => {
      const next = new Set(current);
      next.delete(noteId);
      return next;
    });
    onNotePressOut?.(noteId);
  };

  const keyboard = (
    <View style={[styles.keyboard, { width: keyboardWidth, height: whiteKeyHeight }]}>
      <View style={styles.whiteKeysRow}>
        {WHITE_PIANO_NOTES.map((note) => (
          <PianoKey
            key={note.id}
            height={whiteKeyHeight}
            isActive={activeNotes.has(note.id)}
            isBlackKey={false}
            isDemo={demoNoteId === note.id}
            isGuide={guideNoteId === note.id}
            letterLabel={note.label}
            onPressIn={() => handlePressIn(note.id)}
            onPressOut={() => handlePressOut(note.id)}
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
          <View key={note.id} style={[styles.blackKeyWrapper, { left }]}>
            <PianoKey
              height={blackKeyHeight}
              isActive={activeNotes.has(note.id)}
              isBlackKey
              isDemo={demoNoteId === note.id}
              isGuide={guideNoteId === note.id}
              letterLabel={note.label}
              onPressIn={() => handlePressIn(note.id)}
              onPressOut={() => handlePressOut(note.id)}
              solfegeLabel={note.solfegeLabel}
              width={blackKeyWidth}
            />
          </View>
        );
      })}
    </View>
  );

  if (keyboardWidth > width) {
    return (
      <ScrollView
        horizontal
        contentContainerStyle={styles.scrollContent}
        showsHorizontalScrollIndicator={false}
        style={{ width, height }}
      >
        {keyboard}
      </ScrollView>
    );
  }

  return (
    <View style={[styles.wrapper, { width, height }]}>
      {keyboard}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  scrollContent: {
    alignItems: 'flex-end',
    flexGrow: 1,
    justifyContent: 'flex-end',
  },
  keyboard: {
    position: 'relative',
  },
  whiteKeysRow: {
    flexDirection: 'row',
  },
  blackKeyWrapper: {
    position: 'absolute',
    top: 0,
    zIndex: 2,
  },
});
