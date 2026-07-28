import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { MODAL_ORIENTATIONS } from '../modalOrientations';
import { useTranslation } from 'react-i18next';

import { VIOLIN_VOICES, type ViolinVoiceId } from '../../instruments/violin/violinVoices';
import { colors } from '../../theme/colors';
import { ModalChromeHeader } from '../piano/ModalChromeHeader';
import { SCREEN_READER_HIDDEN } from '../../utils/accessibility';

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
    <Modal
      supportedOrientations={MODAL_ORIENTATIONS} animationType="fade" transparent visible={visible} onRequestClose={onClose}>
      {/* Dismiss area is an absolute-fill sibling behind the card — a
          Pressable ancestor can claim gestures meant for the content. */}
      <View style={styles.overlay}>
        <Pressable
          {...SCREEN_READER_HIDDEN}
          onPress={onClose}
          style={styles.backdrop}
        />
        <View style={styles.card}>
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
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
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
