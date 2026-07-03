import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { colors } from '../../theme/colors';

type ToolbarIcon = keyof typeof Ionicons.glyphMap;

type PianoToolbarProps = {
  isRecording: boolean;
  sustainOn: boolean;
  metronomeOn: boolean;
  onBack: () => void;
  onRecordPress: () => void;
  onMetronomePress: () => void;
  onSustainPress: () => void;
  onFxPress: () => void;
  onLayoutPress: () => void;
  onDualKeyboardPress: () => void;
  onInstrumentPress: () => void;
  onMenuPress: () => void;
  onGamePress: () => void;
};

type IconButtonProps = {
  icon: ToolbarIcon;
  label: string;
  onPress: () => void;
  active?: boolean;
  accent?: 'record' | 'game' | 'default';
  disabled?: boolean;
};

function IconButton({
  icon,
  label,
  onPress,
  active = false,
  accent = 'default',
  disabled = false,
}: IconButtonProps) {
  const iconColor =
    accent === 'record' && active
      ? '#FFFFFF'
      : accent === 'record'
        ? '#FF3B30'
        : accent === 'game'
          ? '#FFD54F'
          : active
            ? colors.accent
            : '#C8C8C8';

  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      disabled={disabled}
      hitSlop={4}
      onPress={onPress}
      style={({ pressed }) => [
        styles.iconButton,
        active && styles.iconButtonActive,
        accent === 'record' && active && styles.recordActive,
        accent === 'game' && styles.gameButton,
        pressed && styles.pressed,
        disabled && styles.disabled,
      ]}
    >
      <Ionicons color={iconColor} name={icon} size={20} />
      {accent === 'record' ? (
        <View style={[styles.recordDot, active && styles.recordDotActive]} />
      ) : null}
    </Pressable>
  );
}

export function PianoToolbar({
  isRecording,
  sustainOn,
  metronomeOn,
  onBack,
  onRecordPress,
  onMetronomePress,
  onSustainPress,
  onFxPress,
  onLayoutPress,
  onDualKeyboardPress,
  onInstrumentPress,
  onMenuPress,
  onGamePress,
}: PianoToolbarProps) {
  const { t } = useTranslation();

  return (
    <View style={styles.bar}>
      <IconButton
        icon="arrow-back"
        label={t('common.back')}
        onPress={onBack}
      />
      <IconButton
        active={metronomeOn}
        icon="pulse-outline"
        label={t('piano.toolbar.metronome')}
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
        active={sustainOn}
        icon="infinite-outline"
        label={t('piano.toolbar.sustain')}
        onPress={onSustainPress}
      />
      <IconButton
        icon="sparkles-outline"
        label={t('piano.toolbar.fx')}
        onPress={onFxPress}
      />
      <IconButton
        icon="grid-outline"
        label={t('piano.toolbar.layout')}
        onPress={onLayoutPress}
      />
      <IconButton
        icon="albums-outline"
        label={t('piano.toolbar.dualKeyboard')}
        onPress={onDualKeyboardPress}
      />
      <IconButton
        icon="musical-notes-outline"
        label={t('piano.toolbar.instrument')}
        onPress={onInstrumentPress}
      />
      <IconButton
        accent="game"
        icon="game-controller-outline"
        label={t('piano.toolbar.game')}
        onPress={onGamePress}
      />
      <IconButton
        icon="menu-outline"
        label={t('piano.toolbar.menu')}
        onPress={onMenuPress}
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
  disabled: {
    opacity: 0.35,
  },
});
