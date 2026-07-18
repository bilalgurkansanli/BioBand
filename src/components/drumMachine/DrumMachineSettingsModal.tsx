import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import {
  DRUM_MACHINE_TYPES,
  getDrumMachineBank,
  type DrumMachineTypeId,
} from '../../instruments/drumMachine/drumMachineBanks';
import { colors } from '../../theme/colors';

type Props = {
  visible: boolean;
  machineType: DrumMachineTypeId;
  onClose: () => void;
  onSelectType: (typeId: DrumMachineTypeId) => void;
};

export function DrumMachineSettingsModal({
  visible,
  machineType,
  onClose,
  onSelectType,
}: Props) {
  const { t } = useTranslation();

  return (
    <Modal animationType="fade" transparent visible={visible} onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.title}>{t('drumMachine.settingsTitle')}</Text>
          <Text style={styles.hint}>{t('drumMachine.settingsTypeHint')}</Text>
          <View style={styles.list}>
            {DRUM_MACHINE_TYPES.map((typeId) => {
              const bank = getDrumMachineBank(typeId);
              const active = typeId === machineType;
              return (
                <Pressable
                  key={typeId}
                  onPress={() => {
                    onSelectType(typeId);
                    onClose();
                  }}
                  style={[
                    styles.option,
                    active && {
                      borderColor: bank.theme.accent,
                      backgroundColor: bank.theme.stageBg,
                    },
                  ]}
                >
                  <View
                    style={[styles.swatch, { backgroundColor: bank.theme.accent }]}
                  />
                  <Text style={styles.optionText}>{t(bank.labelKey)}</Text>
                </Pressable>
              );
            })}
          </View>
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
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.55)',
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 14,
    borderWidth: 1,
    padding: 18,
    width: '100%',
  },
  title: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 6,
  },
  hint: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 12,
  },
  list: {
    gap: 8,
  },
  option: {
    alignItems: 'center',
    backgroundColor: colors.surfaceLight,
    borderColor: colors.border,
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  swatch: {
    borderRadius: 6,
    height: 18,
    width: 18,
  },
  optionText: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '600',
  },
  cancel: {
    alignItems: 'center',
    marginTop: 12,
    paddingVertical: 10,
  },
  cancelText: {
    color: colors.accent,
    fontSize: 14,
    fontWeight: '600',
  },
});
