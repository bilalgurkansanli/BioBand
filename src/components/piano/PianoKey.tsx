import { Pressable, StyleSheet, Text } from 'react-native';

import { colors } from '../../theme/colors';

type PianoKeyProps = {
  letterLabel: string;
  solfegeLabel: string;
  isBlackKey: boolean;
  isActive: boolean;
  isGuide?: boolean;
  isDemo?: boolean;
  onPressIn: () => void;
  onPressOut: () => void;
  width: number;
  height: number;
};

export function PianoKey({
  letterLabel,
  solfegeLabel,
  isBlackKey,
  isActive,
  isGuide = false,
  isDemo = false,
  onPressIn,
  onPressOut,
  width,
  height,
}: PianoKeyProps) {
  return (
    <Pressable
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      style={[
        styles.key,
        isBlackKey ? styles.blackKey : styles.whiteKey,
        { width, height },
        isGuide && styles.guideKey,
        isDemo && styles.demoKey,
        isActive && styles.activeKey,
      ]}
    >
      <Text
        style={[
          styles.solfegeLabel,
          isBlackKey && styles.blackKeySolfege,
          (isActive || isGuide || isDemo) && styles.highlightLabel,
        ]}
      >
        {solfegeLabel}
      </Text>
      <Text
        style={[
          styles.letterLabel,
          isBlackKey && styles.blackKeyLetter,
          (isActive || isGuide || isDemo) && styles.highlightLabel,
        ]}
      >
        {letterLabel}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  key: {
    alignItems: 'center',
    borderRadius: 4,
    justifyContent: 'flex-end',
    paddingBottom: 6,
  },
  whiteKey: {
    backgroundColor: '#F5F5F5',
    borderColor: colors.border,
    borderWidth: 1,
    marginRight: 2,
  },
  blackKey: {
    backgroundColor: '#1A1A1A',
    borderColor: '#000000',
    borderWidth: 1,
    elevation: 4,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 3,
    zIndex: 2,
  },
  guideKey: {
    backgroundColor: '#22C55E',
    borderColor: '#16A34A',
    borderWidth: 2,
  },
  demoKey: {
    backgroundColor: colors.accentMuted,
    borderColor: colors.accent,
    borderWidth: 2,
  },
  activeKey: {
    backgroundColor: colors.accent,
    borderColor: colors.accentMuted,
  },
  solfegeLabel: {
    color: colors.background,
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
  },
  letterLabel: {
    color: colors.background,
    fontSize: 9,
    fontWeight: '500',
    marginTop: 2,
    textAlign: 'center',
  },
  blackKeySolfege: {
    color: '#E5E5E5',
    fontSize: 8,
  },
  blackKeyLetter: {
    color: '#A0A0A0',
    fontSize: 7,
  },
  highlightLabel: {
    color: colors.text,
  },
});
