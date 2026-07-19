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
import { PIANO_KEY_THEME_IDS } from '../../instruments/piano/pianoKeyThemes';
import type {
  PianoChordMode,
  PianoKeyThemeId,
  PianoLabelMode,
  PianoScaleLockMode,
} from '../../storage/pianoSettingsStorage';
import { RequestSongPrompt } from '../instrument/RequestSongPrompt';
import { colors } from '../../theme/colors';
import { ModalChromeHeader } from './ModalChromeHeader';

const SCALE_ACCENT = '#81C784';

type ChipOption<T extends string> = { id: T; label: string };

function ChipGroup<T extends string>({
  title,
  hint,
  value,
  options,
  onSelect,
}: {
  title: string;
  hint?: string;
  value: T | null;
  options: ChipOption<T>[];
  onSelect: (id: T) => void;
}) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {hint ? <Text style={styles.sectionHint}>{hint}</Text> : null}
      <View style={styles.chipRow}>
        {options.map((option) => {
          const selected = option.id === value;
          return (
            <Pressable
              key={option.id}
              onPress={() => onSelect(option.id)}
              style={({ pressed }) => [
                styles.chip,
                selected && styles.chipSelected,
                pressed && styles.pressed,
              ]}
            >
              <Text
                numberOfLines={1}
                style={[styles.chipText, selected && styles.chipTextSelected]}
              >
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

type PianoSettingsModalProps = {
  visible: boolean;
  showTonePanel: boolean;
  showSpeedHud: boolean;
  scaleId: PianoScaleId | null;
  /** Last non-null scale — restored when scale lights are turned back on. */
  lastScaleId: PianoScaleId;
  labelMode: PianoLabelMode;
  keyTheme: PianoKeyThemeId;
  haptics: boolean;
  scaleLock: PianoScaleLockMode;
  chordMode: PianoChordMode;
  onChangeShowTonePanel: (value: boolean) => void;
  onChangeShowSpeedHud: (value: boolean) => void;
  onChangeScaleId: (scaleId: PianoScaleId | null) => void;
  onChangeLabelMode: (mode: PianoLabelMode) => void;
  onChangeKeyTheme: (theme: PianoKeyThemeId) => void;
  onChangeHaptics: (value: boolean) => void;
  onChangeScaleLock: (mode: PianoScaleLockMode) => void;
  onChangeChordMode: (mode: PianoChordMode) => void;
  onStartTutorial: () => void;
  onClose: () => void;
};

export function PianoSettingsModal({
  visible,
  showTonePanel,
  showSpeedHud,
  scaleId,
  lastScaleId,
  labelMode,
  keyTheme,
  haptics,
  scaleLock,
  chordMode,
  onChangeShowTonePanel,
  onChangeShowSpeedHud,
  onChangeScaleId,
  onChangeLabelMode,
  onChangeKeyTheme,
  onChangeHaptics,
  onChangeScaleLock,
  onChangeChordMode,
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
            keyboardShouldPersistTaps="handled"
            nestedScrollEnabled
            showsVerticalScrollIndicator
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
              <Text style={styles.rowLabel}>{t('piano.settings.haptics')}</Text>
              <Switch
                onValueChange={onChangeHaptics}
                thumbColor={haptics ? colors.accent : '#7A7A7E'}
                trackColor={{ false: '#3A3A3C', true: `${colors.accent}55` }}
                value={haptics}
              />
            </View>

            <ChipGroup
              onSelect={onChangeChordMode}
              options={(['off', 'major', 'minor', 'auto'] as PianoChordMode[]).map(
                (id) => ({ id, label: t(`piano.chord.${id}`) }),
              )}
              title={t('piano.settings.chordTitle')}
              value={chordMode}
            />

            <ChipGroup
              onSelect={onChangeLabelMode}
              options={(['both', 'letter', 'solfege', 'none'] as PianoLabelMode[]).map(
                (id) => ({ id, label: t(`piano.labelMode.${id}`) }),
              )}
              title={t('piano.settings.labelModeTitle')}
              value={labelMode}
            />

            <ChipGroup
              onSelect={onChangeKeyTheme}
              options={PIANO_KEY_THEME_IDS.map((id) => ({
                id,
                label: t(`piano.keyTheme.${id}`),
              }))}
              title={t('piano.settings.keyThemeTitle')}
              value={keyTheme}
            />

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
              <>
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

                <ChipGroup
                  onSelect={onChangeScaleLock}
                  options={(['off', 'mute', 'snap'] as PianoScaleLockMode[]).map(
                    (id) => ({ id, label: t(`piano.scaleLock.${id}`) }),
                  )}
                  title={t('piano.settings.scaleLockTitle')}
                  value={scaleLock}
                />
              </>
            ) : scaleLock !== 'off' ? (
              <Text style={styles.sectionHint}>
                {t('piano.settings.scaleLockHint')}
              </Text>
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
    // Let the ScrollView shrink within the card's maxHeight so its own frame
    // is smaller than the content — that is what makes it actually scroll.
    flexShrink: 1,
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
  section: {
    gap: 8,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '600',
  },
  sectionHint: {
    color: colors.textSecondary,
    fontSize: 12,
    lineHeight: 16,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    backgroundColor: colors.surfaceLight,
    borderColor: colors.border,
    borderRadius: 10,
    borderWidth: 1,
    flexGrow: 1,
    minWidth: '22%',
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  chipSelected: {
    backgroundColor: `${colors.accent}22`,
    borderColor: colors.accent,
  },
  chipText: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
  },
  chipTextSelected: {
    color: colors.accent,
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
