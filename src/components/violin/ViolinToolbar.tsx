import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { colors } from '../../theme/colors';

type ToolbarIcon = keyof typeof Ionicons.glyphMap;

type ViolinToolbarProps = {
  isRecording: boolean;
  metronomeOn: boolean;
  fxOn?: boolean;
  volume?: number;
  voiceAccent?: string;
  onBack: () => void;
  onRecordPress: () => void;
  onMetronomePress: () => void;
  onMetronomeLongPress?: () => void;
  onFxPress: () => void;
  onVolumePress: () => void;
  onVoicePress: () => void;
  onSettingsPress: () => void;
  onGamePress: () => void;
};

type IconButtonProps = {
  icon: ToolbarIcon;
  label: string;
  onPress: () => void;
  onLongPress?: () => void;
  active?: boolean;
  accent?: 'record' | 'game' | 'default';
  colorOverride?: string;
};

function IconButton({
  icon,
  label,
  onPress,
  onLongPress,
  active = false,
  accent = 'default',
  colorOverride,
}: IconButtonProps) {
  const iconColor =
    colorOverride ??
    (accent === 'record' && active
      ? '#FFFFFF'
      : accent === 'record'
        ? '#FF3B30'
        : accent === 'game'
          ? '#FFD54F'
          : active
            ? colors.accent
            : '#C8C8C8');

  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      hitSlop={4}
      onLongPress={onLongPress}
      onPress={onPress}
      style={({ pressed }) => [
        styles.iconButton,
        active && styles.iconButtonActive,
        accent === 'record' && active && styles.recordActive,
        accent === 'game' && styles.gameButton,
        pressed && styles.pressed,
      ]}
    >
      <Ionicons color={iconColor} name={icon} size={20} />
      {accent === 'record' ? (
        <View style={[styles.recordDot, active && styles.recordDotActive]} />
      ) : null}
    </Pressable>
  );
}

function volumeIcon(volume: number): ToolbarIcon {
  if (volume <= 0) {
    return 'volume-mute-outline';
  }
  if (volume < 0.5) {
    return 'volume-low-outline';
  }
  return 'volume-high-outline';
}

export function ViolinToolbar({
  isRecording,
  metronomeOn,
  fxOn = false,
  volume = 1,
  voiceAccent,
  onBack,
  onRecordPress,
  onMetronomePress,
  onMetronomeLongPress,
  onFxPress,
  onVolumePress,
  onVoicePress,
  onSettingsPress,
  onGamePress,
}: ViolinToolbarProps) {
  const { t } = useTranslation();

  return (
    <View style={styles.bar}>
      <IconButton icon="arrow-back" label={t('common.back')} onPress={onBack} />
      <IconButton
        active={metronomeOn}
        icon="pulse-outline"
        label={t('violin.toolbar.metronome')}
        onLongPress={onMetronomeLongPress}
        onPress={onMetronomePress}
      />
      <IconButton
        accent="record"
        active={isRecording}
        icon="radio-button-on"
        label={isRecording ? t('recording.stop') : t('recording.button')}
        onPress={onRecordPress}
      />
      <IconButton
        active={fxOn}
        icon="sparkles-outline"
        label={t('violin.toolbar.fx')}
        onPress={onFxPress}
      />
      <IconButton
        active={volume < 1}
        colorOverride={volume <= 0 ? '#FF7043' : undefined}
        icon={volumeIcon(volume)}
        label={t('violin.toolbar.volume')}
        onPress={onVolumePress}
      />
      <IconButton
        colorOverride={voiceAccent}
        icon="musical-notes-outline"
        label={t('violin.toolbar.voice')}
        onPress={onVoicePress}
      />
      <IconButton
        accent="game"
        icon="game-controller-outline"
        label={t('violin.toolbar.game')}
        onPress={onGamePress}
      />
      <IconButton
        icon="settings-outline"
        label={t('violin.toolbar.settings')}
        onPress={onSettingsPress}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    alignItems: 'center',
    backgroundColor: '#1C1C1E',
    borderBottomColor: '#3A3A3C',
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    paddingVertical: 6,
  },
  iconButton: {
    alignItems: 'center',
    borderRadius: 8,
    height: 36,
    justifyContent: 'center',
    minWidth: 36,
    position: 'relative',
  },
  iconButtonActive: {
    backgroundColor: '#2C2C2E',
  },
  gameButton: {
    backgroundColor: '#2A2540',
  },
  recordActive: {
    backgroundColor: '#FF3B30',
  },
  recordDot: {
    backgroundColor: '#FF3B30',
    borderRadius: 3,
    bottom: 4,
    height: 6,
    position: 'absolute',
    right: 4,
    width: 6,
  },
  recordDotActive: {
    backgroundColor: '#FFFFFF',
  },
  pressed: {
    opacity: 0.7,
  },
});
