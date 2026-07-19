import { useCallback } from 'react';

import {
  initViolinEngine,
  playViolinSoundId,
} from '../../instruments/violin/violinEngine';
import { InstrumentIntroCard, type IntroMotifStep } from './InstrumentIntroCard';
import { ViolinArt } from './ViolinArt';

/**
 * The four open strings bowed low to high — G, D, A, E — the most iconic
 * violin gesture there is. Arco strokes speak slower than plucks, so the
 * steps sit a bit wider apart; the high E lands on the handover tick and
 * sings into the violin screen.
 */
const MOTIF: IntroMotifStep[] = [
  { key: 'v4:0', atMs: 0 },
  { key: 'v3:0', atMs: 170 },
  { key: 'v2:0', atMs: 340 },
  { key: 'v1:0', atMs: 510 },
];

type ViolinIntroCardProps = {
  title: string;
  description: string;
  onIntroStart?: () => void;
  onFinished: () => void;
};

export function ViolinIntroCard({
  title,
  description,
  onIntroStart,
  onFinished,
}: ViolinIntroCardProps) {
  const playSound = useCallback((key: string) => {
    playViolinSoundId(key);
  }, []);

  return (
    <InstrumentIntroCard
      description={description}
      motif={MOTIF}
      onFinished={onFinished}
      onIntroStart={onIntroStart}
      playSound={playSound}
      preload={initViolinEngine}
      renderArt={(hitAnims) => <ViolinArt keyAnims={hitAnims} />}
      title={title}
    />
  );
}
