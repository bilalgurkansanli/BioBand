import Ionicons from '@expo/vector-icons/Ionicons';
import { useCallback, useMemo, useRef, useState } from 'react';
import {
  type GestureResponderEvent,
  LayoutChangeEvent,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';

import {
  BLACK_PIANO_NOTES,
  WHITE_PIANO_NOTES,
} from '../../instruments/piano/pianoNotes';

type PianoNavigatorProps = {
  tonePosition: number;
  semitoneOffset: number;
  canStepThicker: boolean;
  canStepThinner: boolean;
  onToneChange: (position: number) => void;
  onJumpLow: () => void;
  onStepThicker: () => void;
  onStepThinner: () => void;
  onJumpHigh: () => void;
  onJumpCenter: () => void;
};

const NAV_BUTTON_SIZE = 22;
const MINI_KEY_GAP = 1;
const THUMB_WIDTH = 26;
const TRACK_HEIGHT = 18;

function NavButton({
  icon,
  label,
  onPress,
  disabled,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      disabled={disabled}
      hitSlop={4}
      onPress={onPress}
      style={({ pressed }) => [
        styles.navButton,
        pressed && styles.pressed,
        disabled && styles.navButtonDisabled,
      ]}
    >
      <Ionicons color={disabled ? '#555555' : '#D0D0D0'} name={icon} size={12} />
    </Pressable>
  );
}

function positionFromTouchX(x: number, trackWidth: number): number {
  const usable = Math.max(1, trackWidth - THUMB_WIDTH);
  return Math.max(0, Math.min(1, (x - THUMB_WIDTH / 2) / usable));
}

export function PianoNavigator({
  tonePosition,
  semitoneOffset,
  canStepThicker,
  canStepThinner,
  onToneChange,
  onJumpLow,
  onStepThicker,
  onStepThinner,
  onJumpHigh,
  onJumpCenter,
}: PianoNavigatorProps) {
  const { t } = useTranslation();
  const [trackWidth, setTrackWidth] = useState(0);
  const isDraggingRef = useRef(false);

  const miniLayout = useMemo(() => {
    const whiteCount = WHITE_PIANO_NOTES.length;
    const width = trackWidth > 0 ? trackWidth : 200;
    const miniWhiteWidth = Math.max(
      4,
      Math.floor((width - whiteCount * MINI_KEY_GAP) / whiteCount),
    );
    const miniBlackWidth = Math.max(3, Math.round(miniWhiteWidth * 0.62));
    const miniBlackHeight = 7;
    const miniWhiteHeight = 11;

    return {
      miniWhiteWidth,
      miniBlackWidth,
      miniBlackHeight,
      miniWhiteHeight,
    };
  }, [trackWidth]);

  const applyTouchX = useCallback(
    (locationX: number) => {
      if (trackWidth <= 0) {
        return;
      }
      onToneChange(positionFromTouchX(locationX, trackWidth));
    },
    [onToneChange, trackWidth],
  );

  const handleTrackLayout = (event: LayoutChangeEvent) => {
    setTrackWidth(event.nativeEvent.layout.width);
  };

  const handleTouchStart = useCallback(
    (event: GestureResponderEvent) => {
      isDraggingRef.current = true;
      applyTouchX(event.nativeEvent.locationX);
    },
    [applyTouchX],
  );

  const handleTouchMove = useCallback(
    (event: GestureResponderEvent) => {
      if (!isDraggingRef.current) {
        return;
      }
      applyTouchX(event.nativeEvent.locationX);
    },
    [applyTouchX],
  );

  const handleTouchEnd = useCallback(() => {
    isDraggingRef.current = false;
  }, []);

  const thumbLeft = tonePosition * Math.max(0, trackWidth - THUMB_WIDTH);
  const toneLabel =
    semitoneOffset === 0
      ? t('piano.tone.center')
      : semitoneOffset < 0
        ? t('piano.tone.thick', { count: Math.abs(semitoneOffset) })
        : t('piano.tone.thin', { count: semitoneOffset });

  return (
    <View style={styles.row}>
      <View style={styles.navGroup}>
        <NavButton
          icon="play-skip-back"
          label={t('piano.tone.jumpLow')}
          onPress={onJumpLow}
        />
        <NavButton
          disabled={!canStepThicker}
          icon="chevron-back"
          label={t('piano.tone.stepThicker')}
          onPress={onStepThicker}
        />
      </View>

      <View style={styles.sliderColumn}>
        <View
          onLayout={handleTrackLayout}
          onTouchCancel={handleTouchEnd}
          onTouchEnd={handleTouchEnd}
          onTouchMove={handleTouchMove}
          onTouchStart={handleTouchStart}
        >
          <View pointerEvents="none" style={styles.labelRow}>
            <Text style={styles.edgeLabel}>{t('piano.tone.thickLabel')}</Text>
            <Text style={styles.toneLabel}>{toneLabel}</Text>
            <Text style={styles.edgeLabel}>{t('piano.tone.thinLabel')}</Text>
          </View>

          <View style={styles.track}>
            <View pointerEvents="none" style={styles.gradientTrack} />

            {/* Center detent marks the concert-pitch (0) position, so the
                control clearly reads as a centered transpose — not as a
                window being scrolled across the keyboard. */}
            <View pointerEvents="none" style={styles.centerDetent} />

            <View pointerEvents="none" style={styles.miniWhiteRow}>
              {WHITE_PIANO_NOTES.map((note) => (
                <View
                  key={note.id}
                  style={[
                    styles.miniWhiteKey,
                    {
                      width: miniLayout.miniWhiteWidth,
                      height: miniLayout.miniWhiteHeight,
                    },
                  ]}
                />
              ))}
            </View>

            {BLACK_PIANO_NOTES.map((note) => {
              const left =
                (note.blackKeyAfterWhite ?? 0) * (miniLayout.miniWhiteWidth + MINI_KEY_GAP) +
                miniLayout.miniWhiteWidth -
                miniLayout.miniBlackWidth / 2;

              return (
                <View
                  key={note.id}
                  pointerEvents="none"
                  style={[
                    styles.miniBlackKey,
                    {
                      left,
                      width: miniLayout.miniBlackWidth,
                      height: miniLayout.miniBlackHeight,
                    },
                  ]}
                />
              );
            })}

            <View
              pointerEvents="none"
              style={[
                styles.thumb,
                {
                  left: thumbLeft,
                  width: THUMB_WIDTH,
                  height: TRACK_HEIGHT,
                },
              ]}
            />
          </View>
        </View>

        <Pressable hitSlop={8} onPress={onJumpCenter} style={styles.resetWrap}>
          <Text style={styles.resetHint}>{t('piano.tone.dragHint')}</Text>
        </Pressable>
      </View>

      <View style={styles.navGroup}>
        <NavButton
          disabled={!canStepThinner}
          icon="chevron-forward"
          label={t('piano.tone.stepThinner')}
          onPress={onStepThinner}
        />
        <NavButton
          icon="play-skip-forward"
          label={t('piano.tone.jumpHigh')}
          onPress={onJumpHigh}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    alignItems: 'center',
    backgroundColor: '#141414',
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 4,
    paddingVertical: 3,
  },
  navGroup: {
    flexDirection: 'row',
    gap: 4,
  },
  navButton: {
    alignItems: 'center',
    backgroundColor: '#2C2C2E',
    borderColor: '#3A3A3C',
    borderRadius: NAV_BUTTON_SIZE / 2,
    borderWidth: 1,
    height: NAV_BUTTON_SIZE,
    justifyContent: 'center',
    width: NAV_BUTTON_SIZE,
  },
  navButtonDisabled: {
    opacity: 0.45,
  },
  sliderColumn: {
    flex: 1,
    gap: 1,
  },
  labelRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 2,
    paddingHorizontal: 2,
  },
  edgeLabel: {
    color: '#8E8E93',
    fontSize: 9,
    fontWeight: '600',
  },
  toneLabel: {
    color: '#6C5CE7',
    fontSize: 10,
    fontWeight: '700',
    textAlign: 'center',
  },
  track: {
    borderColor: '#3A3A3C',
    borderRadius: 4,
    borderWidth: 1,
    height: TRACK_HEIGHT,
    justifyContent: 'center',
    overflow: 'hidden',
    position: 'relative',
  },
  gradientTrack: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#2A2A2A',
  },
  centerDetent: {
    backgroundColor: 'rgba(108, 92, 231, 0.9)',
    bottom: 0,
    left: '50%',
    marginLeft: -1,
    position: 'absolute',
    top: 0,
    width: 2,
    zIndex: 2,
  },
  miniWhiteRow: {
    flexDirection: 'row',
    gap: MINI_KEY_GAP,
    paddingHorizontal: 1,
  },
  miniWhiteKey: {
    backgroundColor: '#E8E8E8',
    borderColor: '#B0B0B0',
    borderRadius: 1,
    borderWidth: 0.5,
    opacity: 0.85,
  },
  miniBlackKey: {
    backgroundColor: '#1A1A1A',
    borderRadius: 1,
    opacity: 0.9,
    position: 'absolute',
    top: 1,
    zIndex: 2,
  },
  thumb: {
    backgroundColor: 'rgba(108, 92, 231, 0.4)',
    borderColor: '#6C5CE7',
    borderRadius: 3,
    borderWidth: 1.5,
    position: 'absolute',
    top: 0,
    zIndex: 3,
  },
  resetWrap: {
    alignSelf: 'center',
  },
  resetHint: {
    color: '#555555',
    fontSize: 8,
    lineHeight: 10,
    textAlign: 'center',
  },
  pressed: {
    opacity: 0.75,
  },
});
