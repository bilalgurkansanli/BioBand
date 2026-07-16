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

import { RequestSongPrompt } from '../instrument/RequestSongPrompt';
import { colors } from '../../theme/colors';
import { ModalChromeHeader } from '../piano/ModalChromeHeader';

type DrumsSettingsModalProps = {
  visible: boolean;
  showPadLabels: boolean;
  strongGuideHighlight: boolean;
  onChangeShowPadLabels: (value: boolean) => void;
  onChangeStrongGuideHighlight: (value: boolean) => void;
  onStartTutorial: () => void;
  onClose: () => void;
};

export function DrumsSettingsModal({
  visible,
  showPadLabels,
  strongGuideHighlight,
  onChangeShowPadLabels,
  onChangeStrongGuideHighlight,
  onStartTutorial,
  onClose,
}: DrumsSettingsModalProps) {
  const { t } = useTranslation();

  return (
    <Modal animationType="fade" transparent visible={visible} onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.card} onPress={() => {}}>
          <ModalChromeHeader
            closeLabel={t('drums.settings.close')}
            onClose={onClose}
            title={t('drums.settings.title')}
          />

          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            style={styles.scroll}
          >
            <View style={styles.row}>
              <Text style={styles.rowLabel}>{t('drums.settings.showPadLabels')}</Text>
              <Switch
                onValueChange={onChangeShowPadLabels}
                thumbColor={showPadLabels ? colors.accent : '#7A7A7E'}
                trackColor={{ false: '#3A3A3C', true: `${colors.accent}55` }}
                value={showPadLabels}
              />
            </View>

            <View style={styles.row}>
              <Text style={styles.rowLabel}>
                {t('drums.settings.strongGuideHighlight')}
              </Text>
              <Switch
                onValueChange={onChangeStrongGuideHighlight}
                thumbColor={strongGuideHighlight ? colors.accent : '#7A7A7E'}
                trackColor={{ false: '#3A3A3C', true: `${colors.accent}55` }}
                value={strongGuideHighlight}
              />
            </View>

            <Pressable
              onPress={() => {
                onClose();
                onStartTutorial();
              }}
              style={({ pressed }) => [styles.tutorialButton, pressed && styles.pressed]}
            >
              <Text style={styles.tutorialButtonText}>
                {t('drums.settings.startTutorial')}
              </Text>
            </Pressable>

            <RequestSongPrompt
              messageKey="drums.game.requestSong"
              openFailedKey="drums.game.requestSongOpenFailed"
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
