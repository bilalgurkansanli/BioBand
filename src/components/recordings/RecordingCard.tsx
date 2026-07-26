import Ionicons from '@expo/vector-icons/Ionicons';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import {
  InstrumentArtBackground,
  type InstrumentArtVariant,
} from '../instrument/InstrumentArtBackground';
import { PlaybackScrubber } from './PlaybackScrubber';
import { colors } from '../../theme/colors';
import type { SavedRecording } from '../../types/recording';
import { formatDuration } from '../../utils/formatDuration';
import { INSTRUMENT_TITLE_KEYS } from '../../utils/recordingLabels';

type RecordingCardProps = {
  recording: SavedRecording;
  isPlaying?: boolean;
  isLoading?: boolean;
  isBusy?: boolean;
  positionMs?: number;
  durationMs?: number;
  onPlayPress: () => void;
  onSharePress: () => void;
  onDownloadPress: () => void;
  onDeletePress?: () => void;
  onTitlePress?: () => void;
  onSeek?: (positionMs: number) => void;
};

export function RecordingCard({
  recording,
  isPlaying = false,
  isLoading = false,
  isBusy = false,
  positionMs = 0,
  durationMs,
  onPlayPress,
  onSharePress,
  onDownloadPress,
  onDeletePress,
  onTitlePress,
  onSeek,
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
  const isImported = recording.source === 'imported';

  const title = recording.title?.trim()
    ? recording.title.trim()
    : t(INSTRUMENT_TITLE_KEYS[recording.instrument]);

  const modeLabel = isDrumMachine
    ? t('recordings.modeDrumMachine')
    : isImported
      ? t('recordings.modeImported')
      : recording.mode === 'microphone'
        ? t('recordings.modeMicrophone')
        : t('recordings.modeInstrument');

  const detailLabel = isDrumMachine
    ? t(INSTRUMENT_TITLE_KEYS[recording.instrument])
    : isImported
      ? t('recordings.audioTrack')
      : recording.mode === 'instrument'
        ? t('recordings.eventCount', { count: recording.events?.length ?? 0 })
        : t('recordings.audioTrack');

  const playLabel = isPlaying ? t('recordings.stopPlayback') : t('recordings.play');
  const actionsDisabled = isLoading || isBusy;
  // The background art says which instrument the take belongs to — no icon.
  // Always the instrument's own art, even for mic-recorded takes: the take
  // is still that instrument, just captured through the microphone. Imported
  // files aren't tied to any instrument, so they get the generic mic art.
  const artVariant: InstrumentArtVariant = isDrumMachine
    ? 'drumMachine'
    : isImported
      ? 'microphone'
      : recording.instrument;

  return (
    <View style={[styles.card, isPlaying && styles.cardPlaying]}>
      <InstrumentArtBackground variant={artVariant} veilOpacity={0.75} />

      <View style={styles.topRow}>
        <View style={styles.content}>
          {onTitlePress ? (
            <Pressable
              accessibilityLabel={t('recordings.rename')}
              accessibilityRole="button"
              hitSlop={6}
              onPress={onTitlePress}
              style={({ pressed }) => [styles.titleRow, pressed && styles.pressed]}
            >
              <Text numberOfLines={1} style={styles.title}>
                {title}
              </Text>
              <Ionicons
                color={colors.textSecondary}
                name="pencil"
                size={13}
                style={styles.titleIcon}
              />
            </Pressable>
          ) : (
            <Text style={styles.title}>{title}</Text>
          )}
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
              variant="danger"
            />
          ) : null}
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

      {/* Export sits on its own row with words on it. Two more icons up in the
          action strip would have squeezed the title and the meta line into a
          column too narrow to read. */}
      <View style={styles.exportRow}>
        <ExportButton
          disabled={actionsDisabled}
          icon="download-outline"
          label={t('recordings.download')}
          onPress={onDownloadPress}
        />
        <ExportButton
          disabled={actionsDisabled}
          icon="share-outline"
          label={t('recordings.share')}
          onPress={onSharePress}
        />
      </View>

      {isPlaying && onSeek ? (
        <PlaybackScrubber
          durationMs={durationMs ?? recording.durationMs}
          onSeek={onSeek}
          positionMs={positionMs}
        />
      ) : null}
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

function ExportButton({
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
      accessibilityRole="button"
      disabled={disabled}
      // Restores the ~44pt tap target the shorter pill gives up. Vertical
      // only: the buttons already sit edge to edge, so widening the slop
      // would overlap the sibling.
      hitSlop={{ bottom: 7, top: 7 }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.exportButton,
        pressed && styles.pressed,
        disabled && styles.disabled,
      ]}
    >
      <Ionicons color={colors.text} name={icon} size={15} />
      <Text style={styles.exportLabel}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
    // Clips the background art to the rounded corners.
    overflow: 'hidden',
    padding: 16,
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
  titleRow: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    flexDirection: 'row',
    marginBottom: 2,
    maxWidth: '100%',
  },
  title: {
    color: colors.text,
    flexShrink: 1,
    fontSize: 16,
    fontWeight: '700',
  },
  titleIcon: {
    marginLeft: 6,
    marginTop: 1,
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
  exportRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  exportButton: {
    alignItems: 'center',
    backgroundColor: colors.surfaceLight,
    borderColor: colors.border,
    borderRadius: 9,
    borderWidth: 1,
    flex: 1,
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'center',
    // Slim on purpose — these repeat on every card, and the row was eating
    // more height than the take's own details. The hitSlop below keeps the
    // tappable area a comfortable size even though the pill is short.
    paddingVertical: 6,
  },
  exportLabel: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '700',
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
