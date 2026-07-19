import { useCallback } from 'react';

import { initPianoEngine, playNote } from '../../instruments/piano/pianoEngine';
import type { NoteId } from '../../instruments/piano/pianoNotes';
import { InstrumentIntroCard, type IntroMotifStep } from './InstrumentIntroCard';
import { PianoArt } from './PianoArt';

/** Rising "piano wakes up" motif — every note sits on the card's octave. */
const MOTIF: IntroMotifStep[] = [
  { key: 'C4', atMs: 0 },
  { key: 'E4', atMs: 150 },
  { key: 'G4', atMs: 300 },
  { key: 'C5', atMs: 450 },
];

type PianoIntroCardProps = {
  title: string;
  description: string;
  onIntroStart?: () => void;
  onFinished: () => void;
};

export function PianoIntroCard({
  title,
  description,
  onIntroStart,
  onFinished,
}: PianoIntroCardProps) {
  const playSound = useCallback((key: string) => {
    playNote(key as NoteId, 0, 'acoustic');
  }, []);

  return (
    <InstrumentIntroCard
      description={description}
      motif={MOTIF}
      onFinished={onFinished}
      onIntroStart={onIntroStart}
      playSound={playSound}
      preload={initPianoEngine}
      renderArt={(hitAnims) => <PianoArt keyAnims={hitAnims} />}
      title={title}
    />
  );
}
