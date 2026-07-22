import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import {
  InstrumentArtBackground,
  type InstrumentArtVariant,
} from '../instrument/InstrumentArtBackground';
import { HorizontalSlider } from '../piano/HorizontalSlider';
import { colors } from '../../theme/colors';
import type { StudioTrack } from '../../types/studio';
import { formatDuration } from '../../utils/formatDuration';
import { INSTRUMENT_TITLE_KEYS } from '../../utils/recordingLabels';

type Props = {
  track: StudioTrack;
  onToggleMute: () => void;
  onToggleSolo: () => void;
  onVolumeChange: (volume: number) => void;
  onDelete: () => void;
};

const MUTE_COLOR = colors.error;
const SOLO_COLOR = '#F5A623';

export function StudioTrackRow({
  track,
  onToggleMute,
  onToggleSolo,
  onVolumeChange,
  onDelete,
}: Props) {
  const { t } = useTranslation();
  const [liveVolume, setLiveVolume] = useState<number | null>(null);
  const displayVolume = liveVolume ?? track.volume;

  const modeLabel =
    track.mode === 'microphone'
      ? t('recordings.modeMicrophone')
      : t('recordings.modeInstrument');

  // Always the instrument's own art, even for mic-recorded tracks: the track
  // is still that instrument, just captured through the microphone.
  const artVariant: InstrumentArtVariant = track.instrument;

  return (
    <View style={[styles.card, track.muted && styles.cardMuted]}>
      <InstrumentArtBackground variant={artVariant} veilOpacity={0.78} />

      <View style={styles.topRow}>
        <View style={styles.content}>
          <Text numberOfLines={1} style={styles.title}>
            {t(INSTRUMENT_TITLE_KEYS[track.instrument])}
          </Text>
          <Text style={styles.meta}>
            {modeLabel} · {formatDuration(track.durationMs)}
          </Text>
        </View>

        <View style={styles.toggles}>
          <ToggleButton
            accessibilityLabel={t('studio.trackMute')}
            active={track.muted}
            activeColor={MUTE_COLOR}
            icon={track.muted ? 'volume-mute' : 'volume-mute-outline'}
            onPress={onToggleMute}
          />
          <ToggleButton
            accessibilityLabel={t('studio.trackSolo')}
            active={track.solo}
            activeColor={SOLO_COLOR}
            icon={track.solo ? 'headset' : 'headset-outline'}
            onPress={onToggleSolo}
          />
          <Pressable
            accessibilityLabel={t('studio.trackDelete')}
            accessibilityRole="button"
            hitSlop={6}
            onPress={onDelete}
            style={({ pressed }) => [styles.deleteBtn, pressed && styles.pressed]}
          >
            <Ionicons color="#FFFFFF" name="trash-outline" size={16} />
          </Pressable>
        </View>
      </View>

      <View style={styles.volumeRow}>
        <Ionicons color={colors.textSecondary} name="volume-low-outline" size={14} />
        <HorizontalSlider
          accentColor={colors.accent}
          thumbSize={14}
          onSlidingComplete={(value) => {
            setLiveVolume(null);
            onVolumeChange(value);
          }}
          onValueChange={setLiveVolume}
          style={styles.slider}
          value={track.volume}
        />
        <Ionicons color={colors.textSecondary} name="volume-high-outline" size={14} />
        <Text style={styles.volumeText}>{Math.round(displayVolume * 100)}%</Text>
      </View>
    </View>
  );
}

type ToggleButtonProps = {
  icon: keyof typeof Ionicons.glyphMap;
  accessibilityLabel: string;
  active: boolean;
  activeColor: string;
  onPress: () => void;
};

function ToggleButton({
  icon,
  accessibilityLabel,
  active,
  activeColor,
  onPress,
}: ToggleButtonProps) {
  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      hitSlop={6}
      onPress={onPress}
      style={({ pressed }) => [
        styles.toggleBtn,
        active && { backgroundColor: activeColor, borderColor: activeColor },
        pressed && styles.pressed,
      ]}
    >
      <Ionicons color={active ? '#FFFFFF' : colors.textSecondary} name={icon} size={16} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 10,
    // Clips the background art to the rounded corners.
    overflow: 'hidden',
    padding: 14,
  },
  cardMuted: {
    opacity: 0.6,
  },
  topRow: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  content: {
    flex: 1,
    marginRight: 8,
  },
  title: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 2,
  },
  meta: {
    color: colors.textSecondary,
    fontSize: 12,
  },
  toggles: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  toggleBtn: {
    alignItems: 'center',
    backgroundColor: colors.surfaceLight,
    borderColor: colors.border,
    borderRadius: 16,
    borderWidth: 1,
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  deleteBtn: {
    alignItems: 'center',
    backgroundColor: colors.error,
    borderRadius: 16,
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  volumeRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  slider: {
    flex: 1,
  },
  volumeText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontVariant: ['tabular-nums'],
    fontWeight: '700',
    minWidth: 36,
    textAlign: 'right',
  },
  pressed: {
    opacity: 0.75,
  },
});
