import { StyleSheet, Text, View } from 'react-native';

import { colors } from '../../theme/colors';

type PianoKeyProps = {
  noteId: string;
  letterLabel: string;
  solfegeLabel: string;
  isBlackKey: boolean;
  isActive: boolean;
  isGuide?: boolean;
  isDemo?: boolean;
  width: number;
  height: number;
};

function getOctave(noteId: string): number {
  const match = noteId.match(/(\d+)$/);
  return match ? Number(match[1]) : 4;
}

function getLabelBadgeStyle(octave: number, isActive: boolean, isGuide: boolean, isDemo: boolean) {
  if (isGuide) {
    return styles.guideBadge;
  }
  if (isDemo) {
    return styles.demoBadge;
  }
  if (isActive) {
    return styles.activeBadge;
  }
  return octave >= 5 ? styles.blueBadge : styles.greenBadge;
}

export function PianoKey({
  noteId,
  letterLabel,
  solfegeLabel,
  isBlackKey,
  isActive,
  isGuide = false,
  isDemo = false,
  width,
  height,
}: PianoKeyProps) {
  const octave = getOctave(noteId);

  return (
    <View
      pointerEvents="none"
      style={[
        styles.key,
        isBlackKey ? styles.blackKey : styles.whiteKey,
        { width, height },
        isGuide && styles.guideKey,
        isDemo && !isBlackKey && styles.demoKey,
        isActive && (isBlackKey ? styles.blackKeyActive : styles.whiteKeyActive),
      ]}
    >
      {isBlackKey ? <View style={styles.blackKeyHighlight} /> : null}

      <View style={[styles.labelGroup, isBlackKey && styles.blackLabelGroup]}>
        <Text style={[styles.solfegeLabel, isBlackKey && styles.blackKeySolfege]}>
          {solfegeLabel}
        </Text>
        <View
          style={[
            styles.labelBadge,
            isBlackKey ? styles.blackBadge : getLabelBadgeStyle(octave, isActive, isGuide, isDemo),
          ]}
        >
          <Text style={[styles.labelText, isBlackKey && styles.blackBadgeText]}>{letterLabel}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  key: {
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  whiteKey: {
    backgroundColor: '#F4F4F4',
    borderBottomColor: '#B8B8B8',
    borderBottomWidth: 3,
    borderLeftColor: '#FFFFFF',
    borderLeftWidth: 1,
    borderRadius: 0,
    borderRightColor: '#C8C8C8',
    borderRightWidth: 1,
    borderTopColor: '#FAFAFA',
    borderTopWidth: 1,
    elevation: 2,
    marginRight: 2,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 2,
  },
  whiteKeyActive: {
    backgroundColor: '#B0B0B0',
    borderBottomColor: '#888888',
    borderLeftColor: '#C8C8C8',
    borderRightColor: '#909090',
    borderTopColor: '#C0C0C0',
  },
  blackKey: {
    backgroundColor: '#141414',
    borderBottomColor: '#000000',
    borderBottomWidth: 2,
    borderLeftColor: '#2A2A2A',
    borderLeftWidth: 1,
    borderRadius: 0,
    borderRightColor: '#000000',
    borderRightWidth: 1,
    borderTopColor: '#3A3A3A',
    borderTopWidth: 2,
    elevation: 6,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
    zIndex: 2,
  },
  blackKeyActive: {
    backgroundColor: '#3A3A3A',
    borderTopColor: '#555555',
  },
  blackKeyHighlight: {
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    height: 4,
    left: '15%',
    position: 'absolute',
    right: '15%',
    top: 3,
  },
  guideKey: {
    backgroundColor: '#4CAF50',
    borderColor: '#2E7D32',
  },
  demoKey: {
    backgroundColor: '#E8E0FF',
    borderColor: colors.accent,
  },
  labelGroup: {
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: 6,
  },
  blackLabelGroup: {
    marginBottom: 4,
  },
  labelBadge: {
    alignItems: 'center',
    borderRadius: 4,
    justifyContent: 'center',
    minWidth: 28,
    paddingHorizontal: 5,
    paddingVertical: 3,
  },
  greenBadge: {
    backgroundColor: '#8BC34A',
  },
  blueBadge: {
    backgroundColor: '#64B5F6',
  },
  guideBadge: {
    backgroundColor: '#2E7D32',
  },
  demoBadge: {
    backgroundColor: colors.accent,
  },
  activeBadge: {
    backgroundColor: '#616161',
  },
  blackBadge: {
    backgroundColor: '#3A3A3A',
    borderColor: '#555555',
    borderWidth: 1,
    minWidth: 22,
    paddingHorizontal: 3,
    paddingVertical: 2,
  },
  labelText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '700',
    textAlign: 'center',
  },
  blackBadgeText: {
    fontSize: 7,
  },
  solfegeLabel: {
    color: '#333333',
    fontSize: 11,
    fontWeight: '800',
    marginBottom: 3,
    textAlign: 'center',
  },
  blackKeySolfege: {
    color: '#F0F0F0',
    fontSize: 8,
    fontWeight: '700',
    marginBottom: 2,
  },
});
