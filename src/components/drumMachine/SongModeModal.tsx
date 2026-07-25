import Ionicons from '@expo/vector-icons/Ionicons';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { getDrumMachineBank } from '../../instruments/drumMachine/drumMachineBanks';
import {
  DRUM_MACHINE_PRESETS,
} from '../../instruments/drumMachine/drumMachinePresets';
import type { DrumMachinePattern } from '../../storage/drumMachinePatternsStorage';
import type { DrumMachineSongEntry } from '../../storage/drumMachineSongStorage';
import { colors } from '../../theme/colors';

export type ResolvedSongEntry = {
  entry: DrumMachineSongEntry;
  pattern: DrumMachinePattern;
};

type Props = {
  visible: boolean;
  accent: string;
  entries: ResolvedSongEntry[];
  patterns: DrumMachinePattern[];
  songPlaying: boolean;
  activeIndex: number | null;
  onClose: () => void;
  onAdd: (patternId: string) => void;
  onCycleRepeats: (index: number) => void;
  onMove: (index: number, direction: -1 | 1) => void;
  onRemove: (index: number) => void;
  onClear: () => void;
  onPlayStop: () => void;
};

export function SongModeModal({
  visible,
  accent,
  entries,
  patterns,
  songPlaying,
  activeIndex,
  onClose,
  onAdd,
  onCycleRepeats,
  onMove,
  onRemove,
  onClear,
  onPlayStop,
}: Props) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  return (
    <Modal animationType="fade" transparent visible={visible} onRequestClose={onClose}>
      <Pressable
        onPress={onClose}
        style={[
          styles.backdrop,
          {
            // Centered card clear of the system bars — bottom sheets collide
            // with Android's navigation buttons/gesture area in landscape.
            paddingBottom: Math.max(20, insets.bottom + 12),
            paddingLeft: Math.max(24, insets.left + 12),
            paddingRight: Math.max(24, insets.right + 12),
            paddingTop: Math.max(20, insets.top + 12),
          },
        ]}
      >
        {/* Swallows taps so touching the card itself never closes it. */}
        <Pressable onPress={() => {}} style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>{t('drumMachine.songTitle')}</Text>
            <Pressable
              accessibilityLabel={t('common.close')}
              hitSlop={8}
              onPress={onClose}
              style={({ pressed }) => [styles.closeBtn, pressed && { opacity: 0.75 }]}
            >
              <Ionicons color="#FFFFFF" name="close" size={18} />
            </Pressable>
          </View>

          <ScrollView style={styles.list}>
            {entries.length === 0 ? (
              <Text style={styles.empty}>{t('drumMachine.songEmpty')}</Text>
            ) : (
              entries.map(({ entry, pattern }, index) => {
                const active = songPlaying && index === activeIndex;
                return (
                  <View
                    key={`${entry.patternId}-${index}`}
                    style={[styles.row, active && { backgroundColor: `${accent}22` }]}
                  >
                    <Text style={[styles.orderText, { color: accent }]}>
                      {index + 1}
                    </Text>
                    <View style={styles.rowMain}>
                      <Text numberOfLines={1} style={styles.rowTitle}>
                        {pattern.title}
                      </Text>
                      <Text style={styles.rowMeta}>
                        {t(getDrumMachineBank(pattern.machineType).labelKey)} ·{' '}
                        {pattern.bpm} BPM
                      </Text>
                    </View>
                    <Pressable
                      accessibilityLabel={t('drumMachine.songRepeats')}
                      onPress={() => onCycleRepeats(index)}
                      style={[styles.repeatChip, { borderColor: accent }]}
                    >
                      <Text style={[styles.repeatText, { color: accent }]}>
                        {entry.repeats}×
                      </Text>
                    </Pressable>
                    <Pressable
                      accessibilityLabel={t('drumMachine.songMoveUp')}
                      disabled={index === 0}
                      hitSlop={4}
                      onPress={() => onMove(index, -1)}
                      style={[styles.rowAction, index === 0 && styles.actionDisabled]}
                    >
                      <Ionicons color={colors.textSecondary} name="chevron-up" size={18} />
                    </Pressable>
                    <Pressable
                      accessibilityLabel={t('drumMachine.songMoveDown')}
                      disabled={index === entries.length - 1}
                      hitSlop={4}
                      onPress={() => onMove(index, 1)}
                      style={[
                        styles.rowAction,
                        index === entries.length - 1 && styles.actionDisabled,
                      ]}
                    >
                      <Ionicons color={colors.textSecondary} name="chevron-down" size={18} />
                    </Pressable>
                    <Pressable
                      accessibilityLabel={t('drumMachine.songRemove')}
                      hitSlop={4}
                      onPress={() => onRemove(index)}
                      style={styles.rowAction}
                    >
                      <Text style={styles.deleteText}>×</Text>
                    </Pressable>
                  </View>
                );
              })
            )}

            <Text style={styles.sectionTitle}>{t('drumMachine.songAddTitle')}</Text>
            {DRUM_MACHINE_PRESETS.map((preset) => (
              <Pressable
                key={preset.id}
                onPress={() => onAdd(preset.id)}
                style={({ pressed }) => [styles.addRow, pressed && { opacity: 0.7 }]}
              >
                <View style={styles.rowMain}>
                  <Text style={styles.rowTitle}>{t(preset.labelKey)}</Text>
                  <Text style={styles.rowMeta}>
                    {t(getDrumMachineBank(preset.machineType).labelKey)} ·{' '}
                    {preset.bpm} BPM
                  </Text>
                </View>
                <Ionicons color={accent} name="add-circle-outline" size={22} />
              </Pressable>
            ))}
            {patterns.map((pattern) => (
              <Pressable
                key={pattern.id}
                onPress={() => onAdd(pattern.id)}
                style={({ pressed }) => [styles.addRow, pressed && { opacity: 0.7 }]}
              >
                <View style={styles.rowMain}>
                  <Text style={styles.rowTitle}>{pattern.title}</Text>
                  <Text style={styles.rowMeta}>
                    {t(getDrumMachineBank(pattern.machineType ?? 'drums').labelKey)} ·{' '}
                    {pattern.bpm} BPM
                  </Text>
                </View>
                <Ionicons color={accent} name="add-circle-outline" size={22} />
              </Pressable>
            ))}
          </ScrollView>

          <View style={styles.footer}>
            <Pressable
              disabled={entries.length === 0}
              onPress={onPlayStop}
              style={[
                styles.playBtn,
                { backgroundColor: songPlaying ? colors.error : accent },
                entries.length === 0 && styles.actionDisabled,
              ]}
            >
              <Ionicons
                color="#FFFFFF"
                name={songPlaying ? 'stop' : 'play'}
                size={18}
              />
              <Text style={styles.playText}>
                {songPlaying ? t('drumMachine.songStop') : t('drumMachine.songPlay')}
              </Text>
            </Pressable>
            <Pressable
              disabled={entries.length === 0}
              onPress={onClear}
              style={[styles.clearBtn, entries.length === 0 && styles.actionDisabled]}
            >
              <Text style={styles.clearText}>{t('drumMachine.songClear')}</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.55)',
    flex: 1,
    justifyContent: 'center',
  },
  sheet: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 16,
    borderWidth: 1,
    maxHeight: '100%',
    maxWidth: 480,
    padding: 18,
    width: '100%',
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  title: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '700',
  },
  closeBtn: {
    alignItems: 'center',
    backgroundColor: colors.error,
    borderRadius: 14,
    height: 28,
    justifyContent: 'center',
    width: 28,
  },
  list: {
    flexShrink: 1,
    marginBottom: 10,
  },
  empty: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
    marginVertical: 12,
  },
  sectionTitle: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.6,
    marginBottom: 2,
    marginTop: 14,
    textTransform: 'uppercase',
  },
  row: {
    alignItems: 'center',
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    borderRadius: 8,
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 4,
  },
  orderText: {
    fontSize: 13,
    fontVariant: ['tabular-nums'],
    fontWeight: '700',
    width: 18,
  },
  rowMain: {
    flex: 1,
    paddingVertical: 10,
  },
  rowTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '600',
  },
  rowMeta: {
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  repeatChip: {
    borderRadius: 8,
    borderWidth: 1.5,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  repeatText: {
    fontSize: 13,
    fontWeight: '700',
  },
  rowAction: {
    paddingHorizontal: 4,
    paddingVertical: 8,
  },
  actionDisabled: {
    opacity: 0.35,
  },
  deleteText: {
    color: colors.error,
    fontSize: 20,
    fontWeight: '700',
  },
  addRow: {
    alignItems: 'center',
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 4,
  },
  footer: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  playBtn: {
    alignItems: 'center',
    borderRadius: 10,
    flex: 1,
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'center',
    paddingVertical: 12,
  },
  playText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  clearBtn: {
    borderColor: colors.border,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  clearText: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
});
