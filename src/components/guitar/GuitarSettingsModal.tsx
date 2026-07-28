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

import {
  GUITAR_CHORD_PLAY_MODES,
  normalizeVisiblePlayModes,
  type GuitarChordPlayMode,
} from '../../instruments/guitar/guitarChordPatterns';
import {
  ALL_GUITAR_CHORD_IDS,
  getChordsByFamily,
  normalizeVisibleChordIds,
  type ChordFamily,
  type ChordId,
} from '../../instruments/guitar/guitarChords';
import {
  GUITAR_FRET_RANGE_OPTIONS,
  GUITAR_STRUM_TIGHTNESS_IDS,
  GUITAR_SUSTAIN_LENGTH_IDS,
  type GuitarFretRange,
  type GuitarStrumTightnessId,
  type GuitarSustainLengthId,
} from '../../instruments/guitar/guitarFeel';
import {
  GUITAR_VELOCITY_CURVE_IDS,
  type GuitarVelocityCurveId,
} from '../../instruments/guitar/guitarVelocity';
import { RequestSongPrompt } from '../instrument/RequestSongPrompt';
import { colors } from '../../theme/colors';
import { ModalChromeHeader } from '../piano/ModalChromeHeader';
import { SCREEN_READER_HIDDEN } from '../../utils/accessibility';

const CHORD_ACCENT = '#81C784';
const MODE_ACCENT = colors.accent;

const FAMILY_ORDER: ChordFamily[] = ['open', 'power', 'barre'];

const FAMILY_LABEL_KEY: Record<ChordFamily, string> = {
  open: 'guitar.chords.groups.open',
  power: 'guitar.chords.groups.power',
  barre: 'guitar.chords.groups.barre',
};

const MODE_LABEL_KEY: Record<GuitarChordPlayMode, string> = {
  strum: 'guitar.playModes.strum',
  arpeggio: 'guitar.playModes.arpeggio',
  rasgueado: 'guitar.playModes.rasgueado',
};

type GuitarSettingsModalProps = {
  visible: boolean;
  showFretNumbers: boolean;
  strongGuideHighlight: boolean;
  haptics: boolean;
  stringAnimation: boolean;
  bendEnabled: boolean;
  velocityCurve: GuitarVelocityCurveId;
  strumTightness: GuitarStrumTightnessId;
  sustainLength: GuitarSustainLengthId;
  maxFret: GuitarFretRange;
  showChordPlayModeBar: boolean;
  visiblePlayModes: GuitarChordPlayMode[];
  visibleChordIds: ChordId[];
  onChangeShowFretNumbers: (value: boolean) => void;
  onChangeStrongGuideHighlight: (value: boolean) => void;
  onChangeHaptics: (value: boolean) => void;
  onChangeStringAnimation: (value: boolean) => void;
  onChangeBendEnabled: (value: boolean) => void;
  onChangeVelocityCurve: (value: GuitarVelocityCurveId) => void;
  onChangeStrumTightness: (value: GuitarStrumTightnessId) => void;
  onChangeSustainLength: (value: GuitarSustainLengthId) => void;
  onChangeMaxFret: (value: GuitarFretRange) => void;
  onChangeShowChordPlayModeBar: (value: boolean) => void;
  onChangeVisiblePlayModes: (modes: GuitarChordPlayMode[]) => void;
  onChangeVisibleChordIds: (ids: ChordId[]) => void;
  onStartTutorial: () => void;
  onClose: () => void;
};

type ChipOption<T> = { value: T; label: string };

function OptionChips<T extends string | number>({
  options,
  selected,
  onSelect,
}: {
  options: ChipOption<T>[];
  selected: T;
  onSelect: (value: T) => void;
}) {
  return (
    <View style={styles.chipWrap}>
      {options.map((option) => {
        const isOn = option.value === selected;
        return (
          <Pressable
            key={String(option.value)}
            onPress={() => onSelect(option.value)}
            style={({ pressed }) => [
              styles.chordChip,
              isOn && styles.modeChipOn,
              pressed && styles.pressed,
            ]}
          >
            <Text style={[styles.chordChipLabel, isOn && styles.modeChipLabelOn]}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function GuitarSettingsModal({
  visible,
  showFretNumbers,
  strongGuideHighlight,
  haptics,
  stringAnimation,
  bendEnabled,
  velocityCurve,
  strumTightness,
  sustainLength,
  maxFret,
  showChordPlayModeBar,
  visiblePlayModes,
  visibleChordIds,
  onChangeShowFretNumbers,
  onChangeStrongGuideHighlight,
  onChangeHaptics,
  onChangeStringAnimation,
  onChangeBendEnabled,
  onChangeVelocityCurve,
  onChangeStrumTightness,
  onChangeSustainLength,
  onChangeMaxFret,
  onChangeShowChordPlayModeBar,
  onChangeVisiblePlayModes,
  onChangeVisibleChordIds,
  onStartTutorial,
  onClose,
}: GuitarSettingsModalProps) {
  const { t } = useTranslation();
  const visibleSet = new Set(visibleChordIds);
  const visibleModeSet = new Set(visiblePlayModes);

  const setVisible = (ids: ChordId[]) => {
    onChangeVisibleChordIds(normalizeVisibleChordIds(ids));
  };

  const setVisibleModes = (modes: GuitarChordPlayMode[]) => {
    onChangeVisiblePlayModes(normalizeVisiblePlayModes(modes));
  };

  const toggleChord = (chordId: ChordId) => {
    if (visibleSet.has(chordId)) {
      if (visibleChordIds.length <= 1) {
        return;
      }
      setVisible(visibleChordIds.filter((id) => id !== chordId));
      return;
    }
    setVisible([...visibleChordIds, chordId]);
  };

  const togglePlayMode = (mode: GuitarChordPlayMode) => {
    if (visibleModeSet.has(mode)) {
      if (visiblePlayModes.length <= 1) {
        return;
      }
      setVisibleModes(visiblePlayModes.filter((id) => id !== mode));
      return;
    }
    setVisibleModes([...visiblePlayModes, mode]);
  };

  const selectAll = () => setVisible([...ALL_GUITAR_CHORD_IDS]);
  const selectOpen = () =>
    setVisible(getChordsByFamily('open').map((chord) => chord.id));
  const selectRock = () =>
    setVisible([
      ...getChordsByFamily('power').map((chord) => chord.id),
      ...getChordsByFamily('barre').map((chord) => chord.id),
    ]);

  return (
    <Modal
      supportedOrientations={MODAL_ORIENTATIONS} animationType="fade" transparent visible={visible} onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable
          {...SCREEN_READER_HIDDEN}
          onPress={onClose}
          style={styles.backdrop}
        />
        <View style={styles.card}>
          <ModalChromeHeader
            closeLabel={t('guitar.settings.close')}
            onClose={onClose}
            title={t('guitar.settings.title')}
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

            <View style={styles.row}>
              <Text style={styles.rowLabel}>{t('guitar.settings.haptics')}</Text>
              <Switch
                onValueChange={onChangeHaptics}
                thumbColor={haptics ? colors.accent : '#7A7A7E'}
                trackColor={{ false: '#3A3A3C', true: `${colors.accent}55` }}
                value={haptics}
              />
            </View>

            <View style={styles.row}>
              <Text style={styles.rowLabel}>
                {t('guitar.settings.stringAnimation')}
              </Text>
              <Switch
                onValueChange={onChangeStringAnimation}
                thumbColor={stringAnimation ? colors.accent : '#7A7A7E'}
                trackColor={{ false: '#3A3A3C', true: `${colors.accent}55` }}
                value={stringAnimation}
              />
            </View>

            <View style={styles.chordSection}>
              <Text style={styles.sectionTitle}>
                {t('guitar.settings.playingTitle')}
              </Text>

              <View style={styles.row}>
                <Text style={styles.rowLabel}>{t('guitar.settings.bend')}</Text>
                <Switch
                  onValueChange={onChangeBendEnabled}
                  thumbColor={bendEnabled ? colors.accent : '#7A7A7E'}
                  trackColor={{ false: '#3A3A3C', true: `${colors.accent}55` }}
                  value={bendEnabled}
                />
              </View>
              <Text style={styles.sectionHint}>{t('guitar.settings.bendHint')}</Text>

              <Text style={styles.familyLabel}>
                {t('guitar.settings.velocityCurve')}
              </Text>
              <OptionChips
                onSelect={onChangeVelocityCurve}
                options={GUITAR_VELOCITY_CURVE_IDS.map((id) => ({
                  value: id,
                  label: t(`guitar.settings.velocityCurves.${id}`),
                }))}
                selected={velocityCurve}
              />

              <Text style={styles.familyLabel}>{t('guitar.settings.strumFeel')}</Text>
              <OptionChips
                onSelect={onChangeStrumTightness}
                options={GUITAR_STRUM_TIGHTNESS_IDS.map((id) => ({
                  value: id,
                  label: t(`guitar.settings.strumFeels.${id}`),
                }))}
                selected={strumTightness}
              />

              <Text style={styles.familyLabel}>
                {t('guitar.settings.sustainLength')}
              </Text>
              <OptionChips
                onSelect={onChangeSustainLength}
                options={GUITAR_SUSTAIN_LENGTH_IDS.map((id) => ({
                  value: id,
                  label: t(`guitar.settings.sustainLengths.${id}`),
                }))}
                selected={sustainLength}
              />

              <Text style={styles.familyLabel}>{t('guitar.settings.fretRange')}</Text>
              <OptionChips
                onSelect={onChangeMaxFret}
                options={GUITAR_FRET_RANGE_OPTIONS.map((value) => ({
                  value,
                  label: `0–${value}`,
                }))}
                selected={maxFret}
              />
            </View>

            <View style={styles.chordSection}>
              <Text style={styles.sectionTitle}>
                {t('guitar.settings.playModesTitle')}
              </Text>
              <Text style={styles.sectionHint}>
                {t('guitar.settings.playModesHint')}
              </Text>

              <View style={styles.row}>
                <Text style={styles.rowLabel}>
                  {t('guitar.settings.showPlayModeBar')}
                </Text>
                <Switch
                  onValueChange={onChangeShowChordPlayModeBar}
                  thumbColor={showChordPlayModeBar ? colors.accent : '#7A7A7E'}
                  trackColor={{ false: '#3A3A3C', true: `${colors.accent}55` }}
                  value={showChordPlayModeBar}
                />
              </View>

              <View style={styles.chipWrap}>
                {GUITAR_CHORD_PLAY_MODES.map((mode) => {
                  const isOn = visibleModeSet.has(mode);
                  return (
                    <Pressable
                      key={mode}
                      onPress={() => togglePlayMode(mode)}
                      style={({ pressed }) => [
                        styles.chordChip,
                        isOn && styles.modeChipOn,
                        pressed && styles.pressed,
                      ]}
                    >
                      <Text
                        style={[
                          styles.chordChipLabel,
                          isOn && styles.modeChipLabelOn,
                        ]}
                      >
                        {t(MODE_LABEL_KEY[mode])}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <View style={styles.chordSection}>
              <Text style={styles.sectionTitle}>
                {t('guitar.settings.visibleChords')}
              </Text>
              <Text style={styles.sectionHint}>
                {t('guitar.settings.visibleChordsHint')}
              </Text>

              <View style={styles.presetRow}>
                <Pressable
                  onPress={selectAll}
                  style={({ pressed }) => [styles.presetChip, pressed && styles.pressed]}
                >
                  <Text style={styles.presetChipText}>
                    {t('guitar.settings.chordsPresetAll')}
                  </Text>
                </Pressable>
                <Pressable
                  onPress={selectOpen}
                  style={({ pressed }) => [styles.presetChip, pressed && styles.pressed]}
                >
                  <Text style={styles.presetChipText}>
                    {t('guitar.settings.chordsPresetOpen')}
                  </Text>
                </Pressable>
                <Pressable
                  onPress={selectRock}
                  style={({ pressed }) => [styles.presetChip, pressed && styles.pressed]}
                >
                  <Text style={styles.presetChipText}>
                    {t('guitar.settings.chordsPresetRock')}
                  </Text>
                </Pressable>
              </View>

              {FAMILY_ORDER.map((family) => {
                const familyChords = getChordsByFamily(family);
                if (familyChords.length === 0) {
                  return null;
                }
                return (
                  <View key={family} style={styles.familyBlock}>
                    <Text style={styles.familyLabel}>{t(FAMILY_LABEL_KEY[family])}</Text>
                    <View style={styles.chipWrap}>
                      {familyChords.map((chord) => {
                        const isOn = visibleSet.has(chord.id);
                        return (
                          <Pressable
                            key={chord.id}
                            onPress={() => toggleChord(chord.id)}
                            style={({ pressed }) => [
                              styles.chordChip,
                              isOn && styles.chordChipOn,
                              pressed && styles.pressed,
                            ]}
                          >
                            <Text
                              style={[
                                styles.chordChipLabel,
                                isOn && styles.chordChipLabelOn,
                              ]}
                            >
                              {t(chord.labelKey)}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  </View>
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
                {t('guitar.settings.startTutorial')}
              </Text>
            </Pressable>

            <RequestSongPrompt
              messageKey="guitar.game.requestSong"
              openFailedKey="guitar.game.requestSongOpenFailed"
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
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 16,
    borderWidth: 1,
    flexShrink: 1,
    maxHeight: '90%',
    maxWidth: 420,
    paddingBottom: 16,
    paddingHorizontal: 16,
    paddingTop: 8,
    width: '100%',
    zIndex: 1,
  },
  scroll: {
    flexGrow: 0,
    flexShrink: 1,
  },
  scrollContent: {
    flexGrow: 0,
    gap: 12,
    paddingBottom: 12,
    paddingTop: 8,
  },
  row: {
    alignItems: 'center',
    backgroundColor: colors.surfaceLight,
    borderColor: colors.border,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 44,
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
  chordSection: {
    gap: 10,
    paddingTop: 4,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
  },
  sectionHint: {
    color: colors.textSecondary,
    fontSize: 12,
    lineHeight: 16,
  },
  presetRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  presetChip: {
    backgroundColor: colors.surfaceLight,
    borderColor: colors.border,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  presetChipText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
  },
  familyBlock: {
    gap: 8,
  },
  familyLabel: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chordChip: {
    backgroundColor: colors.surfaceLight,
    borderColor: colors.border,
    borderRadius: 10,
    borderWidth: 1,
    minWidth: 52,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  chordChipOn: {
    borderColor: CHORD_ACCENT,
    borderWidth: 2,
  },
  modeChipOn: {
    borderColor: MODE_ACCENT,
    borderWidth: 2,
  },
  chordChipLabel: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
  },
  chordChipLabelOn: {
    color: CHORD_ACCENT,
  },
  modeChipLabelOn: {
    color: MODE_ACCENT,
  },
  tutorialButton: {
    alignItems: 'center',
    backgroundColor: '#2A2540',
    borderColor: '#FFD54F55',
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 4,
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
