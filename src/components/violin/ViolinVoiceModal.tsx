import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { VIOLIN_VOICES, type ViolinVoiceId } from '../../instruments/violin/violinVoices';
import { colors } from '../../theme/colors';
import { ModalChromeHeader } from '../piano/ModalChromeHeader';

type ViolinVoiceModalProps = {
  visible: boolean;
  selectedVoiceId: ViolinVoiceId;
  onSelect: (voiceId: ViolinVoiceId) => void;
  onClose: () => void;
};

export function ViolinVoiceModal({
  visible,
  selectedVoiceId,
  onSelect,
  onClose,
}: ViolinVoiceModalProps) {
  const { t } = useTranslation();

  return (
    <Modal animationType="fade" transparent visible={visible} onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.card} onPress={() => {}}>
          <ModalChromeHeader
            closeLabel={t('violin.voices.close')}
            onClose={onClose}
            title={t('violin.voices.title')}
          />

          <View style={styles.grid}>
            {VIOLIN_VOICES.map((voice) => {
              const isSelected = voice.id === selectedVoiceId;

              return (
                <Pressable
                  key={voice.id}
                  onPress={() => onSelect(voice.id)}
                  style={({ pressed }) => [
                    styles.item,
                    isSelected && [
                      styles.itemSelected,
                      { borderColor: voice.theme.accent },
                    ],
                    pressed && styles.pressed,
                  ]}
                >
                  <Text style={styles.itemIcon}>{voice.icon}</Text>
                  <Text
                    style={[
                      styles.itemLabel,
                      isSelected && { color: voice.theme.accent },
                    ]}
                  >
                    {t(voice.labelKey)}
                  </Text>
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
    padding: 20,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    maxWidth: 420,
    paddingBottom: 16,
    paddingHorizontal: 16,
    paddingTop: 8,
    width: '100%',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'space-between',
    paddingTop: 8,
  },
  item: {
    alignItems: 'center',
    backgroundColor: colors.surfaceLight,
    borderColor: 'transparent',
    borderRadius: 12,
    borderWidth: 2,
    paddingVertical: 14,
    width: '48%',
  },
  itemSelected: {
    backgroundColor: '#2C2C2E',
  },
  itemIcon: {
    fontSize: 28,
    marginBottom: 6,
  },
  itemLabel: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.75,
  },
});
