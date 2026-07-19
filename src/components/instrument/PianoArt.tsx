import { Animated, StyleSheet, View } from 'react-native';

import type { NoteId } from '../../instruments/piano/pianoNotes';
import { colors } from '../../theme/colors';

const WHITE_NOTES: NoteId[] = ['C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4', 'C5'];
const BLACK_NOTES: { id: NoteId; afterWhite: number }[] = [
  { id: 'Db4', afterWhite: 0 },
  { id: 'Eb4', afterWhite: 1 },
  { id: 'Gb4', afterWhite: 3 },
  { id: 'Ab4', afterWhite: 4 },
  { id: 'Bb4', afterWhite: 5 },
];

const WHITE_WIDTH_PCT = 100 / WHITE_NOTES.length;
const BLACK_WIDTH_PCT = WHITE_WIDTH_PCT * 0.6;

type PianoArtProps = {
  /**
   * Optional press animations per note id (0 = rest, 1 = pressed). Keys
   * without an entry render static.
   */
  keyAnims?: Map<string, Animated.Value>;
};

/**
 * Decorative one-octave keyboard drawn with plain views. Fills its parent —
 * the parent decides size, position, and opacity.
 */
export function PianoArt({ keyAnims }: PianoArtProps) {
  return (
    <View pointerEvents="none" style={styles.container}>
      <View style={styles.whiteRow}>
        {WHITE_NOTES.map((noteId) => {
          const anim = keyAnims?.get(noteId);
          return (
            <View key={noteId} style={styles.whiteKeySlot}>
              <Animated.View
                style={[styles.whiteKey, anim ? pressedStyle(anim, 5) : null]}
              >
                {anim ? <PressHighlight anim={anim} maxOpacity={0.38} /> : null}
              </Animated.View>
            </View>
          );
        })}
      </View>

      {BLACK_NOTES.map(({ id, afterWhite }) => {
        const anim = keyAnims?.get(id);
        return (
          <View
            key={id}
            style={[
              styles.blackKeySlot,
              {
                left: `${(afterWhite + 1) * WHITE_WIDTH_PCT - BLACK_WIDTH_PCT / 2}%`,
                width: `${BLACK_WIDTH_PCT}%`,
              },
            ]}
          >
            <Animated.View
              style={[styles.blackKey, anim ? pressedStyle(anim, 4) : null]}
            >
              <View style={styles.blackKeyShine} />
              {anim ? <PressHighlight anim={anim} maxOpacity={0.55} /> : null}
            </Animated.View>
          </View>
        );
      })}
    </View>
  );
}

function pressedStyle(anim: Animated.Value, depth: number) {
  return {
    transform: [
      {
        translateY: anim.interpolate({
          inputRange: [0, 1],
          outputRange: [0, depth],
        }),
      },
    ],
  };
}

function PressHighlight({
  anim,
  maxOpacity,
}: {
  anim: Animated.Value;
  maxOpacity: number;
}) {
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.keyHighlight,
        {
          opacity: anim.interpolate({
            inputRange: [0, 1],
            outputRange: [0, maxOpacity],
          }),
        },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  whiteRow: {
    flex: 1,
    flexDirection: 'row',
  },
  whiteKeySlot: {
    flex: 1,
    paddingHorizontal: 1,
  },
  whiteKey: {
    backgroundColor: '#F4F4F4',
    borderBottomColor: '#B8B8B8',
    borderBottomWidth: 4,
    borderBottomLeftRadius: 5,
    borderBottomRightRadius: 5,
    borderTopColor: '#FAFAFA',
    borderTopWidth: 1,
    flex: 1,
    overflow: 'hidden',
  },
  blackKeySlot: {
    height: '58%',
    position: 'absolute',
    top: 0,
    zIndex: 2,
  },
  blackKey: {
    backgroundColor: '#141414',
    borderBottomColor: '#000000',
    borderBottomWidth: 3,
    borderBottomLeftRadius: 4,
    borderBottomRightRadius: 4,
    borderTopColor: '#3A3A3A',
    borderTopWidth: 2,
    elevation: 6,
    flex: 1,
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
  },
  blackKeyShine: {
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    height: 4,
    left: '15%',
    position: 'absolute',
    right: '15%',
    top: 3,
  },
  keyHighlight: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.accent,
  },
});
