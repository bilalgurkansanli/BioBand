import { Fragment, useRef } from 'react';
import {
  type GestureResponderEvent,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';

import type { ChordFamily } from '../../instruments/guitar/guitarChords';
import type { GuitarChordGesture } from '../../instruments/guitar/guitarChordPatterns';
import type { GuitarStrumDirection } from '../../instruments/guitar/guitarEngine';
import { colors } from '../../theme/colors';

/** Vertical travel (px) before a touch counts as a strum swipe. */
const SWIPE_THRESHOLD_PX = 14;

export type ChordBarItem = {
  id: string;
  label: string;
  family: ChordFamily;
};

type ChordBarProps = {
  chords: ChordBarItem[];
  /** Currently armed chord shape (highlight). */
  selectedChordId?: string | null;
  /**
   * `direction` set → arm + play pattern that way.
   * `direction` null → tap on already-selected chord → deselect (free fretting).
   */
  onSelectChord: (
    chordId: string,
    direction: GuitarStrumDirection | null,
    gesture: GuitarChordGesture,
  ) => void;
  guideChordId?: string | null;
  strongGuide?: boolean;
  accent?: string;
};

type TouchOrigin = {
  chordId: string;
  y: number;
};

function isRockFamily(family: ChordFamily): boolean {
  return family === 'power' || family === 'barre';
}

export function ChordBar({
  chords,
  selectedChordId = null,
  onSelectChord,
  guideChordId = null,
  strongGuide = true,
  accent = colors.accent,
}: ChordBarProps) {
  const { t } = useTranslation();
  // Keyed by touch identifier so simultaneous touches on two chords both land.
  const touchOriginsRef = useRef<Map<string, TouchOrigin>>(new Map());

  const handleTouchStart = (chordId: string, event: GestureResponderEvent) => {
    touchOriginsRef.current.set(String(event.nativeEvent.identifier), {
      chordId,
      y: event.nativeEvent.pageY,
    });
  };

  const handleTouchEnd = (chordId: string, event: GestureResponderEvent) => {
    const touchId = String(event.nativeEvent.identifier);
    const origin = touchOriginsRef.current.get(touchId);
    touchOriginsRef.current.delete(touchId);
    if (!origin || origin.chordId !== chordId) {
      return;
    }

    const dy = event.nativeEvent.pageY - origin.y;

    if (Math.abs(dy) < SWIPE_THRESHOLD_PX) {
      if (selectedChordId === chordId) {
        onSelectChord(chordId, null, 'tap');
      } else {
        onSelectChord(chordId, 'down', 'tap');
      }
      return;
    }

    const direction: GuitarStrumDirection = dy > 0 ? 'down' : 'up';
    onSelectChord(chordId, direction, 'swipe');
  };

  const handleTouchCancel = (event: GestureResponderEvent) => {
    touchOriginsRef.current.delete(String(event.nativeEvent.identifier));
  };

  return (
    <View style={styles.bar}>
      {chords.map((chord, index) => {
        const isSelected = selectedChordId === chord.id;
        const isGuide = guideChordId === chord.id;
        const isRock = isRockFamily(chord.family);
        const prev = index > 0 ? chords[index - 1] : null;
        const showDivider = prev != null && isRockFamily(prev.family) !== isRock;

        return (
          <Fragment key={chord.id}>
            {showDivider ? (
              <View style={[styles.divider, { backgroundColor: `${accent}55` }]} />
            ) : null}
            <View
              accessibilityHint={t('guitar.chords.strumHint')}
              accessibilityLabel={chord.label}
              accessibilityRole="button"
              onTouchCancel={handleTouchCancel}
              onTouchEnd={(event) => handleTouchEnd(chord.id, event)}
              onTouchStart={(event) => handleTouchStart(chord.id, event)}
              style={[
                styles.chordButton,
                {
                  borderColor: isRock ? `${accent}BB` : `${accent}88`,
                  backgroundColor: isRock ? `${accent}14` : colors.surfaceLight,
                },
                isSelected && {
                  backgroundColor: accent,
                  borderColor: accent,
                  borderWidth: 2,
                },
                !isSelected &&
                  isGuide && {
                    backgroundColor: strongGuide ? `${accent}88` : `${accent}44`,
                    borderColor: accent,
                    borderWidth: strongGuide ? 2 : 1,
                  },
              ]}
            >
              <Text
                style={[
                  styles.swipeHint,
                  { color: isSelected ? '#111111AA' : `${accent}99` },
                ]}
              >
                ↑
              </Text>
              <Text
                numberOfLines={1}
                style={[
                  styles.chordLabel,
                  { color: isSelected ? '#111111' : accent },
                ]}
              >
                {chord.label}
              </Text>
              <Text
                style={[
                  styles.swipeHint,
                  { color: isSelected ? '#111111AA' : `${accent}99` },
                ]}
              >
                ↓
              </Text>
            </View>
          </Fragment>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    alignItems: 'stretch',
    flexDirection: 'row',
    gap: 4,
    marginBottom: 6,
  },
  divider: {
    alignSelf: 'center',
    borderRadius: 1,
    height: 26,
    width: 2,
  },
  chordButton: {
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    justifyContent: 'center',
    minWidth: 0,
    paddingHorizontal: 2,
    paddingVertical: 7,
  },
  swipeHint: {
    fontSize: 8,
    fontWeight: '600',
    lineHeight: 9,
    textAlign: 'center',
  },
  chordLabel: {
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 15,
    textAlign: 'center',
  },
});
