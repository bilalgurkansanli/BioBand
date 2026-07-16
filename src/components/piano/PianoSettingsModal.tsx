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
  PIANO_SCALE_OPTIONS,
  type PianoScaleId,
} from '../../instruments/piano/pianoScales';
import { RequestSongPrompt } from '../instrument/RequestSongPrompt';
import { colors } from '../../theme/colors';
import { ModalChromeHeader } from './ModalChromeHeader';

const SCALE_ACCENT = '#81C784';

type PianoSettingsModalProps = {
  visible: boolean;
  showTonePanel: boolean;
  showSpeedHud: boolean;
  scaleId: PianoScaleId | null;
  /** Last non-null scale — restored when scale lights are turned back on. */
  lastScaleId: PianoScaleId;
  onChangeShowTonePanel: (value: boolean) => void;
  onChangeShowSpeedHud: (value: boolean) => void;
  onChangeScaleId: (scaleId: PianoScaleId | null) => void;
  onStartTutorial: () => void;
  onClose: () => void;
};

export function PianoSettingsModal({
  visible,
  showTonePanel,
  showSpeedHud,
  scaleId,
  lastScaleId,
  onChangeShowTonePanel,
  onChangeShowSpeedHud,
  onChangeScaleId,
  onStartTutorial,
  onClose,
}: PianoSettingsModalProps) {
  const { t } = useTranslation();
  const scaleLightsOn = scaleId !== null;

  return (
    <Modal animationType="fade" transparent visible={visible} onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.card} onPress={() => {}}>
          <ModalChromeHeader
            closeLabel={t('piano.settings.close')}
            onClose={onClose}
            title={t('piano.settings.title')}
          />

          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            style={styles.scroll}
          >
            <View style={styles.row}>
              <Text style={styles.rowLabel}>{t('piano.settings.tonePanel')}</Text>
              <Switch
                onValueChange={onChangeShowTonePanel}
                thumbColor={showTonePanel ? colors.accent : '#7A7A7E'}
                trackColor={{ false: '#3A3A3C', true: `${colors.accent}55` }}
                value={showTonePanel}
              />
            </View>

            <View style={styles.row}>
              <Text style={styles.rowLabel}>{t('piano.settings.speedHud')}</Text>
              <Switch
                onValueChange={onChangeShowSpeedHud}
                thumbColor={showSpeedHud ? colors.accent : '#7A7A7E'}
                trackColor={{ false: '#3A3A3C', true: `${colors.accent}55` }}
                value={showSpeedHud}
              />
            </View>

            <View style={styles.row}>
              <Text style={styles.rowLabel}>{t('piano.settings.scaleLights')}</Text>
              <Switch
                onValueChange={(on) => {
                  onChangeScaleId(on ? lastScaleId : null);
                }}
                thumbColor={scaleLightsOn ? SCALE_ACCENT : '#7A7A7E'}
                trackColor={{ false: '#3A3A3C', true: `${SCALE_ACCENT}55` }}
                value={scaleLightsOn}
              />
            </View>

            {scaleLightsOn ? (
              <View style={styles.scaleList}>
                <Text style={styles.scaleHint}>{t('piano.settings.scalePick')}</Text>
                {PIANO_SCALE_OPTIONS.map((scale) => {
                  const isSelected = scale.id === scaleId;
                  return (
                    <Pressable
                      key={scale.id}
                      onPress={() => onChangeScaleId(scale.id)}
                      style={({ pressed }) => [
                        styles.scaleItem,
                        isSelected && styles.scaleItemSelected,
                        pressed && styles.pressed,
                      ]}
                    >
                      <Text
                        style={[
                          styles.scaleItemLabel,
                          isSelected && styles.scaleItemLabelSelected,
                        ]}
                      >
                        {t(scale.labelKey)}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            ) : null}

            <Pressable
              onPress={() => {
                onClose();
                onStartTutorial();
              }}
              style={({ pressed }) => [styles.tutorialButton, pressed && styles.pressed]}
            >
              <Text style={styles.tutorialButtonText}>
                {t('piano.settings.startTutorial')}
              </Text>
            </Pressable>

            <RequestSongPrompt
              messageKey="piano.game.requestSong"
              openFailedKey="piano.game.requestSongOpenFailed"
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
    borderColor: colors.border,
    borderRadius: 16,
    borderWidth: 1,
    maxHeight: '90%',
    maxWidth: 420,
    paddingHorizontal: 18,
    paddingVertical: 16,
    width: '100%',
  },
  scroll: {
    flexGrow: 0,
  },
  scrollContent: {
    gap: 10,
    paddingBottom: 4,
  },
  row: {
    alignItems: 'center',
    backgroundColor: colors.surfaceLight,
    borderColor: colors.border,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  rowLabel: {
    color: colors.text,
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    marginRight: 12,
  },
  scaleList: {
    gap: 6,
    paddingHorizontal: 2,
  },
  scaleHint: {
    color: colors.textSecondary,
    fontSize: 12,
    marginBottom: 2,
  },
  scaleItem: {
    backgroundColor: colors.surfaceLight,
    borderColor: colors.border,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  scaleItemSelected: {
    borderColor: SCALE_ACCENT,
    borderWidth: 2,
  },
  scaleItemLabel: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  scaleItemLabelSelected: {
    color: SCALE_ACCENT,
  },
  tutorialButton: {
    alignItems: 'center',
    backgroundColor: `${colors.accent}22`,
    borderColor: colors.accent,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 4,
    paddingVertical: 12,
  },
  tutorialButtonText: {
    color: colors.accent,
    fontSize: 15,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.75,
  },
});
