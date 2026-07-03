import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { colors } from '../../theme/colors';
import type { SavedRecording } from '../../types/recording';
import { formatDuration } from '../../utils/formatDuration';
import { INSTRUMENT_ICONS, INSTRUMENT_TITLE_KEYS } from '../../utils/recordingLabels';

type RecordingCardProps = {
  recording: SavedRecording;
};

export function RecordingCard({ recording }: RecordingCardProps) {
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

  const modeLabel =
    recording.mode === 'microphone'
      ? t('recordings.modeMicrophone')
      : t('recordings.modeInstrument');

  const detailLabel =
    recording.mode === 'instrument'
      ? t('recordings.eventCount', { count: recording.events?.length ?? 0 })
      : t('recordings.audioTrack');

  return (
    <View style={styles.card}>
      <View style={styles.iconWrap}>
        <Ionicons color={colors.accent} name={INSTRUMENT_ICONS[recording.instrument]} size={24} />
      </View>

      <View style={styles.content}>
        <Text style={styles.title}>{t(INSTRUMENT_TITLE_KEYS[recording.instrument])}</Text>
        <Text style={styles.date}>{dateLabel}</Text>
        <View style={styles.metaRow}>
          <Text style={styles.meta}>{modeLabel}</Text>
          <Text style={styles.metaDot}>·</Text>
          <Text style={styles.meta}>{formatDuration(recording.durationMs)}</Text>
          <Text style={styles.metaDot}>·</Text>
          <Text style={styles.meta}>{detailLabel}</Text>
        </View>
      </View>
    </View>
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
    padding: 14,
  },
  iconWrap: {
    alignItems: 'center',
    backgroundColor: colors.surfaceLight,
    borderRadius: 10,
    height: 48,
    justifyContent: 'center',
    marginRight: 12,
    width: 48,
  },
  content: {
    flex: 1,
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
});
