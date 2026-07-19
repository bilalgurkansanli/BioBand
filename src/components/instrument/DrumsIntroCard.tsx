import { useCallback } from 'react';

import { initDrumsEngine, playHit } from '../../instruments/drums/drumsEngine';
import type { DrumSoundId } from '../../instruments/drums/drumsSounds';
import { DrumsArt } from './DrumsArt';
import { InstrumentIntroCard, type IntroMotifStep } from './InstrumentIntroCard';

/**
 * Short "drums wake up" fill — kick, snare, floor tom, then a kick+crash
 * slam right on the handover tick so the crash rings into the drums screen.
 */
const MOTIF: IntroMotifStep[] = [
  { key: 'kick', atMs: 0 },
  { key: 'snare', atMs: 150 },
  { key: 'tomLow', atMs: 300 },
  { key: 'crash', atMs: 450 },
  { key: 'kick', atMs: 450 },
];

type DrumsIntroCardProps = {
  title: string;
  description: string;
  onIntroStart?: () => void;
  onFinished: () => void;
};

export function DrumsIntroCard({
  title,
  description,
  onIntroStart,
  onFinished,
}: DrumsIntroCardProps) {
  const playSound = useCallback((key: string) => {
    playHit(key as DrumSoundId, 1);
  }, []);

  return (
    <InstrumentIntroCard
      description={description}
      motif={MOTIF}
      onFinished={onFinished}
      onIntroStart={onIntroStart}
      playSound={playSound}
      preload={initDrumsEngine}
      renderArt={(hitAnims) => <DrumsArt keyAnims={hitAnims} />}
      title={title}
    />
  );
}
