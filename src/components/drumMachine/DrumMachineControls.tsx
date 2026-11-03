import Ionicons from '@expo/vector-icons/Ionicons';
import { useCallback, useEffect, useRef } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';

import { colors } from '../../theme/colors';

// The drum machine's toolbar and footer buttons. Split out of
// DrumMachineScreen as they were, so the screen file holds the screen.

export function IconBtn({
  icon,
  label,
  onPress,
  accent,
  disabled,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  accent: string;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityLabel={label}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.iconBtn,
        { borderColor: accent },
        disabled && styles.btnDisabled,
        pressed && styles.btnPressed,
      ]}
    >
      <Ionicons color={accent} name={icon} size={20} />
    </Pressable>
  );
}

export function LabeledToolbarBtn({
  icon,
  label,
  onPress,
  accentColor,
  filled,
  disabled,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  accentColor: string;
  filled?: boolean;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityLabel={label}
      disabled={disabled}
      onPress={onPress}
      style={[
        styles.labeledBtn,
        {
          borderColor: accentColor,
          backgroundColor: filled ? accentColor : colors.surface,
        },
        disabled && styles.labeledBtnDisabled,
      ]}
    >
      <Ionicons color={filled ? '#FFFFFF' : accentColor} name={icon} size={18} />
      <Text
        style={[
          styles.labeledBtnText,
          { color: filled ? '#FFFFFF' : accentColor },
        ]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </Pressable>
  );
}

type FooterBtnVariant = 'primary' | 'tinted' | 'plain';

export function FooterBtn({
  icon,
  label,
  onPress,
  accent,
  variant = 'tinted',
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  accent: string;
  variant?: FooterBtnVariant;
}) {
  const contentColor =
    variant === 'primary'
      ? '#FFFFFF'
      : variant === 'tinted'
        ? accent
        : colors.textSecondary;
  const boxStyle =
    variant === 'primary'
      ? { backgroundColor: accent, borderColor: accent }
      : variant === 'tinted'
        ? { backgroundColor: `${accent}1F`, borderColor: `${accent}66` }
        : { backgroundColor: colors.surface, borderColor: colors.border };

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.footerBtn,
        boxStyle,
        variant === 'primary' && styles.footerBtnPrimary,
        pressed && styles.footerBtnPressed,
      ]}
    >
      <Ionicons color={contentColor} name={icon} size={16} />
      <Text style={[styles.footerBtnText, { color: contentColor }]}>{label}</Text>
    </Pressable>
  );
}

const BPM_HOLD_DELAY_MS = 320;
const BPM_HOLD_INTERVAL_MS = 70;

export function BpmHoldButton({
  icon,
  accessibilityLabel,
  onNudge,
  accent,
}: {
  icon: 'add' | 'remove';
  accessibilityLabel: string;
  onNudge: () => void;
  accent: string;
}) {
  const delayRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearHold = useCallback(() => {
    if (delayRef.current) {
      clearTimeout(delayRef.current);
      delayRef.current = null;
    }
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  useEffect(() => clearHold, [clearHold]);

  const startHold = useCallback(() => {
    clearHold();
    onNudge();
    delayRef.current = setTimeout(() => {
      intervalRef.current = setInterval(() => {
        onNudge();
      }, BPM_HOLD_INTERVAL_MS);
    }, BPM_HOLD_DELAY_MS);
  }, [clearHold, onNudge]);

  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      onPressIn={startHold}
      onPressOut={clearHold}
      style={styles.bpmBtn}
    >
      <Ionicons color={accent} name={icon} size={18} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  iconBtn: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 10,
    borderWidth: 1.5,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  labeledBtn: {
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1.5,
    flexDirection: 'row',
    gap: 4,
    height: 40,
    paddingHorizontal: 10,
  },
  labeledBtnDisabled: {
    opacity: 0.45,
  },
  labeledBtnText: {
    fontSize: 11,
    fontWeight: '700',
  },
  btnDisabled: {
    opacity: 0.45,
  },
  btnPressed: {
    opacity: 0.7,
  },
  footerBtn: {
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  footerBtnPrimary: {
    elevation: 3,
    shadowColor: '#000000',
    shadowOffset: { height: 2, width: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
  footerBtnPressed: {
    opacity: 0.82,
    transform: [{ scale: 0.97 }],
  },
  footerBtnText: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  bpmBtn: {
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
});
