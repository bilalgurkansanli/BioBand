import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { DRUM_MACHINE_PRESETS } from '../../instruments/drumMachine/drumMachinePresets';
import type { InstrumentId } from '../../types/recording';
import { colors } from '../../theme/colors';
import { DrumMachineArt } from './DrumMachineArt';
import { DrumsArt } from './DrumsArt';
import { GuitarArt } from './GuitarArt';
import { PadsArt } from './PadsArt';
import { PianoArt } from './PianoArt';
import { ViolinArt } from './ViolinArt';

export type InstrumentArtVariant = InstrumentId | 'drumMachine' | 'microphone';

/** Fixed pattern shown behind drum-machine takes — the rock preset grid. */
const DEMO_GRID = DRUM_MACHINE_PRESETS[0].grid;

/** Static bar heights (0..1) for the microphone waveform art. */
const MIC_BARS = [
  0.3, 0.5, 0.75, 0.45, 0.9, 0.6, 0.35, 0.8, 0.55, 0.95, 0.5, 0.7,
  0.4, 0.85, 0.6, 0.3, 0.75, 0.5, 0.9, 0.45, 0.65, 0.35, 0.55, 0.4,
];

function MicWaveArt() {
  return (
    <View pointerEvents="none" style={styles.micRow}>
      {MIC_BARS.map((height, index) => (
        <View key={index} style={[styles.micBar, { height: `${height * 100}%` }]} />
      ))}
    </View>
  );
}

function artFor(variant: InstrumentArtVariant): ReactNode {
  switch (variant) {
    case 'piano':
      return <PianoArt />;
    case 'drums':
      return <DrumsArt />;
    case 'guitar':
      return <GuitarArt />;
    case 'violin':
      return <ViolinArt />;
    case 'pads':
      return <PadsArt />;
    case 'drumMachine':
      return <DrumMachineArt grid={DEMO_GRID} />;
    case 'microphone':
      return <MicWaveArt />;
  }
}

type InstrumentArtBackgroundProps = {
  variant: InstrumentArtVariant;
  /**
   * Darkness of the surface-colored veil over the art. Cards with small or
   * unshadowed text want a stronger veil than the instrument intro cards.
   */
  veilOpacity?: number;
};

/**
 * Static, non-interactive card background: the instrument's art under a
 * dimming veil. Same visual language as the instrument intro cards, minus
 * the animations — used wherever a card should say which instrument it
 * belongs to without an icon.
 */
export function InstrumentArtBackground({
  variant,
  veilOpacity = 0.6,
}: InstrumentArtBackgroundProps) {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {artFor(variant)}
      <View style={[styles.veil, { opacity: veilOpacity }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  veil: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.surface,
  },
  micRow: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
  },
  micBar: {
    backgroundColor: colors.accent,
    borderRadius: 2,
    width: 3.5,
  },
});
