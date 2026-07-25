import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { colors } from '../../theme/colors';

type ToolbarIcon = keyof typeof Ionicons.glyphMap;

type PadsToolbarProps = {
  isRecording: boolean;
  metronomeOn: boolean;
  noteRepeatOn?: boolean;
  fxOn?: boolean;
  looperOn?: boolean;
  xyOn?: boolean;
  editVisible?: boolean;
  editOn?: boolean;
  volume?: number;
  kitAccent?: string;
  onBack: () => void;
  onRecordPress: () => void;
  onMetronomePress: () => void;
  onMetronomeLongPress?: () => void;
  onNoteRepeatPress?: () => void;
  onNoteRepeatLongPress?: () => void;
  onFxPress: () => void;
  onLooperPress?: () => void;
  onXyPress?: () => void;
  onEditPress?: () => void;
  onVolumePress: () => void;
  onKitPress: () => void;
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

export function PadsToolbar({
  isRecording,
  metronomeOn,
  noteRepeatOn = false,
  fxOn = false,
  looperOn = false,
  xyOn = false,
  editVisible = false,
  editOn = false,
  volume = 1,
  kitAccent,
  onBack,
  onRecordPress,
  onMetronomePress,
  onMetronomeLongPress,
  onNoteRepeatPress,
  onNoteRepeatLongPress,
  onFxPress,
  onLooperPress,
  onXyPress,
  onEditPress,
  onVolumePress,
  onKitPress,
  onSettingsPress,
  onGamePress,
}: PadsToolbarProps) {
  const { t } = useTranslation();

  return (
    <View style={styles.bar}>
      <IconButton icon="arrow-back" label={t('common.back')} onPress={onBack} />
      <IconButton
        active={looperOn}
        icon="infinite"
        label={t('pads.toolbar.looper')}
        onPress={onLooperPress ?? (() => {})}
      />
      <IconButton
        active={metronomeOn}
        icon="pulse-outline"
        label={t('pads.toolbar.metronome')}
        onLongPress={onMetronomeLongPress}
        onPress={onMetronomePress}
      />
      <IconButton
        active={noteRepeatOn}
        icon="repeat"
        label={t('pads.toolbar.noteRepeat')}
        onLongPress={onNoteRepeatLongPress}
        onPress={onNoteRepeatPress ?? (() => {})}
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
        label={t('pads.toolbar.fx')}
        onPress={onFxPress}
      />
      <IconButton
        active={xyOn}
        icon="move"
        label={t('pads.toolbar.xy')}
        onPress={onXyPress ?? (() => {})}
      />
      {editVisible ? (
        <IconButton
          active={editOn}
          icon="create-outline"
          label={t('pads.toolbar.edit')}
          onPress={onEditPress ?? (() => {})}
        />
      ) : null}
      <IconButton
        active={volume < 1}
        colorOverride={volume <= 0 ? '#FF7043' : undefined}
        icon={volumeIcon(volume)}
        label={t('pads.toolbar.volume')}
        onPress={onVolumePress}
      />
      <IconButton
        colorOverride={kitAccent}
        icon="musical-notes-outline"
        label={t('pads.toolbar.bank')}
        onPress={onKitPress}
      />
      <IconButton
        accent="game"
        icon="game-controller-outline"
        label={t('pads.toolbar.game')}
        onPress={onGamePress}
      />
      <IconButton
        icon="settings-outline"
        label={t('pads.toolbar.settings')}
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
