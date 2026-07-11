import { useCallback, useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import {
  getMetronomeSoundId,
  METRONOME_BPM_MAX,
  METRONOME_BPM_MIN,
  METRONOME_SOUNDS,
  setMetronomeBpm,
  setMetronomeSound,
  type MetronomeSoundId,
} from '../../instruments/piano/pianoMetronome';
import { colors } from '../../theme/colors';
import { HorizontalSlider } from './HorizontalSlider';
import { ModalChromeHeader } from './ModalChromeHeader';

const ACCENT = '#4FC3F7';

type PianoMetronomeModalProps = {
  visible: boolean;
  bpm: number;
  onChangeBpm: (bpm: number) => void;
  onClose: () => void;
};

export function PianoMetronomeModal({
  visible,
  bpm,
  onChangeBpm,
  onClose,
}: PianoMetronomeModalProps) {
  const { t } = useTranslation();
  const [displayBpm, setDisplayBpm] = useState(bpm);
  const [soundId, setSoundId] = useState<MetronomeSoundId>(() => getMetronomeSoundId());

  useEffect(() => {
    if (visible) {
      setDisplayBpm(bpm);
      setSoundId(getMetronomeSoundId());
    }
  }, [visible, bpm]);

  const commitBpm = useCallback(
    (next: number) => {
      const rounded = Math.round(next);
      setDisplayBpm(rounded);
      setMetronomeBpm(rounded);
      onChangeBpm(rounded);
    },
    [onChangeBpm],
  );

  const nudge = useCallback(
    (delta: number) => {
      commitBpm(
        Math.min(METRONOME_BPM_MAX, Math.max(METRONOME_BPM_MIN, displayBpm + delta)),
      );
    },
    [commitBpm, displayBpm],
  );

  const selectSound = useCallback((nextSoundId: MetronomeSoundId) => {
    setSoundId(nextSoundId);
    setMetronomeSound(nextSoundId);
  }, []);

  return (
    <Modal animationType="fade" transparent visible={visible} onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.card} onPress={() => {}}>
          <ModalChromeHeader
            closeLabel={t('piano.metronome.close')}
            onClose={onClose}
            title={t('piano.metronome.title')}
          />
          <Text style={styles.bpmValue}>{Math.round(displayBpm)}</Text>
          <Text style={styles.bpmLabel}>{t('piano.metronome.bpm')}</Text>

          <View style={styles.sliderRow}>
            <Pressable
              onPress={() => nudge(-5)}
              style={({ pressed }) => [styles.nudge, pressed && styles.pressed]}
            >
              <Text style={styles.nudgeText}>−5</Text>
            </Pressable>
            <HorizontalSlider
              accentColor={ACCENT}
              max={METRONOME_BPM_MAX}
              min={METRONOME_BPM_MIN}
              onValueChange={commitBpm}
              style={styles.slider}
              value={displayBpm}
            />
            <Pressable
              onPress={() => nudge(5)}
              style={({ pressed }) => [styles.nudge, pressed && styles.pressed]}
            >
              <Text style={styles.nudgeText}>+5</Text>
            </Pressable>
          </View>

          <Text style={styles.soundLabel}>{t('piano.metronome.sound')}</Text>
          <View style={styles.soundRow}>
            {METRONOME_SOUNDS.map((sound) => {
              const selected = sound.id === soundId;
              return (
                <Pressable
                  key={sound.id}
                  onPress={() => selectSound(sound.id)}
                  style={({ pressed }) => [
                    styles.soundChip,
                    selected && styles.soundChipSelected,
                    pressed && styles.pressed,
                  ]}
                >
                  <Text
                    numberOfLines={1}
                    style={[styles.soundChipText, selected && styles.soundChipTextSelected]}
                  >
                    {t(sound.labelKey)}
                  </Text>
                </Pressable>
              );
            })}
          </View>
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
    padding: 24,
  },
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 20,
    borderWidth: 1,
    maxWidth: 420,
    padding: 20,
    width: '100%',
  },
  bpmValue: {
    color: ACCENT,
    fontSize: 40,
    fontVariant: ['tabular-nums'],
    fontWeight: '800',
    textAlign: 'center',
  },
  bpmLabel: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1,
    marginBottom: 14,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  sliderRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  slider: {
    flex: 1,
  },
  nudge: {
    backgroundColor: colors.surfaceLight,
    borderColor: colors.border,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  nudgeText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '700',
  },
  soundLabel: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.6,
    marginBottom: 8,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  soundRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
  },
  soundChip: {
    backgroundColor: colors.surfaceLight,
    borderColor: colors.border,
    borderRadius: 10,
    borderWidth: 1,
    minWidth: '30%',
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  soundChipSelected: {
    backgroundColor: `${ACCENT}22`,
    borderColor: ACCENT,
  },
  soundChipText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
  soundChipTextSelected: {
    color: ACCENT,
  },
  pressed: {
    opacity: 0.75,
  },
});
