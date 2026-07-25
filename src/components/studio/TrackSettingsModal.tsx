import { useEffect, useState } from 'react';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { colors } from '../../theme/colors';
import { HorizontalSlider } from '../piano/HorizontalSlider';
import { INSTRUMENT_COLORS, INSTRUMENT_ICONS, INSTRUMENT_TITLE_KEYS } from '../../utils/recordingLabels';
import {
  defaultVoiceId,
  getInstrumentVoices,
  getTrackVoiceId,
} from '../../utils/instrumentVoices';
import { withAlpha } from './timeline/timelineGeometry';
import type { StudioTrack } from '../../types/studio';

type Props = {
  visible: boolean;
  track: StudioTrack | null;
  isPreviewPlaying: boolean;
  onClose: () => void;
  onCommitVolume: (volume: number) => void;
  onSelectVoice: (voiceId: string) => void;
  onTogglePlay: () => void;
  onShare: () => void;
  onDownload: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
};

const VOLUME_STEP = 0.1;

function clampVolume(value: number): number {
  return Math.min(1, Math.max(0, Math.round(value * 100) / 100));
}

export function TrackSettingsModal({
  visible,
  track,
  isPreviewPlaying,
  onClose,
  onCommitVolume,
  onSelectVoice,
  onTogglePlay,
  onShare,
  onDownload,
  onDuplicate,
  onDelete,
}: Props) {
  const { t } = useTranslation();
  const [liveVolume, setLiveVolume] = useState(track?.volume ?? 1);

  useEffect(() => {
    setLiveVolume(track?.volume ?? 1);
  }, [track?.id, track?.volume]);

  const color = track ? INSTRUMENT_COLORS[track.instrument] : colors.accent;
  const voices = track ? getInstrumentVoices(track.instrument) : [];
  const selectedVoiceId = track
    ? getTrackVoiceId(track) ?? defaultVoiceId(track.instrument)
    : '';

  const step = (delta: number) => {
    const next = clampVolume(liveVolume + delta);
    setLiveVolume(next);
    onCommitVolume(next);
  };

  return (
    <Modal animationType="fade" transparent visible={visible} onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.card} onPress={(event) => event.stopPropagation()}>
          {track ? (
            <>
              <View style={styles.header}>
                <View style={[styles.iconChip, { backgroundColor: `${color}33`, borderColor: color }]}>
                  <Ionicons color={color} name={INSTRUMENT_ICONS[track.instrument]} size={18} />
                </View>
                <Text style={styles.title}>{t(INSTRUMENT_TITLE_KEYS[track.instrument])}</Text>
                <Pressable
                  accessibilityLabel={t('common.close')}
                  hitSlop={8}
                  onPress={onClose}
                  style={({ pressed }) => [styles.closeBtn, pressed && styles.pressed]}
                >
                  <Ionicons color="#FFFFFF" name="close" size={18} />
                </Pressable>
              </View>

              <ScrollView
                contentContainerStyle={styles.bodyContent}
                showsVerticalScrollIndicator={false}
                style={styles.body}
              >
              <View style={styles.volumeHeader}>
                <Text style={styles.sectionLabel}>{t('studio.volume')}</Text>
                <Text style={styles.volumeValue}>{Math.round(liveVolume * 100)}%</Text>
              </View>

              <View style={styles.volumeRow}>
                <Pressable
                  accessibilityLabel={t('studio.volumeDown')}
                  hitSlop={6}
                  onPress={() => step(-VOLUME_STEP)}
                  style={({ pressed }) => [styles.stepBtn, pressed && styles.pressed]}
                >
                  <Ionicons color={colors.text} name="remove" size={20} />
                </Pressable>
                <HorizontalSlider
                  accentColor={color}
                  onSlidingComplete={(value) => onCommitVolume(clampVolume(value))}
                  onValueChange={setLiveVolume}
                  style={styles.slider}
                  thumbSize={18}
                  value={liveVolume}
                />
                <Pressable
                  accessibilityLabel={t('studio.volumeUp')}
                  hitSlop={6}
                  onPress={() => step(VOLUME_STEP)}
                  style={({ pressed }) => [styles.stepBtn, pressed && styles.pressed]}
                >
                  <Ionicons color={colors.text} name="add" size={20} />
                </Pressable>
              </View>

              {voices.length > 1 ? (
                <>
                  <Text style={[styles.sectionLabel, styles.voiceLabel]}>
                    {t('studio.instrumentVoice')}
                  </Text>
                  <ScrollView
                    contentContainerStyle={styles.voiceRow}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={styles.voiceScroll}
                  >
                    {voices.map((voice) => {
                      const active = voice.id === selectedVoiceId;
                      return (
                        <Pressable
                          key={voice.id}
                          onPress={() => onSelectVoice(voice.id)}
                          style={({ pressed }) => [
                            styles.voiceChip,
                            active && { backgroundColor: withAlpha(color, 0.22), borderColor: color },
                            pressed && styles.pressed,
                          ]}
                        >
                          <Text style={styles.voiceIcon}>{voice.icon}</Text>
                          <Text
                            numberOfLines={1}
                            style={[styles.voiceText, active && { color: colors.text }]}
                          >
                            {t(voice.labelKey)}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </ScrollView>
                </>
              ) : null}

              <View style={styles.actions}>
                <ActionRow
                  icon={isPreviewPlaying ? 'stop' : 'play'}
                  label={isPreviewPlaying ? t('studio.trackStopPlayback') : t('studio.trackPlay')}
                  onPress={onTogglePlay}
                />
                <ActionRow
                  icon="download-outline"
                  label={t('studio.trackDownload')}
                  onPress={onDownload}
                />
                <ActionRow icon="share-outline" label={t('studio.trackShare')} onPress={onShare} />
                <ActionRow
                  icon="copy-outline"
                  label={t('studio.trackDuplicate')}
                  onPress={onDuplicate}
                />
                <ActionRow
                  danger
                  icon="trash-outline"
                  label={t('studio.trackDelete')}
                  onPress={onDelete}
                />
              </View>
              </ScrollView>
            </>
          ) : null}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

type ActionRowProps = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  danger?: boolean;
};

function ActionRow({ icon, label, onPress, danger }: ActionRowProps) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
      <View style={[styles.rowIcon, danger && styles.rowIconDanger]}>
        <Ionicons color={danger ? colors.error : colors.accent} name={icon} size={18} />
      </View>
      <Text style={[styles.rowText, danger && styles.rowTextDanger]}>{label}</Text>
      <Ionicons color={colors.textSecondary} name="chevron-forward" size={16} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.55)',
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 16,
    borderWidth: 1,
    maxHeight: '92%',
    maxWidth: 400,
    padding: 16,
    width: '100%',
  },
  body: {
    flexShrink: 1,
  },
  bodyContent: {
    paddingBottom: 4,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  iconChip: {
    alignItems: 'center',
    borderRadius: 9,
    borderWidth: 1,
    height: 34,
    justifyContent: 'center',
    width: 34,
  },
  title: {
    color: colors.text,
    flex: 1,
    fontSize: 17,
    fontWeight: '700',
  },
  closeBtn: {
    alignItems: 'center',
    backgroundColor: colors.error,
    borderRadius: 15,
    height: 30,
    justifyContent: 'center',
    width: 30,
  },
  volumeHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  sectionLabel: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  volumeValue: {
    color: colors.text,
    fontSize: 14,
    fontVariant: ['tabular-nums'],
    fontWeight: '700',
  },
  volumeRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  stepBtn: {
    alignItems: 'center',
    backgroundColor: colors.surfaceLight,
    borderColor: colors.border,
    borderRadius: 9,
    borderWidth: 1,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  slider: {
    flex: 1,
  },
  voiceLabel: {
    marginTop: 16,
    marginBottom: 8,
  },
  voiceScroll: {
    flexGrow: 0,
  },
  voiceRow: {
    gap: 8,
    paddingRight: 4,
  },
  voiceChip: {
    alignItems: 'center',
    backgroundColor: colors.surfaceLight,
    borderColor: colors.border,
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  voiceIcon: {
    fontSize: 15,
  },
  voiceText: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
    maxWidth: 110,
  },
  actions: {
    marginTop: 16,
  },
  row: {
    alignItems: 'center',
    backgroundColor: colors.surfaceLight,
    borderColor: colors.border,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    marginBottom: 8,
    padding: 11,
  },
  rowIcon: {
    alignItems: 'center',
    backgroundColor: `${colors.accent}22`,
    borderRadius: 16,
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  rowIconDanger: {
    backgroundColor: `${colors.error}22`,
  },
  rowText: {
    color: colors.text,
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
  },
  rowTextDanger: {
    color: colors.error,
  },
  pressed: {
    opacity: 0.75,
  },
});
