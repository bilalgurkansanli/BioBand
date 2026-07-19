import { StyleSheet, Text, View } from 'react-native';

type ViolinNoteCellProps = {
  isActive: boolean;
  isOpenString: boolean;
  isGuide: boolean;
  strongGuide: boolean;
  guideAccent: string;
  stringColor: string;
  nutColor: string;
  positionDotColor: string;
  /** Note name or finger number shown at the cell's bottom edge. */
  label?: string;
  labelColor?: string;
  /** Width of the touch column. */
  width: number;
  /** Height of the string row. */
  height: number;
};

/** Visual finger pad only — touch is handled by the fingerboard surface. */
export function ViolinNoteCell({
  isActive,
  isOpenString,
  isGuide,
  strongGuide,
  guideAccent,
  stringColor,
  nutColor,
  positionDotColor,
  label,
  labelColor,
  width,
  height,
}: ViolinNoteCellProps) {
  const labelText = label ? (
    <Text
      numberOfLines={1}
      style={[styles.label, { color: labelColor ?? '#FFFFFF' }]}
    >
      {label}
    </Text>
  ) : null;
  // Pads scale with the row so bigger fingerboards get bigger touch targets
  // (0.61/0.5 of a 36px row reproduce the original 22/18px look).
  const padSize = Math.min(
    width - 4,
    height - 8,
    isOpenString ? Math.round(height * 0.61) : Math.round(height * 0.5),
  );
  const lit = isActive || isGuide;

  if (isOpenString) {
    return (
      <View pointerEvents="none" style={[styles.hit, { height, width }]}>
        <View
          style={[
            styles.openPad,
            {
              width: Math.max(10, padSize * 0.45),
              height: height * 0.72,
              backgroundColor: lit ? guideAccent : nutColor,
              borderColor: lit ? guideAccent : `${nutColor}99`,
              shadowColor: lit ? guideAccent : '#000',
            },
            isGuide && strongGuide && styles.strongGlow,
          ]}
        />
        {labelText}
      </View>
    );
  }

  return (
    <View pointerEvents="none" style={[styles.hit, { height, width }]}>
      <View
        style={[
          styles.fingerPad,
          {
            width: padSize,
            height: padSize,
            borderRadius: padSize / 2,
            backgroundColor: lit ? guideAccent : positionDotColor,
            borderColor: lit ? guideAccent : `${stringColor}55`,
            borderWidth: lit ? (strongGuide ? 2.5 : 2) : 1,
            shadowColor: lit ? guideAccent : 'transparent',
            opacity: lit ? 1 : 0.85,
          },
          isGuide && strongGuide && styles.strongGlow,
        ]}
      />
      {labelText}
    </View>
  );
}

const styles = StyleSheet.create({
  hit: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  fingerPad: {
    elevation: 2,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.7,
    shadowRadius: 6,
  },
  openPad: {
    borderRadius: 3,
    borderWidth: 1,
    elevation: 2,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
  },
  strongGlow: {
    shadowOpacity: 0.95,
    shadowRadius: 10,
  },
  label: {
    bottom: 1,
    fontSize: 10,
    fontWeight: '700',
    position: 'absolute',
    textAlign: 'center',
  },
});
