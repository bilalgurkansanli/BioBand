import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';

import type { NoteRepeatRate } from '../../hooks/usePadNoteRepeat';
import { RequestSongPrompt } from '../instrument/RequestSongPrompt';
import { colors } from '../../theme/colors';
import { ModalChromeHeader } from '../piano/ModalChromeHeader';

const NOTE_REPEAT_RATES: NoteRepeatRate[] = ['eighth', 'sixteenth'];

type PadsSettingsModalProps = {
  visible: boolean;
  showPadLabels: boolean;
  strongGuideHighlight: boolean;
  showSpeedHud: boolean;
  noteRepeatEnabled: boolean;
  noteRepeatRate: NoteRepeatRate;
  onChangeShowPadLabels: (value: boolean) => void;
  onChangeStrongGuideHighlight: (value: boolean) => void;
  onChangeShowSpeedHud: (value: boolean) => void;
  onChangeNoteRepeatEnabled: (value: boolean) => void;
  onChangeNoteRepeatRate: (rate: NoteRepeatRate) => void;
  onStartTutorial: () => void;
  onClose: () => void;
};

export function PadsSettingsModal({
  visible,
  showPadLabels,
  strongGuideHighlight,
  showSpeedHud,
  noteRepeatEnabled,
  noteRepeatRate,
  onChangeShowPadLabels,
  onChangeStrongGuideHighlight,
  onChangeShowSpeedHud,
  onChangeNoteRepeatEnabled,
  onChangeNoteRepeatRate,
  onStartTutorial,
  onClose,
}: PadsSettingsModalProps) {
  const { t } = useTranslation();

  return (
    <Modal animationType="fade" transparent visible={visible} onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.card} onPress={() => {}}>
          <ModalChromeHeader
            closeLabel={t('pads.settings.close')}
            onClose={onClose}
            title={t('pads.settings.title')}
          />

          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            style={styles.scroll}
          >
            <View style={styles.row}>
              <Text style={styles.rowLabel}>{t('pads.settings.showPadLabels')}</Text>
              <Switch
                onValueChange={onChangeShowPadLabels}
                thumbColor={showPadLabels ? colors.accent : '#7A7A7E'}
                trackColor={{ false: '#3A3A3C', true: `${colors.accent}55` }}
                value={showPadLabels}
              />
            </View>

            <View style={styles.row}>
              <Text style={styles.rowLabel}>
                {t('pads.settings.strongGuideHighlight')}
              </Text>
              <Switch
                onValueChange={onChangeStrongGuideHighlight}
                thumbColor={strongGuideHighlight ? colors.accent : '#7A7A7E'}
                trackColor={{ false: '#3A3A3C', true: `${colors.accent}55` }}
                value={strongGuideHighlight}
              />
            </View>

            <View style={styles.row}>
              <Text style={styles.rowLabel}>{t('pads.settings.showSpeedHud')}</Text>
              <Switch
                onValueChange={onChangeShowSpeedHud}
                thumbColor={showSpeedHud ? colors.accent : '#7A7A7E'}
                trackColor={{ false: '#3A3A3C', true: `${colors.accent}55` }}
                value={showSpeedHud}
              />
            </View>

            <View style={styles.row}>
              <Text style={styles.rowLabel}>{t('pads.settings.noteRepeat')}</Text>
              <Switch
                onValueChange={onChangeNoteRepeatEnabled}
                thumbColor={noteRepeatEnabled ? colors.accent : '#7A7A7E'}
                trackColor={{ false: '#3A3A3C', true: `${colors.accent}55` }}
                value={noteRepeatEnabled}
              />
            </View>

            <Text style={styles.sectionHint}>{t('pads.settings.noteRepeatHint')}</Text>
            <View style={styles.rateRow}>
              {NOTE_REPEAT_RATES.map((rate) => {
                const selected = rate === noteRepeatRate;
                return (
                  <Pressable
                    key={rate}
                    onPress={() => onChangeNoteRepeatRate(rate)}
                    style={({ pressed }) => [
                      styles.rateChip,
                      selected && styles.rateChipSelected,
                      pressed && styles.pressed,
                    ]}
                  >
                    <Text style={[styles.rateChipText, selected && styles.rateChipTextSelected]}>
                      {t(`pads.settings.noteRepeatRates.${rate}`)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Pressable
              onPress={() => {
                onClose();
                onStartTutorial();
              }}
              style={({ pressed }) => [styles.tutorialButton, pressed && styles.pressed]}
            >
              <Text style={styles.tutorialButtonText}>
                {t('pads.settings.startTutorial')}
              </Text>
            </Pressable>

            <RequestSongPrompt
              messageKey="pads.game.requestSong"
              openFailedKey="pads.game.requestSongOpenFailed"
            />
          </ScrollView>
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
    maxHeight: '80%',
    maxWidth: 420,
    paddingBottom: 16,
    paddingHorizontal: 16,
    paddingTop: 8,
    width: '100%',
  },
  scroll: {
    maxHeight: 320,
  },
  scrollContent: {
    gap: 12,
    paddingTop: 8,
  },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 44,
  },
  rowLabel: {
    color: colors.text,
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    marginRight: 12,
  },
  sectionHint: {
    color: colors.textSecondary,
    fontSize: 12,
    lineHeight: 16,
    marginTop: -4,
  },
  rateRow: {
    flexDirection: 'row',
    gap: 8,
  },
  rateChip: {
    backgroundColor: colors.surfaceLight,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    paddingVertical: 10,
  },
  rateChipSelected: {
    backgroundColor: `${colors.accent}22`,
    borderColor: colors.accent,
  },
  rateChipText: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
  },
  rateChipTextSelected: {
    color: colors.accent,
  },
  tutorialButton: {
    alignItems: 'center',
    backgroundColor: '#2A2540',
    borderColor: '#FFD54F55',
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 8,
    paddingVertical: 12,
  },
  tutorialButtonText: {
    color: '#FFD54F',
    fontSize: 15,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.75,
  },
});
