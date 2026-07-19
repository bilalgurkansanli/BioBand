import { useCallback } from 'react';

import {
  initGuitarEngine,
  playGuitarSoundId,
} from '../../instruments/guitar/guitarEngine';
import { GuitarArt } from './GuitarArt';
import { InstrumentIntroCard, type IntroMotifStep } from './InstrumentIntroCard';

/**
 * Opening G-major strum, low string to high — the last (highest) pluck
 * lands on the handover tick and rings into the guitar screen.
 */
const MOTIF: IntroMotifStep[] = [
  { key: 's6:f3', atMs: 0 },
  { key: 's5:f2', atMs: 80 },
  { key: 's4:f0', atMs: 160 },
  { key: 's3:f0', atMs: 240 },
  { key: 's2:f0', atMs: 320 },
  { key: 's1:f3', atMs: 400 },
];

type GuitarIntroCardProps = {
  title: string;
  description: string;
  onIntroStart?: () => void;
  onFinished: () => void;
};

export function GuitarIntroCard({
  title,
  description,
  onIntroStart,
  onFinished,
}: GuitarIntroCardProps) {
  const playSound = useCallback((key: string) => {
    playGuitarSoundId(key, 0.9);
  }, []);

  return (
    <InstrumentIntroCard
      description={description}
      motif={MOTIF}
      onFinished={onFinished}
      onIntroStart={onIntroStart}
      playSound={playSound}
      preload={initGuitarEngine}
      renderArt={(hitAnims) => <GuitarArt keyAnims={hitAnims} />}
      title={title}
    />
  );
}
