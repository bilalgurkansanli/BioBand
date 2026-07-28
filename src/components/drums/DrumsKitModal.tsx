import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { MODAL_ORIENTATIONS } from '../modalOrientations';
import { useTranslation } from 'react-i18next';

import { DRUM_KITS, type DrumKitId } from '../../instruments/drums/drumsKits';
import { colors } from '../../theme/colors';
import { ModalChromeHeader } from '../piano/ModalChromeHeader';

type DrumsKitModalProps = {
  visible: boolean;
  selectedKitId: DrumKitId;
  onSelect: (kitId: DrumKitId) => void;
  onClose: () => void;
};

export function DrumsKitModal({
  visible,
  selectedKitId,
  onSelect,
  onClose,
}: DrumsKitModalProps) {
  const { t } = useTranslation();

  return (
    <Modal
      supportedOrientations={MODAL_ORIENTATIONS} animationType="fade" transparent visible={visible} onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.card} onPress={() => {}}>
          <ModalChromeHeader
            closeLabel={t('drums.kits.close')}
            onClose={onClose}
            title={t('drums.kits.title')}
          />

          <View style={styles.grid}>
            {DRUM_KITS.map((kit) => {
              const isSelected = kit.id === selectedKitId;

              return (
                <Pressable
                  key={kit.id}
                  onPress={() => onSelect(kit.id)}
                  style={({ pressed }) => [
                    styles.item,
                    isSelected && [
                      styles.itemSelected,
                      { borderColor: kit.theme.accent },
                    ],
                    pressed && styles.pressed,
                  ]}
                >
                  <Text style={styles.itemIcon}>{kit.icon}</Text>
                  <Text
                    style={[
                      styles.itemLabel,
                      isSelected && { color: kit.theme.accent },
                    ]}
                  >
                    {t(kit.labelKey)}
                  </Text>
                  <View style={styles.swatchRow}>
                    <View style={[styles.swatch, { backgroundColor: kit.theme.shell }]} />
                    <View style={[styles.swatch, { backgroundColor: kit.theme.cymbal }]} />
                    <View style={[styles.swatch, { backgroundColor: kit.theme.head }]} />
                  </View>
                </Pressable>
              );
            })}
          </View>
        </Pressable>
      </Pressable>
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
  swatchRow: {
    flexDirection: 'row',
    gap: 4,
    marginTop: 6,
  },
  swatch: {
    borderColor: 'rgba(255, 255, 255, 0.25)',
    borderRadius: 4,
    borderWidth: StyleSheet.hairlineWidth,
    height: 8,
    width: 8,
  },
});
