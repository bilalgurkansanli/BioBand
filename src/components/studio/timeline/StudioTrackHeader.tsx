import { memo, useCallback } from 'react';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { colors } from '../../../theme/colors';
import { INSTRUMENT_ICONS, INSTRUMENT_TITLE_KEYS } from '../../../utils/recordingLabels';
import type { StudioTrack } from '../../../types/studio';
import { HEADER_WIDTH, LANE_HEIGHT, withAlpha } from './timelineGeometry';

const SOLO_COLOR = '#F5A623';

type Props = {
  track: StudioTrack;
  color: string;
  /**
   * Both take the track's id back rather than being closed over it, so the
   * timeline can hand every header the same two handlers — a per-header arrow
   * changes identity on every parent render and defeats the memo below.
   */
  onToggleMute: (trackId: string) => void;
  onToggleSolo: (trackId: string) => void;
};

function StudioTrackHeaderBase({ track, color, onToggleMute, onToggleSolo }: Props) {
  const { t } = useTranslation();
  const handleToggleMute = useCallback(() => onToggleMute(track.id), [onToggleMute, track.id]);
  const handleToggleSolo = useCallback(() => onToggleSolo(track.id), [onToggleSolo, track.id]);

  return (
    <View style={[styles.header, track.muted && styles.headerMuted]}>
      <View style={styles.titleRow}>
        <View style={[styles.iconChip, { backgroundColor: withAlpha(color, 0.22), borderColor: color }]}>
          <Ionicons color={color} name={INSTRUMENT_ICONS[track.instrument]} size={15} />
        </View>
        <Text numberOfLines={1} style={styles.title}>
          {t(INSTRUMENT_TITLE_KEYS[track.instrument])}
        </Text>
      </View>
      <View style={styles.toggles}>
        <Pressable
          accessibilityLabel={t('studio.trackMute')}
          hitSlop={4}
          onPress={handleToggleMute}
          style={[styles.toggle, track.muted && { backgroundColor: colors.error, borderColor: colors.error }]}
        >
          <Ionicons
            color={track.muted ? '#FFFFFF' : colors.textSecondary}
            name={track.muted ? 'volume-mute' : 'volume-mute-outline'}
            size={14}
          />
        </Pressable>
        <Pressable
          accessibilityLabel={t('studio.trackSolo')}
          hitSlop={4}
          onPress={handleToggleSolo}
          style={[styles.toggle, track.solo && { backgroundColor: SOLO_COLOR, borderColor: SOLO_COLOR }]}
        >
          <Ionicons
            color={track.solo ? '#FFFFFF' : colors.textSecondary}
            name={track.solo ? 'headset' : 'headset-outline'}
            size={14}
          />
        </Pressable>
      </View>
    </View>
  );
}

export const StudioTrackHeader = memo(StudioTrackHeaderBase);

const styles = StyleSheet.create({
  header: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 10,
    borderWidth: 1,
    height: LANE_HEIGHT,
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingVertical: 8,
    width: HEADER_WIDTH,
  },
  headerMuted: {
    opacity: 0.6,
  },
  titleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  iconChip: {
    alignItems: 'center',
    borderRadius: 7,
    borderWidth: 1,
    height: 26,
    justifyContent: 'center',
    width: 26,
  },
  title: {
    color: colors.text,
    flex: 1,
    fontSize: 12,
    fontWeight: '700',
  },
  toggles: {
    flexDirection: 'row',
    gap: 6,
  },
  toggle: {
    alignItems: 'center',
    backgroundColor: colors.surfaceLight,
    borderColor: colors.border,
    borderRadius: 7,
    borderWidth: 1,
    height: 26,
    justifyContent: 'center',
    width: 30,
  },
});
