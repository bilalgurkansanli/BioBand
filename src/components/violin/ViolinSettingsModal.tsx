import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { MODAL_ORIENTATIONS } from '../modalOrientations';
import { useCenteredModalPadding } from '../modalSafeArea';
import { useTranslation } from 'react-i18next';

import { RequestSongPrompt } from '../instrument/RequestSongPrompt';
import type { ViolinNoteLabelMode } from '../../storage/violinSettingsStorage';
import { colors } from '../../theme/colors';
import { ModalChromeHeader } from '../piano/ModalChromeHeader';
import { SCREEN_READER_HIDDEN } from '../../utils/accessibility';

const NOTE_LABEL_MODES: ViolinNoteLabelMode[] = ['off', 'note', 'finger'];

type ViolinSettingsModalProps = {
  visible: boolean;
  noteLabelMode: ViolinNoteLabelMode;
  strongGuideHighlight: boolean;
  haptics: boolean;
  onChangeNoteLabelMode: (mode: ViolinNoteLabelMode) => void;
  onChangeStrongGuideHighlight: (value: boolean) => void;
  onChangeHaptics: (value: boolean) => void;
  onStartTutorial: () => void;
  onClose: () => void;
};

export function ViolinSettingsModal({
  visible,
  noteLabelMode,
  strongGuideHighlight,
  haptics,
  onChangeNoteLabelMode,
  onChangeStrongGuideHighlight,
  onChangeHaptics,
  onStartTutorial,
  onClose,
}: ViolinSettingsModalProps) {
  const safeAreaPadding = useCenteredModalPadding(20);
  const { t } = useTranslation();

  return (
    <Modal
      supportedOrientations={MODAL_ORIENTATIONS} animationType="fade" transparent visible={visible} onRequestClose={onClose}>
      <View style={[styles.overlay, safeAreaPadding]}>
        <Pressable
          {...SCREEN_READER_HIDDEN}
          onPress={onClose}
          style={styles.backdrop}
        />
        <View style={styles.card}>
          <ModalChromeHeader
            closeLabel={t('violin.settings.close')}
            onClose={onClose}
            title={t('violin.settings.title')}
          />

          <ScrollView
            bounces
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            nestedScrollEnabled
            showsVerticalScrollIndicator
            style={styles.scroll}
          >
            <Text style={styles.sectionTitle}>
              {t('violin.settings.noteLabels')}
            </Text>
            <View style={styles.chipRow}>
              {NOTE_LABEL_MODES.map((mode) => {
                const on = noteLabelMode === mode;
                return (
                  <Pressable
                    accessibilityRole="button"
                    key={mode}
                    onPress={() => onChangeNoteLabelMode(mode)}
                    style={[
                      styles.chip,
                      on && {
                        backgroundColor: `${colors.accent}33`,
                        borderColor: colors.accent,
                      },
                    ]}
                  >
                    <Text style={[styles.chipText, on && { color: colors.accent }]}>
                      {t(`violin.settings.noteLabelModes.${mode}`)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <View style={styles.row}>
              <Text style={styles.rowLabel}>
                {t('violin.settings.strongGuideHighlight')}
              </Text>
              <Switch
                accessibilityLabel={t('violin.settings.strongGuideHighlight')}
                onValueChange={onChangeStrongGuideHighlight}
                thumbColor={strongGuideHighlight ? colors.accent : colors.controlThumbOff}
                trackColor={{ false: colors.controlTrack, true: `${colors.accent}55` }}
                value={strongGuideHighlight}
              />
            </View>

            <View style={styles.row}>
              <Text style={styles.rowLabel}>{t('violin.settings.haptics')}</Text>
              <Switch
                accessibilityLabel={t('violin.settings.haptics')}
                onValueChange={onChangeHaptics}
                thumbColor={haptics ? colors.accent : colors.controlThumbOff}
                trackColor={{ false: colors.controlTrack, true: `${colors.accent}55` }}
                value={haptics}
              />
            </View>

            <Pressable
              accessibilityRole="button"
              onPress={() => {
                onClose();
                onStartTutorial();
              }}
              style={({ pressed }) => [styles.tutorialButton, pressed && styles.pressed]}
            >
              <Text style={styles.tutorialText}>{t('violin.settings.startTutorial')}</Text>
            </Pressable>

            <RequestSongPrompt
              messageKey="violin.game.requestSong"
              openFailedKey="violin.game.requestSongOpenFailed"
            />
          </ScrollView>
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
    ...StyleSheet.absoluteFill,
    backgroundColor: colors.backdrop,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    maxHeight: '90%',
    maxWidth: 480,
    paddingBottom: 8,
    paddingHorizontal: 16,
    paddingTop: 8,
    width: '100%',
  },
  scroll: {
    // Let the card's maxHeight bound it — a fixed height here made the list
    // unscrollable when the window was shorter than the cap (landscape).
    flexGrow: 0,
  },
  scrollContent: {
    paddingBottom: 16,
    paddingTop: 4,
  },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  rowLabel: {
    color: colors.text,
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    marginRight: 12,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
    marginTop: 4,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
  },
  chip: {
    backgroundColor: colors.surfaceLight,
    borderColor: colors.controlTrack,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  chipText: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '700',
  },
  tutorialButton: {
    alignItems: 'center',
    backgroundColor: '#2A2540',
    borderRadius: 10,
    marginBottom: 12,
    paddingVertical: 12,
  },
  tutorialText: {
    color: colors.gold,
    fontSize: 15,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.75,
  },
});
