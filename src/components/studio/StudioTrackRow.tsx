import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { colors } from '../../theme/colors';
import type { StudioTrack } from '../../types/studio';
import { formatDuration } from '../../utils/formatDuration';
import { INSTRUMENT_ICONS, INSTRUMENT_TITLE_KEYS } from '../../utils/recordingLabels';

type Props = {
  track: StudioTrack;
  onToggleMute: () => void;
  onToggleSolo: () => void;
  onVolumeCycle: () => void;
  onDelete: () => void;
};

const VOLUME_STEPS = [1, 0.7, 0.4, 0.15];

export function nextVolumeStep(current: number): number {
  const index = VOLUME_STEPS.findIndex((step) => Math.abs(step - current) < 0.05);
  if (index < 0) {
    return VOLUME_STEPS[0];
  }
  return VOLUME_STEPS[(index + 1) % VOLUME_STEPS.length];
}

export function StudioTrackRow({
  track,
  onToggleMute,
  onToggleSolo,
  onVolumeCycle,
  onDelete,
}: Props) {
  const { t } = useTranslation();
  const modeLabel =
    track.mode === 'microphone'
      ? t('recordings.modeMicrophone')
      : t('recordings.modeInstrument');

  return (
    <View style={[styles.card, track.muted && styles.cardMuted]}>
      <View style={styles.iconWrap}>
        <Ionicons color={colors.accent} name={INSTRUMENT_ICONS[track.instrument]} size={22} />
      </View>
      <View style={styles.content}>
        <Text style={styles.title}>{t(INSTRUMENT_TITLE_KEYS[track.instrument])}</Text>
        <Text style={styles.meta}>
          {modeLabel} · {formatDuration(track.durationMs)} · {Math.round(track.volume * 100)}%
        </Text>
      </View>
      <View style={styles.actions}>
        <Chip
          active={track.muted}
          label={t('studio.trackMute')}
          onPress={onToggleMute}
          short="M"
        />
        <Chip
          active={track.solo}
          label={t('studio.trackSolo')}
          onPress={onToggleSolo}
          short="S"
        />
        <Chip
          active={track.volume < 0.95}
          label={t('studio.volume')}
          onPress={onVolumeCycle}
          short={`${Math.round(track.volume * 100)}`}
        />
        <Pressable
          accessibilityLabel={t('studio.trackDelete')}
          hitSlop={6}
          onPress={onDelete}
          style={styles.deleteBtn}
        >
          <Ionicons color={colors.error} name="trash-outline" size={18} />
        </Pressable>
      </View>
    </View>
  );
}

function Chip({
  short,
  label,
  active,
  onPress,
}: {
  short: string;
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityLabel={label}
      onPress={onPress}
      style={[styles.chip, active && styles.chipActive]}
    >
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{short}</Text>
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
    marginBottom: 10,
    padding: 12,
  },
  cardMuted: {
    opacity: 0.65,
  },
  iconWrap: {
    alignItems: 'center',
    backgroundColor: colors.surfaceLight,
    borderRadius: 8,
    height: 40,
    justifyContent: 'center',
    marginRight: 10,
    width: 40,
  },
  content: {
    flex: 1,
    marginRight: 6,
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
    gap: 4,
  },
  chip: {
    backgroundColor: colors.surfaceLight,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    minWidth: 32,
    paddingHorizontal: 6,
    paddingVertical: 6,
  },
  chipActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  chipText: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
  },
  chipTextActive: {
    color: '#FFFFFF',
  },
  deleteBtn: {
    padding: 6,
  },
});
