import { StyleSheet, View } from 'react-native';

type ViolinNoteCellProps = {
  isActive: boolean;
  isOpenString: boolean;
  isGuide: boolean;
  strongGuide: boolean;
  guideAccent: string;
  stringColor: string;
  nutColor: string;
  positionDotColor: string;
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
  width,
  height,
}: ViolinNoteCellProps) {
  const padSize = Math.min(width - 4, height - 8, isOpenString ? 22 : 18);
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
});
