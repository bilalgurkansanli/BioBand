import { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import type { PianoKeyColors } from '../../instruments/piano/pianoVoices';
import type { PianoLabelMode } from '../../storage/pianoSettingsStorage';
import { colors } from '../../theme/colors';

const DEFAULT_KEY_COLORS: PianoKeyColors = {
  white: '#F4F4F4',
  whiteActive: '#B0B0B0',
  whiteBottomBorder: '#B8B8B8',
  black: '#141414',
  blackActive: '#3A3A3A',
  whiteText: '#333333',
  blackText: '#F0F0F0',
  blackBadge: '#3A3A3A',
};

type PianoKeyProps = {
  noteId: string;
  letterLabel: string;
  solfegeLabel: string;
  isBlackKey: boolean;
  isActive: boolean;
  isGuide?: boolean;
  isDemo?: boolean;
  /** Which labels to show on the key. */
  labelMode?: PianoLabelMode;
  /** Soft highlight when note is in the selected scale. */
  isInScale?: boolean;
  width: number;
  height: number;
  badgeColorLow?: string;
  badgeColorHigh?: string;
  keyColors?: PianoKeyColors;
};

function getOctave(noteId: string): number {
  const match = noteId.match(/(\d+)$/);
  return match ? Number(match[1]) : 4;
}

function getLabelBadgeStyle(
  octave: number,
  isActive: boolean,
  isGuide: boolean,
  isDemo: boolean,
  badgeColorLow: string,
  badgeColorHigh: string,
) {
  if (isGuide) {
    return styles.guideBadge;
  }
  if (isDemo) {
    return styles.demoBadge;
  }
  if (isActive) {
    return styles.activeBadge;
  }
  return { backgroundColor: octave >= 5 ? badgeColorHigh : badgeColorLow };
}

/**
 * Memoised: the screen re-renders on every progress tick, tone nudge and
 * settings change, and without this all 24 keys were rebuilt each time. The key
 * takes no callbacks and `pointerEvents` is off — touches are handled by the
 * keyboard — so a key only needs redrawing when its own state or size changes.
 */
export const PianoKey = memo(function PianoKey({
  noteId,
  letterLabel,
  solfegeLabel,
  isBlackKey,
  isActive,
  isGuide = false,
  isDemo = false,
  labelMode = 'both',
  isInScale = false,
  width,
  height,
  badgeColorLow = '#8BC34A',
  badgeColorHigh = '#64B5F6',
  keyColors = DEFAULT_KEY_COLORS,
}: PianoKeyProps) {
  const octave = getOctave(noteId);
  const showScaleTint = isInScale && !isGuide && !isDemo && !isActive;
  const showSolfege = labelMode === 'both' || labelMode === 'solfege';
  const showLetter = labelMode === 'both' || labelMode === 'letter';
  const showAnyLabel = showSolfege || showLetter;

  return (
    <View
      pointerEvents="none"
      style={[
        styles.key,
        isBlackKey ? styles.blackKey : styles.whiteKey,
        isBlackKey
          ? { backgroundColor: keyColors.black }
          : {
              backgroundColor: keyColors.white,
              borderBottomColor: keyColors.whiteBottomBorder,
            },
        { width, height },
        showScaleTint && !isBlackKey && styles.scaleWhiteKey,
        showScaleTint && isBlackKey && styles.scaleBlackKey,
        isGuide && styles.guideKey,
        isDemo && !isBlackKey && styles.demoKey,
        isActive && {
          backgroundColor: isBlackKey ? keyColors.blackActive : keyColors.whiteActive,
        },
      ]}
    >
      {isBlackKey ? <View style={styles.blackKeyHighlight} /> : null}
      {showScaleTint && isBlackKey ? <View style={styles.scaleBlackStripe} /> : null}

      {showAnyLabel ? (
        <View style={[styles.labelGroup, isBlackKey && styles.blackLabelGroup]}>
          {showSolfege ? (
            <Text
              style={[
                styles.solfegeLabel,
                isBlackKey && styles.blackKeySolfege,
                { color: isBlackKey ? keyColors.blackText : keyColors.whiteText },
              ]}
            >
              {solfegeLabel}
            </Text>
          ) : null}
          {showLetter ? (
            <View
              style={[
                styles.labelBadge,
                isBlackKey
                  ? [styles.blackBadge, { backgroundColor: keyColors.blackBadge }]
                  : getLabelBadgeStyle(
                      octave,
                      isActive,
                      isGuide,
                      isDemo,
                      badgeColorLow,
                      badgeColorHigh,
                    ),
                showScaleTint && !isBlackKey && styles.scaleBadge,
              ]}
            >
              <Text style={[styles.labelText, isBlackKey && styles.blackBadgeText]}>
                {letterLabel}
              </Text>
            </View>
          ) : null}
        </View>
      ) : null}
    </View>
  );
});

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
  scaleWhiteKey: {
    backgroundColor: '#E8F5E9',
    borderBottomColor: '#A5D6A7',
  },
  scaleBlackKey: {
    borderTopColor: '#81C784',
  },
  scaleBlackStripe: {
    backgroundColor: 'rgba(129, 199, 132, 0.55)',
    height: 3,
    left: '12%',
    position: 'absolute',
    right: '12%',
    top: 2,
  },
  scaleBadge: {
    backgroundColor: '#66BB6A',
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
