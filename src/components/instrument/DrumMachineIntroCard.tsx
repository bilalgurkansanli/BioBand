import { useCallback, useMemo, useState } from 'react';

import { DRUM_MACHINE_BANKS } from '../../instruments/drumMachine/drumMachineBanks';
import { DRUM_MACHINE_PRESETS } from '../../instruments/drumMachine/drumMachinePresets';
import { initDrumsEngine, playHit } from '../../instruments/drums/drumsEngine';
import type { DrumSoundId } from '../../instruments/drums/drumsSounds';
import { DrumMachineArt } from './DrumMachineArt';
import { InstrumentIntroCard, type IntroMotifStep } from './InstrumentIntroCard';

/**
 * Fast preview tempo — the machine "demos" its beat in about a second
 * instead of a full-tempo bar, then hands over on the last column.
 */
const STEP_MS = 75;

/** Drums-bank row order — row index in a preset grid → drum sound id. */
const ROW_SOUNDS = DRUM_MACHINE_BANKS.drums.rows.map(
  (row) => row.playKey as DrumSoundId,
);

/** Cell levels: accent (2) full velocity, normal (1) softer — like playback. */
const LEVEL_VELOCITY = [0, 0.72, 1];

type DrumMachineIntroCardProps = {
  title: string;
  description: string;
  onIntroStart?: () => void;
  onFinished: () => void;
};

export function DrumMachineIntroCard({
  title,
  description,
  onIntroStart,
  onFinished,
}: DrumMachineIntroCardProps) {
  // A different built-in beat each time the list mounts — rock, trap,
  // çiftetelli... the card shows and plays whichever came up.
  const [preset] = useState(
    () => DRUM_MACHINE_PRESETS[Math.floor(Math.random() * DRUM_MACHINE_PRESETS.length)],
  );

  // One motif step per grid column: the playhead sweeps left to right and
  // each column fires every sound programmed in it.
  const motif = useMemo<IntroMotifStep[]>(() => {
    const stepCount = preset.grid[0]?.length ?? 16;
    return Array.from({ length: stepCount }, (_, step) => ({
      key: `step:${step}`,
      atMs: step * STEP_MS,
    }));
  }, [preset]);

  const playSound = useCallback(
    (key: string) => {
      const step = Number(key.slice('step:'.length));
      preset.grid.forEach((cells, rowIndex) => {
        const level = cells[step] ?? 0;
        if (level > 0) {
          playHit(ROW_SOUNDS[rowIndex], LEVEL_VELOCITY[level]);
        }
      });
    },
    [preset],
  );

  return (
    <InstrumentIntroCard
      description={description}
      motif={motif}
      onFinished={onFinished}
      onIntroStart={onIntroStart}
      playSound={playSound}
      preload={initDrumsEngine}
      renderArt={(hitAnims) => <DrumMachineArt grid={preset.grid} keyAnims={hitAnims} />}
      title={title}
    />
  );
}
