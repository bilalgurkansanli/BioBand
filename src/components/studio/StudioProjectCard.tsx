import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { InstrumentArtBackground } from '../instrument/InstrumentArtBackground';
import { colors } from '../../theme/colors';
import type { StudioProject } from '../../types/studio';
import { getProjectDurationMs } from '../../types/studio';
import { formatDuration } from '../../utils/formatDuration';

type Props = {
  project: StudioProject;
  onPress: () => void;
};

export function StudioProjectCard({ project, onPress }: Props) {
  const { t, i18n } = useTranslation();
  const dateLabel = new Date(project.updatedAt).toLocaleString(
    i18n.language.startsWith('tr') ? 'tr-TR' : 'en-US',
    {
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      month: 'short',
      year: 'numeric',
    },
  );

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      {/* A project mixes tracks from different instruments, so it gets the
          waveform art rather than any single instrument's — tracks inside
          keep their own instrument art. */}
      <InstrumentArtBackground variant="microphone" veilOpacity={0.78} />
      <View style={styles.content}>
        <Text style={styles.title}>{project.title}</Text>
        <Text style={styles.date}>{dateLabel}</Text>
        <View style={styles.metaRow}>
          <Text style={styles.meta}>
            {t('studio.trackCount', { count: project.tracks.length })}
          </Text>
          <Text style={styles.metaDot}>·</Text>
          <Text style={styles.meta}>{formatDuration(getProjectDurationMs(project))}</Text>
        </View>
      </View>
      <Ionicons color={colors.textSecondary} name="chevron-forward" size={20} />
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
  pressed: {
    opacity: 0.85,
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
});
