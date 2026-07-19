import { useCallback, useEffect, useRef, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import {
  RecordingPresets,
  requestRecordingPermissionsAsync,
  useAudioRecorder,
} from 'expo-audio';

import {
  prepareRecordingAudioMode,
  restorePlaybackAudioMode,
} from '../../audio/initAudio';
import {
  PAD_BANKS,
  resolveCustomSlotDef,
  type CustomPadSlot,
  type PadBankId,
  type PadChokeGroup,
} from '../../instruments/pads/padsBanks';
import { evictUserPadSample, previewPadSlot } from '../../instruments/pads/padsEngine';
import type { PadSoundId } from '../../instruments/pads/padsSounds';
import {
  copyPadSampleFile,
  deletePadSampleFile,
} from '../../storage/padsCustomBankStorage';
import { colors } from '../../theme/colors';
import { HorizontalSlider } from '../piano/HorizontalSlider';
import { ModalChromeHeader } from '../piano/ModalChromeHeader';

const COLOR_PALETTE = [
  '#3D8BFF',
  '#7B6CFF',
  '#A78BFA',
  '#38BDF8',
  '#2EC4B6',
  '#34D399',
  '#F4D35E',
  '#FFB347',
  '#E07A1F',
  '#FF7A59',
  '#E85D4A',
  '#F472B6',
];

const CHOKE_OPTIONS: (PadChokeGroup | 'none')[] = ['none', 'a', 'b'];

type PadEditModalProps = {
  visible: boolean;
  slotIndex: number;
  slot: CustomPadSlot | null;
  accent: string;
  onSave: (slotIndex: number, slot: CustomPadSlot) => void;
  onClose: () => void;
};

export function PadEditModal({
  visible,
  slotIndex,
  slot,
  accent,
  onSave,
  onClose,
}: PadEditModalProps) {
  const { t } = useTranslation();
  const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);

  const [draft, setDraft] = useState<CustomPadSlot | null>(slot);
  const [sourceBankId, setSourceBankId] = useState<Exclude<PadBankId, 'custom'>>('drums');
  const [recording, setRecording] = useState(false);
  const [busy, setBusy] = useState(false);
  /** User samples created this session — deleted on cancel if unused. */
  const orphanUrisRef = useRef<string[]>([]);

  useEffect(() => {
    if (visible) {
      setDraft(slot);
      setRecording(false);
      setBusy(false);
      orphanUrisRef.current = [];
      if (slot?.source.kind === 'builtin') {
        setSourceBankId(slot.source.bankId);
      }
    }
  }, [slot, visible]);

  const preview = useCallback(
    (candidate: CustomPadSlot) => {
      void previewPadSlot(resolveCustomSlotDef(candidate, slotIndex)).then((ok) => {
        if (!ok) {
          Alert.alert(t('pads.editor.previewFailed'));
        }
      });
    },
    [slotIndex, t],
  );

  const updateDraft = useCallback(
    (patch: Partial<CustomPadSlot>, withPreview = false) => {
      setDraft((previous) => {
        if (!previous) {
          return previous;
        }
        const next = { ...previous, ...patch };
        if (withPreview) {
          preview(next);
        }
        return next;
      });
    },
    [preview],
  );

  const pickBuiltinSound = useCallback(
    (bankId: Exclude<PadBankId, 'custom'>, padId: PadSoundId) => {
      updateDraft({ source: { kind: 'builtin', bankId, padId }, label: undefined }, true);
    },
    [updateDraft],
  );

  const startRecording = useCallback(async () => {
    const { granted } = await requestRecordingPermissionsAsync();
    if (!granted) {
      Alert.alert(t('recording.permissionDenied'));
      return;
    }
    try {
      setBusy(true);
      await prepareRecordingAudioMode();
      await audioRecorder.prepareToRecordAsync();
      audioRecorder.record();
      setRecording(true);
    } catch {
      Alert.alert(t('pads.editor.recordFailed'));
      await restorePlaybackAudioMode();
    } finally {
      setBusy(false);
    }
  }, [audioRecorder, t]);

  const stopRecording = useCallback(async () => {
    setBusy(true);
    try {
      await audioRecorder.stop();
      await restorePlaybackAudioMode();
      setRecording(false);

      const sourceUri = audioRecorder.uri;
      if (!sourceUri) {
        Alert.alert(t('pads.editor.recordFailed'));
        return;
      }

      const durableUri = copyPadSampleFile(slotIndex, sourceUri);
      orphanUrisRef.current.push(durableUri);

      const candidate: CustomPadSlot = {
        ...(draft ?? {
          source: { kind: 'user', uri: durableUri },
          color: accent,
          gain: 1,
          pitchSemitones: 0,
        }),
        source: { kind: 'user', uri: durableUri },
        label: t('pads.editor.mySampleLabel', { index: slotIndex + 1 }),
      };

      const ok = await previewPadSlot(resolveCustomSlotDef(candidate, slotIndex));
      if (!ok) {
        evictUserPadSample(durableUri);
        deletePadSampleFile(durableUri);
        orphanUrisRef.current = orphanUrisRef.current.filter((uri) => uri !== durableUri);
        Alert.alert(t('pads.editor.decodeFailed'));
        return;
      }

      setDraft(candidate);
    } catch {
      Alert.alert(t('pads.editor.recordFailed'));
    } finally {
      setBusy(false);
    }
  }, [accent, audioRecorder, draft, slotIndex, t]);

  const handleSave = useCallback(() => {
    // Never close over a hot mic — the recorder would keep running and the
    // app would stay in record audio mode (attenuated playback, mic
    // indicator on). The Save button is also disabled while recording.
    if (!draft || recording) {
      return;
    }
    // Keep only the sample the user actually saved — delete session
    // leftovers, including their decoded buffers.
    const keptUri = draft.source.kind === 'user' ? draft.source.uri : null;
    for (const uri of orphanUrisRef.current) {
      if (uri !== keptUri) {
        evictUserPadSample(uri);
        deletePadSampleFile(uri);
      }
    }
    orphanUrisRef.current = [];
    onSave(slotIndex, draft);
  }, [draft, onSave, recording, slotIndex]);

  const handleCancel = useCallback(() => {
    if (recording) {
      void audioRecorder.stop().then(() => restorePlaybackAudioMode());
    }
    for (const uri of orphanUrisRef.current) {
      evictUserPadSample(uri);
      deletePadSampleFile(uri);
    }
    orphanUrisRef.current = [];
    onClose();
  }, [audioRecorder, onClose, recording]);

  if (!draft) {
    return null;
  }

  const sourceBank = PAD_BANKS.find((bank) => bank.id === sourceBankId) ?? PAD_BANKS[0];
  const selectedPadId =
    draft.source.kind === 'builtin' && draft.source.bankId === sourceBankId
      ? draft.source.padId
      : null;

  return (
    <Modal animationType="fade" transparent visible={visible} onRequestClose={handleCancel}>
      {/* Dismiss layer behind the card — never wrap the card in a Pressable. */}
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={handleCancel} />
        <View style={styles.card}>
          <ModalChromeHeader
            closeLabel={t('common.cancel')}
            onClose={handleCancel}
            title={t('pads.editor.title', { index: slotIndex + 1 })}
          />

          <ScrollView
            contentContainerStyle={styles.scrollContent}
            nestedScrollEnabled
            showsVerticalScrollIndicator
            style={styles.scroll}
          >
            <Pressable
              onPress={() => preview(draft)}
              style={({ pressed }) => [
                styles.previewButton,
                { borderColor: `${accent}88` },
                pressed && styles.pressed,
              ]}
            >
              <Ionicons color={accent} name="play" size={16} />
              <Text style={[styles.previewText, { color: accent }]}>
                {t('pads.editor.preview')}
              </Text>
            </Pressable>

            <Text style={styles.sectionTitle}>{t('pads.editor.soundSection')}</Text>
            <View style={styles.bankChips}>
              {PAD_BANKS.map((bank) => (
                <Pressable
                  key={bank.id}
                  onPress={() => setSourceBankId(bank.id as Exclude<PadBankId, 'custom'>)}
                  style={({ pressed }) => [
                    styles.bankChip,
                    bank.id === sourceBankId && {
                      backgroundColor: `${bank.theme.accent}26`,
                      borderColor: bank.theme.accent,
                    },
                    pressed && styles.pressed,
                  ]}
                >
                  <Text style={styles.bankChipIcon}>{bank.icon}</Text>
                  <Text
                    style={[
                      styles.bankChipText,
                      bank.id === sourceBankId && { color: bank.theme.accent },
                    ]}
                  >
                    {t(bank.labelKey)}
                  </Text>
                </Pressable>
              ))}
            </View>

            <View style={styles.soundGrid}>
              {sourceBank.slots.map((bankSlot) => (
                <Pressable
                  key={bankSlot.id}
                  onPress={() => pickBuiltinSound(sourceBank.id as Exclude<PadBankId, 'custom'>, bankSlot.id)}
                  style={({ pressed }) => [
                    styles.soundChip,
                    { borderColor: `${bankSlot.color}66` },
                    selectedPadId === bankSlot.id && {
                      backgroundColor: `${bankSlot.color}2E`,
                      borderColor: bankSlot.color,
                    },
                    pressed && styles.pressed,
                  ]}
                >
                  <Text numberOfLines={1} style={styles.soundChipText}>
                    {bankSlot.rawLabel ?? t(bankSlot.labelKey)}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.sectionTitle}>{t('pads.editor.micSection')}</Text>
            <View style={styles.micRow}>
              <Pressable
                disabled={busy}
                onPress={recording ? stopRecording : startRecording}
                style={({ pressed }) => [
                  styles.micButton,
                  recording && styles.micButtonActive,
                  busy && styles.disabled,
                  pressed && styles.pressed,
                ]}
              >
                <Ionicons
                  color={recording ? '#FFFFFF' : '#FF3B30'}
                  name={recording ? 'stop' : 'mic'}
                  size={18}
                />
                <Text style={[styles.micButtonText, recording && styles.micButtonTextActive]}>
                  {recording ? t('pads.editor.stopRecording') : t('pads.editor.recordSample')}
                </Text>
              </Pressable>
              {draft.source.kind === 'user' ? (
                <View style={styles.micBadge}>
                  <Ionicons color="#34D399" name="checkmark-circle" size={14} />
                  <Text style={styles.micBadgeText}>{t('pads.editor.sampleAssigned')}</Text>
                </View>
              ) : null}
            </View>
            <Text style={styles.hint}>{t('pads.editor.micHint')}</Text>

            <Text style={styles.sectionTitle}>{t('pads.editor.colorSection')}</Text>
            <View style={styles.colorRow}>
              {COLOR_PALETTE.map((color) => (
                <Pressable
                  key={color}
                  onPress={() => updateDraft({ color })}
                  style={({ pressed }) => [
                    styles.colorDot,
                    { backgroundColor: color },
                    draft.color === color && styles.colorDotSelected,
                    pressed && styles.pressed,
                  ]}
                />
              ))}
            </View>

            <View style={styles.sliderHeader}>
              <Text style={styles.sectionTitle}>{t('pads.editor.pitchSection')}</Text>
              <Text style={[styles.sliderValue, { color: accent }]}>
                {draft.pitchSemitones > 0 ? '+' : ''}
                {draft.pitchSemitones}
              </Text>
            </View>
            <HorizontalSlider
              accentColor={accent}
              max={12}
              min={-12}
              onSlidingComplete={(value) =>
                updateDraft({ pitchSemitones: Math.round(value) }, true)
              }
              onValueChange={(value) =>
                updateDraft({ pitchSemitones: Math.round(value) })
              }
              value={draft.pitchSemitones}
            />

            <View style={styles.sliderHeader}>
              <Text style={styles.sectionTitle}>{t('pads.editor.gainSection')}</Text>
              <Text style={[styles.sliderValue, { color: accent }]}>
                {Math.round(draft.gain * 100)}%
              </Text>
            </View>
            <HorizontalSlider
              accentColor={accent}
              max={1.4}
              min={0.2}
              onSlidingComplete={(value) => updateDraft({ gain: value }, true)}
              onValueChange={(value) => updateDraft({ gain: value })}
              value={draft.gain}
            />

            <Text style={styles.sectionTitle}>{t('pads.editor.chokeSection')}</Text>
            <View style={styles.chokeRow}>
              {CHOKE_OPTIONS.map((option) => {
                const selected =
                  option === 'none' ? !draft.chokeGroup : draft.chokeGroup === option;
                return (
                  <Pressable
                    key={option}
                    onPress={() =>
                      updateDraft({
                        chokeGroup: option === 'none' ? undefined : option,
                      })
                    }
                    style={({ pressed }) => [
                      styles.chokeChip,
                      selected && { backgroundColor: `${accent}26`, borderColor: accent },
                      pressed && styles.pressed,
                    ]}
                  >
                    <Text style={[styles.chokeChipText, selected && { color: accent }]}>
                      {t(`pads.editor.choke.${option}`)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <Text style={styles.hint}>{t('pads.editor.chokeHint')}</Text>

            <Pressable
              disabled={recording || busy}
              onPress={handleSave}
              style={({ pressed }) => [
                styles.saveButton,
                { backgroundColor: accent },
                (recording || busy) && styles.disabled,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.saveButtonText}>{t('common.save')}</Text>
            </Pressable>
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
    maxHeight: '88%',
    maxWidth: 460,
    paddingBottom: 16,
    paddingHorizontal: 16,
    paddingTop: 8,
    width: '100%',
  },
  scroll: {
    flexGrow: 0,
    flexShrink: 1,
  },
  scrollContent: {
    gap: 10,
    paddingTop: 8,
  },
  previewButton: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderRadius: 10,
    borderWidth: 1.5,
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  previewText: {
    fontSize: 13,
    fontWeight: '800',
  },
  sectionTitle: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.6,
    marginTop: 4,
    textTransform: 'uppercase',
  },
  bankChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  bankChip: {
    alignItems: 'center',
    borderColor: colors.border,
    borderRadius: 9,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 6,
  },
  bankChipIcon: {
    fontSize: 13,
  },
  bankChipText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
  },
  soundGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  soundChip: {
    backgroundColor: colors.surfaceLight,
    borderRadius: 8,
    borderWidth: 1,
    minWidth: '22%',
    paddingHorizontal: 6,
    paddingVertical: 7,
  },
  soundChipText: {
    color: colors.text,
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
  },
  micRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  micButton: {
    alignItems: 'center',
    borderColor: '#FF3B3055',
    borderRadius: 10,
    borderWidth: 1.5,
    flexDirection: 'row',
    gap: 7,
    paddingHorizontal: 13,
    paddingVertical: 9,
  },
  micButtonActive: {
    backgroundColor: '#FF3B30',
    borderColor: '#FF3B30',
  },
  micButtonText: {
    color: '#FF6B62',
    fontSize: 13,
    fontWeight: '800',
  },
  micButtonTextActive: {
    color: '#FFFFFF',
  },
  micBadge: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 4,
  },
  micBadgeText: {
    color: '#34D399',
    fontSize: 12,
    fontWeight: '700',
  },
  hint: {
    color: colors.textSecondary,
    fontSize: 11,
    lineHeight: 15,
  },
  colorRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  colorDot: {
    borderColor: 'transparent',
    borderRadius: 14,
    borderWidth: 2.5,
    height: 28,
    width: 28,
  },
  colorDotSelected: {
    borderColor: '#FFFFFF',
  },
  sliderHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  sliderValue: {
    fontSize: 13,
    fontWeight: '800',
  },
  chokeRow: {
    flexDirection: 'row',
    gap: 8,
  },
  chokeChip: {
    alignItems: 'center',
    backgroundColor: colors.surfaceLight,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    paddingVertical: 9,
  },
  chokeChipText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '800',
  },
  saveButton: {
    alignItems: 'center',
    borderRadius: 10,
    marginTop: 6,
    paddingVertical: 12,
  },
  saveButtonText: {
    color: '#06251F',
    fontSize: 15,
    fontWeight: '900',
  },
  disabled: {
    opacity: 0.5,
  },
  pressed: {
    opacity: 0.75,
  },
});
