import { useCallback } from 'react';

import {
  initPadsEngine,
  triggerPadForBank,
} from '../../instruments/pads/padsEngine';
import type { PadSoundId } from '../../instruments/pads/padsSounds';
import { InstrumentIntroCard, type IntroMotifStep } from './InstrumentIntroCard';
import { PadsArt } from './PadsArt';

/**
 * Electronic launchpad-performance motif on the FX bank — chord stab,
 * laser, whoosh, then a boom+stab slam on the handover tick. Nothing like
 * the drums card: this is the pads' own sound world.
 */
const MOTIF: IntroMotifStep[] = [
  { key: 'pad14', atMs: 0 },
  { key: 'pad13', atMs: 150 },
  { key: 'pad07', atMs: 300 },
  { key: 'pad16', atMs: 450 },
  { key: 'pad14', atMs: 450 },
];

type PadsIntroCardProps = {
  title: string;
  description: string;
  onIntroStart?: () => void;
  onFinished: () => void;
};

export function PadsIntroCard({
  title,
  description,
  onIntroStart,
  onFinished,
}: PadsIntroCardProps) {
  const playSound = useCallback((key: string) => {
    // Explicit bank — the motif must not depend on the last UI selection.
    triggerPadForBank('fx', key as PadSoundId, 1);
  }, []);

  return (
    <InstrumentIntroCard
      description={description}
      motif={MOTIF}
      onFinished={onFinished}
      onIntroStart={onIntroStart}
      playSound={playSound}
      preload={initPadsEngine}
      renderArt={(hitAnims) => <PadsArt keyAnims={hitAnims} />}
      title={title}
    />
  );
}
