import { useCallback, useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTranslation } from 'react-i18next';

import { colors } from '../../theme/colors';
import { HorizontalSlider } from './HorizontalSlider';
import { ModalChromeHeader } from './ModalChromeHeader';

const ACCENT = '#66BB6A';
const PRESETS = [0.25, 0.5, 0.75, 1];

type PianoVolumeModalProps = {
  visible: boolean;
  volume: number;
  onChange: (volume: number) => void;
  onClose: () => void;
};

export function PianoVolumeModal({
  visible,
  volume,
  onChange,
  onClose,
}: PianoVolumeModalProps) {
  const { t } = useTranslation();
  const [displayVolume, setDisplayVolume] = useState(volume);

  useEffect(() => {
    if (visible) {
      setDisplayVolume(volume);
    }
  }, [visible, volume]);

  const handleVolumeChange = useCallback(
    (nextVolume: number) => {
      setDisplayVolume(nextVolume);
      onChange(nextVolume);
    },
    [onChange],
  );

  const ratio = Math.max(0, Math.min(1, displayVolume));

  return (
    <Modal animationType="fade" transparent visible={visible} onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.card} onPress={() => {}}>
          <ModalChromeHeader
            closeLabel={t('piano.volume.close')}
            onClose={onClose}
            title={t('piano.volume.title')}
          />

          <View style={styles.valueRow}>
            <Ionicons
              color={ratio === 0 ? '#FF7043' : ACCENT}
              name={
                ratio === 0
                  ? 'volume-mute'
                  : ratio < 0.5
                    ? 'volume-low'
                    : 'volume-high'
              }
              size={26}
            />
            <Text style={styles.valueText}>
              {t('common.percent', { percent: Math.round(ratio * 100) })}
            </Text>
          </View>

          <View style={styles.sliderRow}>
            <Ionicons color={colors.textSecondary} name="volume-low-outline" size={18} />
            <HorizontalSlider
              accentColor={ACCENT}
              onValueChange={handleVolumeChange}
              style={styles.sliderFlex}
              value={displayVolume}
            />
            <Ionicons color={colors.textSecondary} name="volume-high-outline" size={18} />
          </View>

          <View style={styles.presetRow}>
            {PRESETS.map((preset) => {
              const isCurrent = Math.abs(ratio - preset) < 0.005;
              return (
                <Pressable
                  key={preset}
                  onPress={() => handleVolumeChange(preset)}
                  style={({ pressed }) => [
                    styles.presetButton,
                    isCurrent && styles.presetButtonActive,
                    pressed && styles.pressed,
                  ]}
                >
                  <Text
                    style={[styles.presetText, isCurrent && styles.presetTextActive]}
                  >
                    {t('common.percent', { percent: Math.round(preset * 100) })}
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
  valueRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    marginBottom: 8,
  },
  valueText: {
    color: colors.text,
    fontSize: 24,
    fontVariant: ['tabular-nums'],
    fontWeight: '800',
  },
  sliderRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  sliderFlex: {
    flex: 1,
  },
  presetRow: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
  },
  presetButton: {
    backgroundColor: colors.surfaceLight,
    borderColor: colors.border,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  presetButtonActive: {
    backgroundColor: `${ACCENT}22`,
    borderColor: ACCENT,
  },
  presetText: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '700',
  },
  presetTextActive: {
    color: ACCENT,
  },
  pressed: {
    opacity: 0.75,
  },
});
