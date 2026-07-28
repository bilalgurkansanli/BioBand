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
import { useTranslation } from 'react-i18next';

import { RequestSongPrompt } from '../instrument/RequestSongPrompt';
import { colors } from '../../theme/colors';
import { ModalChromeHeader } from '../piano/ModalChromeHeader';
import { SCREEN_READER_HIDDEN } from '../../utils/accessibility';

export type DrumsAmbienceId = 'dry' | 'garage' | 'studio' | 'arena';

export const PAD_SCALE_OPTIONS = [
  { id: 'small', value: 0.9, labelKey: 'drums.settings.padSizeSmall' },
  { id: 'normal', value: 1, labelKey: 'drums.settings.padSizeNormal' },
  { id: 'large', value: 1.15, labelKey: 'drums.settings.padSizeLarge' },
] as const;

const AMBIENCE_OPTIONS: { id: DrumsAmbienceId; labelKey: string }[] = [
  { id: 'dry', labelKey: 'drums.settings.ambienceDry' },
  { id: 'garage', labelKey: 'drums.settings.ambienceGarage' },
  { id: 'studio', labelKey: 'drums.settings.ambienceStudio' },
  { id: 'arena', labelKey: 'drums.settings.ambienceArena' },
];

type DrumsSettingsModalProps = {
  visible: boolean;
  showPadLabels: boolean;
  strongGuideHighlight: boolean;
  haptics: boolean;
  padScale: number;
  /** Which ambience preset the current FX mix matches (null = custom). */
  activeAmbience: DrumsAmbienceId | null;
  onChangeShowPadLabels: (value: boolean) => void;
  onChangeStrongGuideHighlight: (value: boolean) => void;
  onChangeHaptics: (value: boolean) => void;
  onChangePadScale: (scale: number) => void;
  onApplyAmbience: (preset: DrumsAmbienceId) => void;
  onStartTutorial: () => void;
  onClose: () => void;
};

export function DrumsSettingsModal({
  visible,
  showPadLabels,
  strongGuideHighlight,
  haptics,
  padScale,
  activeAmbience,
  onChangeShowPadLabels,
  onChangeStrongGuideHighlight,
  onChangeHaptics,
  onChangePadScale,
  onApplyAmbience,
  onStartTutorial,
  onClose,
}: DrumsSettingsModalProps) {
  const { t } = useTranslation();

  return (
    <Modal
      supportedOrientations={MODAL_ORIENTATIONS} animationType="fade" transparent visible={visible} onRequestClose={onClose}>
      {/* The card must NOT be a Pressable: a Pressable ancestor can claim the
          gesture and block the ScrollView's drag. The dismiss area is an
          absolute-fill sibling behind the card instead. */}
      <View style={styles.overlay}>
        <Pressable
          {...SCREEN_READER_HIDDEN}
          style={StyleSheet.absoluteFill}
          onPress={onClose}
        />
        <View style={styles.card}>
          <ModalChromeHeader
            closeLabel={t('drums.settings.close')}
            onClose={onClose}
            title={t('drums.settings.title')}
          />

          <ScrollView
            contentContainerStyle={styles.scrollContent}
            nestedScrollEnabled
            showsVerticalScrollIndicator
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

            <View style={styles.row}>
              <Text style={styles.rowLabel}>{t('drums.settings.haptics')}</Text>
              <Switch
                onValueChange={onChangeHaptics}
                thumbColor={haptics ? colors.accent : '#7A7A7E'}
                trackColor={{ false: '#3A3A3C', true: `${colors.accent}55` }}
                value={haptics}
              />
            </View>

            <Text style={styles.groupLabel}>{t('drums.settings.padSize')}</Text>
            <View style={styles.chipRow}>
              {PAD_SCALE_OPTIONS.map((option) => {
                const active = Math.abs(padScale - option.value) < 0.01;
                return (
                  <Pressable
                    key={option.id}
                    onPress={() => onChangePadScale(option.value)}
                    style={({ pressed }) => [
                      styles.chip,
                      active && styles.chipActive,
                      pressed && styles.pressed,
                    ]}
                  >
                    <Text style={[styles.chipText, active && styles.chipTextActive]}>
                      {t(option.labelKey)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Text style={styles.groupLabel}>{t('drums.settings.ambience')}</Text>
            <View style={styles.chipRow}>
              {AMBIENCE_OPTIONS.map((option) => {
                const active = activeAmbience === option.id;
                return (
                  <Pressable
                    key={option.id}
                    onPress={() => onApplyAmbience(option.id)}
                    style={({ pressed }) => [
                      styles.chip,
                      active && styles.chipActive,
                      pressed && styles.pressed,
                    ]}
                  >
                    <Text style={[styles.chipText, active && styles.chipTextActive]}>
                      {t(option.labelKey)}
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
                {t('drums.settings.startTutorial')}
              </Text>
            </Pressable>

            <RequestSongPrompt
              messageKey="drums.game.requestSong"
              openFailedKey="drums.game.requestSongOpenFailed"
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
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    maxHeight: '85%',
    maxWidth: 420,
    paddingBottom: 16,
    paddingHorizontal: 16,
    paddingTop: 8,
    width: '100%',
  },
  scroll: {
    // Let the card's maxHeight bound it — a fixed height here made the list
    // unscrollable when the window was shorter than the cap (landscape).
    flexGrow: 0,
    flexShrink: 1,
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
  groupLabel: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '700',
    marginTop: 4,
    textTransform: 'uppercase',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    backgroundColor: colors.surfaceLight,
    borderColor: colors.border,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  chipActive: {
    backgroundColor: `${colors.accent}22`,
    borderColor: colors.accent,
  },
  chipText: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  chipTextActive: {
    color: colors.accent,
  },
});
