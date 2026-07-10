import { StyleSheet, View } from 'react-native';

import { colors } from '../../theme/colors';

type PlaySpeedHudProps = {
  notesPerSec: number;
  maxNotesPerSec?: number;
  visible?: boolean;
};

function barColor(ratio: number): string {
  if (ratio < 0.35) {
    return colors.accent;
  }
  if (ratio < 0.7) {
    return '#FFB74D';
  }
  return '#FF8A65';
}

export function PlaySpeedHud({
  notesPerSec,
  maxNotesPerSec = 8,
  visible = true,
}: PlaySpeedHudProps) {
  if (!visible) {
    return null;
  }

  const ratio = Math.max(0, Math.min(1, notesPerSec / maxNotesPerSec));

  return (
    <View style={styles.track}>
      <View
        style={[
          styles.fill,
          {
            backgroundColor: barColor(ratio),
            opacity: ratio < 0.02 ? 0.15 : 0.85,
            width: `${Math.max(ratio * 100, ratio > 0 ? 4 : 0)}%`,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    backgroundColor: '#2C2C2E',
    height: 6,
    marginHorizontal: 8,
    marginVertical: 4,
    overflow: 'hidden',
    borderRadius: 3,
  },
  fill: {
    borderRadius: 3,
    height: '100%',
  },
});
