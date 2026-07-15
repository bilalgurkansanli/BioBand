import { Ionicons } from '@expo/vector-icons';
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';

import { colors } from '../../theme/colors';
import {
  getStoreDisplayName,
  openStoreReview,
} from '../../utils/openStoreReview';
import { ModalChromeHeader } from '../piano/ModalChromeHeader';

type GuitarSettingsModalProps = {
  visible: boolean;
  showFretNumbers: boolean;
  strongGuideHighlight: boolean;
  onChangeShowFretNumbers: (value: boolean) => void;
  onChangeStrongGuideHighlight: (value: boolean) => void;
  onStartTutorial: () => void;
  onClose: () => void;
};

export function GuitarSettingsModal({
  visible,
  showFretNumbers,
  strongGuideHighlight,
  onChangeShowFretNumbers,
  onChangeStrongGuideHighlight,
  onStartTutorial,
  onClose,
}: GuitarSettingsModalProps) {
  const { t } = useTranslation();

  return (
    <Modal animationType="fade" transparent visible={visible} onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.card} onPress={() => {}}>
          <ModalChromeHeader
            closeLabel={t('guitar.settings.close')}
            onClose={onClose}
            title={t('guitar.settings.title')}
          />

          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            style={styles.scroll}
          >
            <View style={styles.row}>
              <Text style={styles.rowLabel}>{t('guitar.settings.showFretNumbers')}</Text>
              <Switch
                onValueChange={onChangeShowFretNumbers}
                thumbColor={showFretNumbers ? colors.accent : '#7A7A7E'}
                trackColor={{ false: '#3A3A3C', true: `${colors.accent}55` }}
                value={showFretNumbers}
              />
            </View>

            <View style={styles.row}>
              <Text style={styles.rowLabel}>
                {t('guitar.settings.strongGuideHighlight')}
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
                {t('guitar.settings.startTutorial')}
              </Text>
            </Pressable>

            <Pressable
              accessibilityRole="link"
              onPress={() => {
                void openStoreReview().catch(() => {
                  Alert.alert(t('guitar.game.requestSongOpenFailed'));
                });
              }}
              style={({ pressed }) => [
                styles.requestSongButton,
                pressed && styles.pressed,
              ]}
            >
              <Ionicons
                color={colors.accent}
                name="chatbubble-ellipses-outline"
                size={16}
              />
              <Text style={styles.requestSongText}>
                {t('guitar.game.requestSong', {
                  store: getStoreDisplayName(),
                })}
              </Text>
            </Pressable>
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
    maxHeight: 360,
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
  requestSongButton: {
    alignItems: 'flex-start',
    backgroundColor: `${colors.accent}12`,
    borderColor: `${colors.accent}44`,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  requestSongText: {
    color: colors.textSecondary,
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
  },
  pressed: {
    opacity: 0.75,
  },
});
