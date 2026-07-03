import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { LAUNCH_PADS, type PadSoundId } from '../../instruments/pads/padsSounds';
import { LaunchPad } from './LaunchPad';

type PadGridProps = {
  width: number;
  height: number;
  onTrigger: (id: PadSoundId) => void;
};

const GRID_SIZE = 4;

export function PadGrid({ width, height, onTrigger }: PadGridProps) {
  const { t } = useTranslation();

  const padSize = useMemo(() => {
    const byWidth = width / GRID_SIZE;
    const byHeight = height / GRID_SIZE;
    return Math.max(64, Math.floor(Math.min(byWidth, byHeight)) - 8);
  }, [width, height]);

  return (
    <View style={[styles.grid, { width, height }]}>
      {LAUNCH_PADS.map((pad) => (
        <LaunchPad
          key={pad.id}
          color={pad.color}
          label={t(pad.labelKey)}
          onTrigger={() => onTrigger(pad.id)}
          size={padSize}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    alignContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
});
