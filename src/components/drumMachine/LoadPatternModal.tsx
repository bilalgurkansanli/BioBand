import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { getDrumMachineBank } from '../../instruments/drumMachine/drumMachineBanks';
import type { DrumMachinePattern } from '../../storage/drumMachinePatternsStorage';
import { colors } from '../../theme/colors';

type Props = {
  visible: boolean;
  patterns: DrumMachinePattern[];
  onClose: () => void;
  onSelect: (pattern: DrumMachinePattern) => void;
  onDelete: (id: string) => void;
};

export function LoadPatternModal({
  visible,
  patterns,
  onClose,
  onSelect,
  onDelete,
}: Props) {
  const { t } = useTranslation();

  return (
    <Modal animationType="slide" transparent visible={visible} onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <Text style={styles.title}>{t('drumMachine.loadTitle')}</Text>
          {patterns.length === 0 ? (
            <Text style={styles.empty}>{t('drumMachine.loadEmpty')}</Text>
          ) : (
            <ScrollView style={styles.list}>
              {patterns.map((pattern) => (
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
                    accessibilityLabel={t('drumMachine.deletePattern')}
                    hitSlop={8}
                    onPress={() => onDelete(pattern.id)}
                    style={styles.deleteBtn}
                  >
                    <Text style={styles.deleteText}>×</Text>
                  </Pressable>
                </View>
              ))}
            </ScrollView>
          )}
          <Pressable onPress={onClose} style={styles.cancel}>
            <Text style={styles.cancelText}>{t('common.cancel')}</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    backgroundColor: 'rgba(0,0,0,0.55)',
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: '70%',
    padding: 20,
  },
  title: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
  },
  empty: {
    color: colors.textSecondary,
    fontSize: 14,
    marginBottom: 16,
  },
  list: {
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
  deleteBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
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
