import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import {
  PIANO_VOICES,
  type PianoVoiceId,
} from '../../instruments/piano/pianoVoices';
import { colors } from '../../theme/colors';

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
    <Modal animationType="fade" transparent visible={visible} onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.card} onPress={() => {}}>
          <Text style={styles.title}>{t('piano.voices.title')}</Text>

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

          <Pressable
            onPress={onClose}
            style={({ pressed }) => [styles.closeButton, pressed && styles.pressed]}
          >
            <Text style={styles.closeButtonText}>{t('piano.voices.close')}</Text>
          </Pressable>
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
  title: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
    textAlign: 'center',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 10,
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
  closeButton: {
    marginTop: 16,
    paddingVertical: 10,
  },
  closeButtonText: {
    color: colors.textSecondary,
    fontSize: 14,
    textAlign: 'center',
  },
  pressed: {
    opacity: 0.75,
  },
});
