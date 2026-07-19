import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import {
  InstrumentArtBackground,
  type InstrumentArtVariant,
} from '../instrument/InstrumentArtBackground';
import { colors } from '../../theme/colors';
import type { SavedRecording } from '../../types/recording';
import { formatDuration } from '../../utils/formatDuration';
import { INSTRUMENT_TITLE_KEYS } from '../../utils/recordingLabels';

type RecordingCardProps = {
  recording: SavedRecording;
  isPlaying?: boolean;
  isLoading?: boolean;
  isBusy?: boolean;
  onPlayPress: () => void;
  onSharePress: () => void;
  onDownloadPress: () => void;
  onDeletePress?: () => void;
};

export function RecordingCard({
  recording,
  isPlaying = false,
  isLoading = false,
  isBusy = false,
  onPlayPress,
  onSharePress,
  onDownloadPress,
  onDeletePress,
}: RecordingCardProps) {
  const { t, i18n } = useTranslation();

  const dateLabel = new Date(recording.createdAt).toLocaleString(
    i18n.language.startsWith('tr') ? 'tr-TR' : 'en-US',
    {
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      month: 'short',
      year: 'numeric',
    },
  );

  const isDrumMachine = recording.source === 'drumMachine';

  const title = recording.title?.trim()
    ? recording.title.trim()
    : t(INSTRUMENT_TITLE_KEYS[recording.instrument]);

  const modeLabel = isDrumMachine
    ? t('recordings.modeDrumMachine')
    : recording.mode === 'microphone'
      ? t('recordings.modeMicrophone')
      : t('recordings.modeInstrument');

  const detailLabel = isDrumMachine
    ? t(INSTRUMENT_TITLE_KEYS[recording.instrument])
    : recording.mode === 'instrument'
      ? t('recordings.eventCount', { count: recording.events?.length ?? 0 })
      : t('recordings.audioTrack');

  const playLabel = isPlaying ? t('recordings.stopPlayback') : t('recordings.play');
  const actionsDisabled = isLoading || isBusy;
  // The background art says which instrument the take belongs to — no icon.
  const artVariant: InstrumentArtVariant = isDrumMachine
    ? 'drumMachine'
    : recording.mode === 'microphone'
      ? 'microphone'
      : recording.instrument;

  return (
    <View style={[styles.card, isPlaying && styles.cardPlaying]}>
      <InstrumentArtBackground variant={artVariant} veilOpacity={0.75} />

      <View style={styles.content}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.date}>{dateLabel}</Text>
        <View style={styles.metaRow}>
          <Text style={styles.meta}>{modeLabel}</Text>
          <Text style={styles.metaDot}>·</Text>
          <Text style={styles.meta}>{formatDuration(recording.durationMs)}</Text>
          <Text style={styles.metaDot}>·</Text>
          <Text style={styles.meta}>{detailLabel}</Text>
        </View>
      </View>

      <View style={styles.actions}>
        {onDeletePress ? (
          <ActionButton
            disabled={actionsDisabled}
            icon="trash-outline"
            label={t('recordings.delete')}
            onPress={onDeletePress}
          />
        ) : null}
        <ActionButton
          disabled={actionsDisabled}
          icon="download-outline"
          label={t('recordings.download')}
          onPress={onDownloadPress}
        />
        <ActionButton
          disabled={actionsDisabled}
          icon="share-outline"
          label={t('recordings.share')}
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
              size={22}
            />
          )}
        </Pressable>
      </View>
    </View>
  );
}

type ActionButtonProps = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  disabled?: boolean;
};

function ActionButton({ icon, label, onPress, disabled }: ActionButtonProps) {
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      disabled={disabled}
      hitSlop={6}
      onPress={onPress}
      style={({ pressed }) => [
        styles.actionButton,
        pressed && styles.pressed,
        disabled && styles.disabled,
      ]}
    >
      <Ionicons color={colors.textSecondary} name={icon} size={20} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    marginBottom: 12,
    // Clips the background art to the rounded corners.
    overflow: 'hidden',
    padding: 14,
  },
  cardPlaying: {
    borderColor: colors.accent,
  },
  content: {
    flex: 1,
    marginRight: 8,
  },
  title: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 2,
  },
  date: {
    color: colors.textSecondary,
    fontSize: 13,
    marginBottom: 6,
  },
  metaRow: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  meta: {
    color: colors.accent,
    fontSize: 12,
    fontWeight: '600',
  },
  metaDot: {
    color: colors.textSecondary,
    fontSize: 12,
    marginHorizontal: 6,
  },
  actions: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 4,
  },
  actionButton: {
    alignItems: 'center',
    borderRadius: 18,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  playButton: {
    alignItems: 'center',
    backgroundColor: colors.surfaceLight,
    borderColor: colors.border,
    borderRadius: 22,
    borderWidth: 1,
    height: 44,
    justifyContent: 'center',
    marginLeft: 2,
    width: 44,
  },
  playButtonActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  pressed: {
    opacity: 0.75,
  },
  disabled: {
    opacity: 0.5,
  },
});
