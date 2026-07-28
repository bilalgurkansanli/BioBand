import Ionicons from '@expo/vector-icons/Ionicons';
import { Modal, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { MODAL_ORIENTATIONS } from '../modalOrientations';
import { useTranslation } from 'react-i18next';

import {
  STEP_COUNT_OPTIONS,
  type StepCount,
} from '../../instruments/drumMachine/drumMachineRows';
import { DRUM_KITS, type DrumKitId } from '../../instruments/drums/drumsKits';
import {
  SAVE_LOOP_OPTIONS,
  SWING_OPTIONS,
  type SaveLoopCount,
  type SwingAmount,
} from '../../storage/drumMachineSettingsStorage';
import { colors } from '../../theme/colors';

type Props = {
  visible: boolean;
  accent: string;
  /** Kit picker only makes sense for the drums bank. */
  showKit: boolean;
  previewOnToggle: boolean;
  saveLoops: SaveLoopCount;
  swing: SwingAmount;
  stepCount: StepCount;
  metronomeOn: boolean;
  countInOn: boolean;
  hapticsOn: boolean;
  drumKitId: DrumKitId;
  onClose: () => void;
  onSetPreviewOnToggle: (next: boolean) => void;
  onSetSaveLoops: (next: SaveLoopCount) => void;
  onSetSwing: (next: SwingAmount) => void;
  onSetStepCount: (next: StepCount) => void;
  onSetMetronomeOn: (next: boolean) => void;
  onSetCountInOn: (next: boolean) => void;
  onSetHapticsOn: (next: boolean) => void;
  onSetDrumKitId: (next: DrumKitId) => void;
  onResetDefaults: () => void;
};

const SWING_LABEL_KEYS = [
  'drumMachine.swingOff',
  'drumMachine.swingLight',
  'drumMachine.swingMedium',
  'drumMachine.swingHeavy',
] as const;

function SwitchRow({
  accent,
  label,
  hint,
  value,
  onChange,
}: {
  accent: string;
  label: string;
  hint: string;
  value: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <View style={styles.settingRow}>
      <View style={styles.settingText}>
        <Text style={styles.settingLabel}>{label}</Text>
        <Text style={styles.settingHint}>{hint}</Text>
      </View>
      <Switch
        onValueChange={onChange}
        thumbColor={value ? accent : colors.textSecondary}
        trackColor={{ false: colors.surfaceLight, true: `${accent}66` }}
        value={value}
      />
    </View>
  );
}

function SegmentGroup<T extends string | number>({
  accent,
  title,
  hint,
  options,
  selected,
  onSelect,
}: {
  accent: string;
  title: string;
  hint?: string;
  options: { value: T; label: string }[];
  selected: T;
  onSelect: (value: T) => void;
}) {
  return (
    <View style={styles.settingBlock}>
      <Text style={styles.settingLabel}>{title}</Text>
      {hint ? <Text style={styles.settingHint}>{hint}</Text> : null}
      <View style={styles.segmentRow}>
        {options.map((option) => {
          const active = option.value === selected;
          return (
            <Pressable
              key={String(option.value)}
              onPress={() => onSelect(option.value)}
              style={[
                styles.segment,
                active && { backgroundColor: accent, borderColor: accent },
              ]}
            >
              <Text style={[styles.segmentText, active && styles.segmentTextActive]}>
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export function DrumMachineSettingsModal({
  visible,
  accent,
  showKit,
  previewOnToggle,
  saveLoops,
  swing,
  stepCount,
  metronomeOn,
  countInOn,
  hapticsOn,
  drumKitId,
  onClose,
  onSetPreviewOnToggle,
  onSetSaveLoops,
  onSetSwing,
  onSetStepCount,
  onSetMetronomeOn,
  onSetCountInOn,
  onSetHapticsOn,
  onSetDrumKitId,
  onResetDefaults,
}: Props) {
  const { t } = useTranslation();

  return (
    <Modal
      supportedOrientations={MODAL_ORIENTATIONS} animationType="fade" transparent visible={visible} onRequestClose={onClose}>
      <Pressable onPress={onClose} style={styles.backdrop}>
        {/* Swallows taps so touching the card itself never closes it. */}
        <Pressable onPress={() => {}} style={styles.card}>
          <View style={styles.header}>
            <Text style={styles.title}>{t('drumMachine.settingsTitle')}</Text>
            <Pressable
              accessibilityLabel={t('common.close')}
              hitSlop={8}
              onPress={onClose}
              style={({ pressed }) => [styles.closeBtn, pressed && styles.closePressed]}
            >
              <Ionicons color="#FFFFFF" name="close" size={18} />
            </Pressable>
          </View>
          <ScrollView
            showsVerticalScrollIndicator={false}
            style={styles.scroll}
          >
            <SegmentGroup
              accent={accent}
              title={t('drumMachine.swingTitle')}
              hint={t('drumMachine.swingHint')}
              options={SWING_OPTIONS.map((value, index) => ({
                value,
                label: t(SWING_LABEL_KEYS[index]),
              }))}
              selected={swing}
              onSelect={onSetSwing}
            />

            <SegmentGroup
              accent={accent}
              title={t('drumMachine.stepCountTitle')}
              hint={t('drumMachine.stepCountHint')}
              options={STEP_COUNT_OPTIONS.map((value) => ({
                value,
                label: String(value),
              }))}
              selected={stepCount}
              onSelect={onSetStepCount}
            />

            {showKit ? (
              <View style={styles.settingBlock}>
                <Text style={styles.settingLabel}>{t('drumMachine.kitTitle')}</Text>
                <Text style={styles.settingHint}>{t('drumMachine.kitHint')}</Text>
                <View style={styles.kitWrap}>
                  {DRUM_KITS.map((kit) => {
                    const active = kit.id === drumKitId;
                    return (
                      <Pressable
                        key={kit.id}
                        onPress={() => onSetDrumKitId(kit.id)}
                        style={[
                          styles.kitChip,
                          active && { backgroundColor: accent, borderColor: accent },
                        ]}
                      >
                        <Text
                          style={[styles.segmentText, active && styles.segmentTextActive]}
                        >
                          {t(kit.labelKey)}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            ) : null}

            <SwitchRow
              accent={accent}
              label={t('drumMachine.metronomeTitle')}
              hint={t('drumMachine.metronomeHint')}
              value={metronomeOn}
              onChange={onSetMetronomeOn}
            />

            <SwitchRow
              accent={accent}
              label={t('drumMachine.countInTitle')}
              hint={t('drumMachine.countInHint')}
              value={countInOn}
              onChange={onSetCountInOn}
            />

            <SwitchRow
              accent={accent}
              label={t('drumMachine.previewToggle')}
              hint={t('drumMachine.previewToggleHint')}
              value={previewOnToggle}
              onChange={onSetPreviewOnToggle}
            />

            <SwitchRow
              accent={accent}
              label={t('drumMachine.hapticsTitle')}
              hint={t('drumMachine.hapticsHint')}
              value={hapticsOn}
              onChange={onSetHapticsOn}
            />

            <SegmentGroup
              accent={accent}
              title={t('drumMachine.saveLoopsTitle')}
              hint={t('drumMachine.saveLoopsHint')}
              options={SAVE_LOOP_OPTIONS.map((value) => ({
                value,
                label: t('drumMachine.saveLoopsOption', { count: value }),
              }))}
              selected={saveLoops}
              onSelect={onSetSaveLoops}
            />

            <Pressable
              onPress={onResetDefaults}
              style={({ pressed }) => [styles.resetBtn, pressed && { opacity: 0.7 }]}
            >
              <Ionicons color={colors.textSecondary} name="refresh-outline" size={16} />
              <Text style={styles.resetText}>{t('drumMachine.resetDefaults')}</Text>
            </Pressable>
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.55)',
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 14,
    borderWidth: 1,
    maxHeight: '92%',
    maxWidth: 420,
    padding: 18,
    width: '100%',
  },
  scroll: {
    flexGrow: 0,
    flexShrink: 1,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  title: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '700',
  },
  closeBtn: {
    alignItems: 'center',
    backgroundColor: colors.error,
    borderRadius: 14,
    height: 28,
    justifyContent: 'center',
    width: 28,
  },
  closePressed: {
    opacity: 0.75,
  },
  settingRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  settingText: {
    flex: 1,
  },
  settingBlock: {
    marginBottom: 16,
  },
  settingLabel: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '600',
  },
  settingHint: {
    color: colors.textSecondary,
    fontSize: 12,
    lineHeight: 16,
    marginTop: 2,
  },
  segmentRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  segment: {
    alignItems: 'center',
    backgroundColor: colors.surfaceLight,
    borderColor: colors.border,
    borderRadius: 10,
    borderWidth: 1,
    flex: 1,
    paddingVertical: 10,
  },
  segmentText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '600',
  },
  segmentTextActive: {
    color: '#FFFFFF',
  },
  kitWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
  },
  kitChip: {
    alignItems: 'center',
    backgroundColor: colors.surfaceLight,
    borderColor: colors.border,
    borderRadius: 10,
    borderWidth: 1,
    flexBasis: '30%',
    flexGrow: 1,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  resetBtn: {
    alignItems: 'center',
    borderColor: colors.border,
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'center',
    marginBottom: 4,
    paddingVertical: 11,
  },
  resetText: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
});
