import { Ionicons } from '@expo/vector-icons';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { getDrumMachineBank } from '../../instruments/drumMachine/drumMachineBanks';
import {
  DRUM_MACHINE_PRESETS,
  type DrumMachinePreset,
} from '../../instruments/drumMachine/drumMachinePresets';
import type { DrumMachinePattern } from '../../storage/drumMachinePatternsStorage';
import { colors } from '../../theme/colors';

type Props = {
  visible: boolean;
  accent: string;
  patterns: DrumMachinePattern[];
  onClose: () => void;
  onSelect: (pattern: DrumMachinePattern) => void;
  onSelectPreset: (preset: DrumMachinePreset) => void;
  onShare: (pattern: DrumMachinePattern) => void;
  onImport: () => void;
  onDelete: (id: string) => void;
};

export function LoadPatternModal({
  visible,
  accent,
  patterns,
  onClose,
  onSelect,
  onSelectPreset,
  onShare,
  onImport,
  onDelete,
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
            <Text style={styles.title}>{t('drumMachine.loadTitle')}</Text>
            <Pressable
              accessibilityLabel={t('drumMachine.importPattern')}
              onPress={onImport}
              style={[styles.importBtn, { borderColor: accent }]}
            >
              <Ionicons color={accent} name="download-outline" size={16} />
              <Text style={[styles.importText, { color: accent }]}>
                {t('drumMachine.importPattern')}
              </Text>
            </Pressable>
          </View>

          <ScrollView style={styles.list}>
            <Text style={styles.sectionTitle}>{t('drumMachine.presetsTitle')}</Text>
            {DRUM_MACHINE_PRESETS.map((preset) => (
              <View key={preset.id} style={styles.row}>
                <Pressable
                  onPress={() => onSelectPreset(preset)}
                  style={({ pressed }) => [styles.rowMain, pressed && styles.pressed]}
                >
                  <Text style={styles.rowTitle}>{t(preset.labelKey)}</Text>
                  <Text style={styles.rowMeta}>
                    {t(getDrumMachineBank(preset.machineType).labelKey)} ·{' '}
                    {preset.bpm} BPM
                    {preset.grid[0]!.length === 9 || preset.grid[0]!.length === 18
                      ? ' · 9/8'
                      : ''}
                  </Text>
                </Pressable>
                <Ionicons
                  color={colors.textSecondary}
                  name="sparkles-outline"
                  size={16}
                  style={styles.presetIcon}
                />
              </View>
            ))}

            <Text style={styles.sectionTitle}>{t('drumMachine.savedTitle')}</Text>
            {patterns.length === 0 ? (
              <Text style={styles.empty}>{t('drumMachine.loadEmpty')}</Text>
            ) : (
              patterns.map((pattern) => (
                <View key={pattern.id} style={styles.row}>
                  <Pressable
                    onPress={() => onSelect(pattern)}
                    style={({ pressed }) => [styles.rowMain, pressed && styles.pressed]}
                  >
                    <Text style={styles.rowTitle}>{pattern.title}</Text>
                    <Text style={styles.rowMeta}>
                      {t(getDrumMachineBank(pattern.machineType ?? 'drums').labelKey)} ·{' '}
                      {pattern.bpm} BPM
                    </Text>
                  </Pressable>
                  <Pressable
                    accessibilityLabel={t('drumMachine.sharePattern')}
                    hitSlop={8}
                    onPress={() => onShare(pattern)}
                    style={styles.rowAction}
                  >
                    <Ionicons color={accent} name="share-social-outline" size={18} />
                  </Pressable>
                  <Pressable
                    accessibilityLabel={t('drumMachine.deletePattern')}
                    hitSlop={8}
                    onPress={() => onDelete(pattern.id)}
                    style={styles.rowAction}
                  >
                    <Text style={styles.deleteText}>×</Text>
                  </Pressable>
                </View>
              ))
            )}
          </ScrollView>

          <Pressable onPress={onClose} style={styles.cancel}>
            <Text style={styles.cancelText}>{t('common.cancel')}</Text>
          </Pressable>
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
  importBtn: {
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  importText: {
    fontSize: 12,
    fontWeight: '600',
  },
  sectionTitle: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.6,
    marginBottom: 2,
    marginTop: 10,
    textTransform: 'uppercase',
  },
  empty: {
    color: colors.textSecondary,
    fontSize: 14,
    marginVertical: 12,
  },
  list: {
    flexShrink: 1,
    marginBottom: 8,
  },
  row: {
    alignItems: 'center',
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    flexDirection: 'row',
  },
  rowMain: {
    flex: 1,
    paddingVertical: 12,
  },
  pressed: {
    opacity: 0.75,
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
  rowAction: {
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  presetIcon: {
    paddingHorizontal: 10,
  },
  deleteText: {
    color: colors.error,
    fontSize: 22,
    fontWeight: '700',
  },
  cancel: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  cancelText: {
    color: colors.accent,
    fontSize: 15,
    fontWeight: '600',
  },
});
