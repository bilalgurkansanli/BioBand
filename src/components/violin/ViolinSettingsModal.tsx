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

import {
  ALL_PHRASE_IDS,
  normalizeVisiblePhraseIds,
  VIOLIN_PHRASES,
  type PhraseId,
} from '../../instruments/violin/violinPhrases';
import { RequestSongPrompt } from '../instrument/RequestSongPrompt';
import { colors } from '../../theme/colors';
import { ModalChromeHeader } from '../piano/ModalChromeHeader';

const PHRASE_ACCENT = '#81C784';

type ViolinSettingsModalProps = {
  visible: boolean;
  showPositionNumbers: boolean;
  strongGuideHighlight: boolean;
  visiblePhraseIds: PhraseId[];
  onChangeShowPositionNumbers: (value: boolean) => void;
  onChangeStrongGuideHighlight: (value: boolean) => void;
  onChangeVisiblePhraseIds: (ids: PhraseId[]) => void;
  onStartTutorial: () => void;
  onClose: () => void;
};

export function ViolinSettingsModal({
  visible,
  showPositionNumbers,
  strongGuideHighlight,
  visiblePhraseIds,
  onChangeShowPositionNumbers,
  onChangeStrongGuideHighlight,
  onChangeVisiblePhraseIds,
  onStartTutorial,
  onClose,
}: ViolinSettingsModalProps) {
  const { t } = useTranslation();
  const visibleSet = new Set(visiblePhraseIds);

  const setVisible = (ids: PhraseId[]) => {
    onChangeVisiblePhraseIds(normalizeVisiblePhraseIds(ids));
  };

  const togglePhrase = (phraseId: PhraseId) => {
    if (visibleSet.has(phraseId)) {
      if (visiblePhraseIds.length <= 1) {
        return;
      }
      setVisible(visiblePhraseIds.filter((id) => id !== phraseId));
      return;
    }
    setVisible([...visiblePhraseIds, phraseId]);
  };

  return (
    <Modal animationType="fade" transparent visible={visible} onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable
          accessibilityRole="button"
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
            <View style={styles.row}>
              <Text style={styles.rowLabel}>
                {t('violin.settings.showPositionNumbers')}
              </Text>
              <Switch
                onValueChange={onChangeShowPositionNumbers}
                thumbColor={showPositionNumbers ? colors.accent : '#7A7A7E'}
                trackColor={{ false: '#3A3A3C', true: `${colors.accent}55` }}
                value={showPositionNumbers}
              />
            </View>

            <View style={styles.row}>
              <Text style={styles.rowLabel}>
                {t('violin.settings.strongGuideHighlight')}
              </Text>
              <Switch
                onValueChange={onChangeStrongGuideHighlight}
                thumbColor={strongGuideHighlight ? colors.accent : '#7A7A7E'}
                trackColor={{ false: '#3A3A3C', true: `${colors.accent}55` }}
                value={strongGuideHighlight}
              />
            </View>

            <Text style={styles.sectionTitle}>{t('violin.settings.visiblePhrases')}</Text>
            <Text style={styles.hint}>{t('violin.settings.visiblePhrasesHint')}</Text>

            <View style={styles.chipRow}>
              {VIOLIN_PHRASES.map((phrase) => {
                const on = visibleSet.has(phrase.id);
                return (
                  <Pressable
                    key={phrase.id}
                    onPress={() => togglePhrase(phrase.id)}
                    style={[
                      styles.chip,
                      on && { backgroundColor: `${PHRASE_ACCENT}33`, borderColor: PHRASE_ACCENT },
                    ]}
                  >
                    <Text style={[styles.chipText, on && { color: PHRASE_ACCENT }]}>
                      {t(phrase.labelKey)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Pressable
              onPress={() => setVisible([...ALL_PHRASE_IDS])}
              style={({ pressed }) => [styles.presetButton, pressed && styles.pressed]}
            >
              <Text style={styles.presetText}>{t('violin.settings.phrasesPresetAll')}</Text>
            </Pressable>

            <Pressable
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
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
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
    maxHeight: 420,
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
  hint: {
    color: colors.textSecondary,
    fontSize: 12,
    marginBottom: 10,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
  },
  chip: {
    backgroundColor: colors.surfaceLight,
    borderColor: '#3A3A3C',
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
  presetButton: {
    alignSelf: 'flex-start',
    backgroundColor: colors.surfaceLight,
    borderRadius: 8,
    marginBottom: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  presetText: {
    color: colors.accent,
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
    color: '#FFD54F',
    fontSize: 15,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.75,
  },
});
