import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { MODAL_ORIENTATIONS } from '../modalOrientations';
import { useTranslation } from 'react-i18next';

import {
  PIANO_VOICES,
  type PianoVoiceId,
} from '../../instruments/piano/pianoVoices';
import { colors } from '../../theme/colors';
import { ModalChromeHeader } from './ModalChromeHeader';

type PianoVoiceModalProps = {
  visible: boolean;
  selectedVoiceId: PianoVoiceId;
  onSelect: (voiceId: PianoVoiceId) => void;
  onClose: () => void;
};

export function PianoVoiceModal({
  visible,
  selectedVoiceId,
  onSelect,
  onClose,
}: PianoVoiceModalProps) {
  const { t } = useTranslation();

  return (
    <Modal
      supportedOrientations={MODAL_ORIENTATIONS} animationType="fade" transparent visible={visible} onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.card} onPress={() => {}}>
          <ModalChromeHeader
            closeLabel={t('piano.voices.close')}
            onClose={onClose}
            title={t('piano.voices.title')}
          />

          <View style={styles.grid}>
            {PIANO_VOICES.map((voice) => {
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
    paddingHorizontal: 8,
    paddingVertical: 12,
    width: '30%',
  },
  itemSelected: {
    borderWidth: 2,
  },
  itemIcon: {
    fontSize: 30,
    marginBottom: 6,
  },
  itemLabel: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  pressed: {
    opacity: 0.75,
  },
});
