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
import {
  PAD_LABEL_MODES,
  PAD_QUANTIZE_MODES,
  PAD_VELOCITY_CURVES,
  type PadLabelMode,
  type PadQuantizeMode,
  type PadVelocityCurve,
  type PadVelocityMode,
} from '../../storage/padsSettingsStorage';
import { RequestSongPrompt } from '../instrument/RequestSongPrompt';
import { colors } from '../../theme/colors';
import { ModalChromeHeader } from '../piano/ModalChromeHeader';

const NOTE_REPEAT_RATES: NoteRepeatRate[] = ['eighth', 'sixteenth'];
const VELOCITY_MODES: PadVelocityMode[] = ['position', 'fixed'];

type PadsSettingsModalProps = {
  visible: boolean;
  labelMode: PadLabelMode;
  strongGuideHighlight: boolean;
  showSpeedHud: boolean;
  noteRepeatEnabled: boolean;
  noteRepeatRate: NoteRepeatRate;
  velocityMode: PadVelocityMode;
  velocityCurve: PadVelocityCurve;
  haptics: boolean;
  padTrail: boolean;
  stageLight: boolean;
  quantize: PadQuantizeMode;
  onChangeLabelMode: (mode: PadLabelMode) => void;
  onChangeStrongGuideHighlight: (value: boolean) => void;
  onChangeShowSpeedHud: (value: boolean) => void;
  onChangeNoteRepeatEnabled: (value: boolean) => void;
  onChangeNoteRepeatRate: (rate: NoteRepeatRate) => void;
  onChangeVelocityMode: (mode: PadVelocityMode) => void;
  onChangeVelocityCurve: (curve: PadVelocityCurve) => void;
  onChangeHaptics: (value: boolean) => void;
  onChangePadTrail: (value: boolean) => void;
  onChangeStageLight: (value: boolean) => void;
  onChangeQuantize: (mode: PadQuantizeMode) => void;
  onStartTutorial: () => void;
  onClose: () => void;
};

type ChipRowProps<T extends string> = {
  options: T[];
  selected: T;
  onSelect: (option: T) => void;
  labelFor: (option: T) => string;
};

function ChipRow<T extends string>({ options, selected, onSelect, labelFor }: ChipRowProps<T>) {
  return (
    <View style={styles.rateRow}>
      {options.map((option) => {
        const isSelected = option === selected;
        return (
          <Pressable
            key={option}
            onPress={() => onSelect(option)}
            style={({ pressed }) => [
              styles.rateChip,
              isSelected && styles.rateChipSelected,
              pressed && styles.pressed,
            ]}
          >
            <Text style={[styles.rateChipText, isSelected && styles.rateChipTextSelected]}>
              {labelFor(option)}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function SwitchRow({
  label,
  value,
  onValueChange,
}: {
  label: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
}) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Switch
        onValueChange={onValueChange}
        thumbColor={value ? colors.accent : '#7A7A7E'}
        trackColor={{ false: '#3A3A3C', true: `${colors.accent}55` }}
        value={value}
      />
    </View>
  );
}

export function PadsSettingsModal({
  visible,
  labelMode,
  strongGuideHighlight,
  showSpeedHud,
  noteRepeatEnabled,
  noteRepeatRate,
  velocityMode,
  velocityCurve,
  haptics,
  padTrail,
  stageLight,
  quantize,
  onChangeLabelMode,
  onChangeStrongGuideHighlight,
  onChangeShowSpeedHud,
  onChangeNoteRepeatEnabled,
  onChangeNoteRepeatRate,
  onChangeVelocityMode,
  onChangeVelocityCurve,
  onChangeHaptics,
  onChangePadTrail,
  onChangeStageLight,
  onChangeQuantize,
  onStartTutorial,
  onClose,
}: PadsSettingsModalProps) {
  const { t } = useTranslation();

  return (
    <Modal animationType="fade" transparent visible={visible} onRequestClose={onClose}>
      {/* The card must NOT be a Pressable: a Pressable ancestor can claim the
          gesture and block the ScrollView's drag. The dismiss area is an
          absolute-fill sibling behind the card instead. */}
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={styles.card}>
          <ModalChromeHeader
            closeLabel={t('pads.settings.close')}
            onClose={onClose}
            title={t('pads.settings.title')}
          />

          <ScrollView
            contentContainerStyle={styles.scrollContent}
            nestedScrollEnabled
            showsVerticalScrollIndicator
            style={styles.scroll}
          >
            <Text style={styles.sectionTitle}>{t('pads.settings.feelSection')}</Text>

            <Text style={styles.subLabel}>{t('pads.settings.velocityMode')}</Text>
            <ChipRow
              labelFor={(option) => t(`pads.settings.velocityModes.${option}`)}
              onSelect={onChangeVelocityMode}
              options={VELOCITY_MODES}
              selected={velocityMode}
            />

            <Text style={styles.subLabel}>{t('pads.settings.velocityCurve')}</Text>
            <ChipRow
              labelFor={(option) => t(`pads.settings.velocityCurves.${option}`)}
              onSelect={onChangeVelocityCurve}
              options={PAD_VELOCITY_CURVES}
              selected={velocityCurve}
            />

            <SwitchRow
              label={t('pads.settings.haptics')}
              onValueChange={onChangeHaptics}
              value={haptics}
            />

            <SwitchRow
              label={t('pads.settings.noteRepeat')}
              onValueChange={onChangeNoteRepeatEnabled}
              value={noteRepeatEnabled}
            />
            <Text style={styles.sectionHint}>{t('pads.settings.noteRepeatHint')}</Text>
            <ChipRow
              labelFor={(option) => t(`pads.settings.noteRepeatRates.${option}`)}
              onSelect={onChangeNoteRepeatRate}
              options={NOTE_REPEAT_RATES}
              selected={noteRepeatRate}
            />

            <Text style={styles.sectionTitle}>{t('pads.settings.looksSection')}</Text>

            <Text style={styles.subLabel}>{t('pads.settings.labelMode')}</Text>
            <ChipRow
              labelFor={(option) => t(`pads.settings.labelModes.${option}`)}
              onSelect={onChangeLabelMode}
              options={PAD_LABEL_MODES}
              selected={labelMode}
            />

            <SwitchRow
              label={t('pads.settings.padTrail')}
              onValueChange={onChangePadTrail}
              value={padTrail}
            />
            <SwitchRow
              label={t('pads.settings.stageLight')}
              onValueChange={onChangeStageLight}
              value={stageLight}
            />
            <SwitchRow
              label={t('pads.settings.strongGuideHighlight')}
              onValueChange={onChangeStrongGuideHighlight}
              value={strongGuideHighlight}
            />
            <SwitchRow
              label={t('pads.settings.showSpeedHud')}
              onValueChange={onChangeShowSpeedHud}
              value={showSpeedHud}
            />

            <Text style={styles.sectionTitle}>{t('pads.settings.looperSection')}</Text>
            <Text style={styles.subLabel}>{t('pads.settings.quantize')}</Text>
            <ChipRow
              labelFor={(option) => t(`pads.settings.quantizeModes.${option}`)}
              onSelect={onChangeQuantize}
              options={PAD_QUANTIZE_MODES}
              selected={quantize}
            />
            <Text style={styles.sectionHint}>{t('pads.settings.quantizeHint')}</Text>

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
  sectionTitle: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.6,
    marginTop: 6,
    textTransform: 'uppercase',
  },
  subLabel: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: -4,
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
