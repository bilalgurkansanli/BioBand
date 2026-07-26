import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { getSelectableBankDefinitions, type PadBankId } from '../../instruments/pads/padsBanks';
import { colors } from '../../theme/colors';
import { ModalChromeHeader } from '../piano/ModalChromeHeader';
import { SCREEN_READER_HIDDEN } from '../../utils/accessibility';

type PadsKitModalProps = {
  visible: boolean;
  selectedBankId: PadBankId;
  onSelect: (bankId: PadBankId) => void;
  onClose: () => void;
};

export function PadsKitModal({
  visible,
  selectedBankId,
  onSelect,
  onClose,
}: PadsKitModalProps) {
  const { t } = useTranslation();

  return (
    <Modal animationType="fade" transparent visible={visible} onRequestClose={onClose}>
      {/* Dismiss area is an absolute-fill sibling behind the card — a
          Pressable ancestor would claim child gestures (see drums modals). */}
      <View style={styles.overlay}>
        <Pressable
          {...SCREEN_READER_HIDDEN}
          style={StyleSheet.absoluteFill}
          onPress={onClose}
        />
        <View style={styles.card}>
          <ModalChromeHeader
            closeLabel={t('pads.banks.close')}
            onClose={onClose}
            title={t('pads.banks.title')}
          />

          <View style={styles.grid}>
            {getSelectableBankDefinitions().map((bank) => {
              const isSelected = bank.id === selectedBankId;

              return (
                <Pressable
                  key={bank.id}
                  onPress={() => onSelect(bank.id)}
                  style={({ pressed }) => [
                    styles.item,
                    isSelected && [
                      styles.itemSelected,
                      { borderColor: bank.theme.accent },
                    ],
                    pressed && styles.pressed,
                  ]}
                >
                  <Text style={styles.itemIcon}>{bank.icon}</Text>
                  <Text
                    style={[
                      styles.itemLabel,
                      isSelected && { color: bank.theme.accent },
                    ]}
                  >
                    {t(bank.labelKey)}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 16,
    borderWidth: 1,
    maxWidth: 480,
    padding: 20,
    width: '100%',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'center',
  },
  item: {
    alignItems: 'center',
    backgroundColor: colors.surfaceLight,
    borderColor: colors.border,
    borderRadius: 12,
    borderWidth: 1,
    minWidth: '30%',
    paddingHorizontal: 10,
    paddingVertical: 14,
    width: '30%',
  },
  itemSelected: {
    backgroundColor: colors.surface,
    borderWidth: 2,
  },
  itemIcon: {
    fontSize: 28,
    marginBottom: 6,
  },
  itemLabel: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
  pressed: {
    opacity: 0.75,
  },
});
