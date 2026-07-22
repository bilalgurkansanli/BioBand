import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import {
  InstrumentArtBackground,
  type InstrumentArtVariant,
} from '../instrument/InstrumentArtBackground';
import { HorizontalSlider } from '../piano/HorizontalSlider';
import { PlaybackScrubber } from '../recordings/PlaybackScrubber';
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
  onDownloadPress: () => void;
  onSharePress: () => void;
  onPlayPress: () => void;
  isPlaying?: boolean;
  isLoading?: boolean;
  isBusy?: boolean;
  positionMs?: number;
  durationMs?: number;
  onSeek?: (positionMs: number) => void;
};

const MUTE_COLOR = colors.error;
const SOLO_COLOR = '#F5A623';

export function StudioTrackRow({
  track,
  onToggleMute,
  onToggleSolo,
  onVolumeChange,
  onDelete,
  onDownloadPress,
  onSharePress,
  onPlayPress,
  isPlaying = false,
  isLoading = false,
  isBusy = false,
  positionMs = 0,
  durationMs,
  onSeek,
}: Props) {
  const { t } = useTranslation();
  const [liveVolume, setLiveVolume] = useState<number | null>(null);
  const displayVolume = liveVolume ?? track.volume;

  const modeLabel =
    track.mode === 'microphone'
      ? t('recordings.modeMicrophone')
      : t('recordings.modeInstrument');

  const playLabel = isPlaying ? t('studio.trackStopPlayback') : t('studio.trackPlay');
  const actionsDisabled = isLoading || isBusy;

  // Always the instrument's own art, even for mic-recorded tracks: the track
  // is still that instrument, just captured through the microphone.
  const artVariant: InstrumentArtVariant = track.instrument;

  return (
    <View style={[styles.card, track.muted && styles.cardMuted, isPlaying && styles.cardPlaying]}>
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

        <View style={styles.actions}>
          <ActionButton
            disabled={actionsDisabled}
            icon="trash-outline"
            label={t('studio.trackDelete')}
            onPress={onDelete}
            variant="danger"
          />
          <ActionButton
            disabled={actionsDisabled}
            icon="download-outline"
            label={t('studio.trackDownload')}
            onPress={onDownloadPress}
          />
          <ActionButton
            disabled={actionsDisabled}
            icon="share-outline"
            label={t('studio.trackShare')}
            onPress={onSharePress}
          />
          <Pressable
            accessibilityLabel={playLabel}
            accessibilityRole="button"
            disabled={actionsDisabled && !isPlaying}
            hitSlop={6}
            onPress={onPlayPress}
            style={({ pressed }) => [
              styles.playButton,
              isPlaying && styles.playButtonActive,
              pressed && styles.pressed,
              isLoading && styles.disabled,
            ]}
          >
            {isLoading ? (
              <ActivityIndicator color={colors.accent} size="small" />
            ) : (
              <Ionicons
                color={isPlaying ? '#FFFFFF' : colors.accent}
                name={isPlaying ? 'stop' : 'play'}
                size={20}
              />
            )}
          </Pressable>
        </View>
      </View>

      {isPlaying && onSeek ? (
        <PlaybackScrubber
          durationMs={durationMs ?? track.durationMs}
          onSeek={onSeek}
          positionMs={positionMs}
        />
      ) : null}

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

type ActionButtonProps = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  disabled?: boolean;
  variant?: 'default' | 'danger';
};

function ActionButton({ icon, label, onPress, disabled, variant = 'default' }: ActionButtonProps) {
  const isDanger = variant === 'danger';
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      disabled={disabled}
      hitSlop={6}
      onPress={onPress}
      style={({ pressed }) => [
        styles.actionButton,
        isDanger && styles.actionButtonDanger,
        pressed && styles.pressed,
        disabled && styles.disabled,
      ]}
    >
      <Ionicons color={isDanger ? '#FFFFFF' : colors.text} name={icon} size={18} />
    </Pressable>
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
  cardPlaying: {
    borderColor: colors.accent,
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
  actions: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  actionButton: {
    alignItems: 'center',
    backgroundColor: colors.surfaceLight,
    borderColor: colors.border,
    borderRadius: 18,
    borderWidth: 1,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  actionButtonDanger: {
    backgroundColor: colors.error,
    borderColor: colors.error,
  },
  playButton: {
    alignItems: 'center',
    backgroundColor: colors.surfaceLight,
    borderColor: colors.border,
    borderRadius: 20,
    borderWidth: 1,
    height: 40,
    justifyContent: 'center',
    marginLeft: 2,
    width: 40,
  },
  playButtonActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  toggles: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 10,
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
  disabled: {
    opacity: 0.5,
  },
});
