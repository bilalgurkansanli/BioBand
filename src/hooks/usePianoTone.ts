import { useCallback, useMemo, useState } from 'react';

export const PIANO_TONE_MIN_SEMITONES = -12;
export const PIANO_TONE_MAX_SEMITONES = 12;
export const PIANO_TONE_CENTER_POSITION = 0.5;
export const PIANO_TONE_STEP = 1 / (PIANO_TONE_MAX_SEMITONES - PIANO_TONE_MIN_SEMITONES);

export function tonePositionToSemitones(position: number): number {
  const clamped = Math.max(0, Math.min(1, position));
  return Math.round(
    PIANO_TONE_MIN_SEMITONES +
      clamped * (PIANO_TONE_MAX_SEMITONES - PIANO_TONE_MIN_SEMITONES),
  );
}

export function usePianoTone() {
  const [tonePosition, setTonePositionRaw] = useState(PIANO_TONE_CENTER_POSITION);

  const semitoneOffset = useMemo(
    () => tonePositionToSemitones(tonePosition),
    [tonePosition],
  );

  const setTonePosition = useCallback((position: number) => {
    setTonePositionRaw(Math.max(0, Math.min(1, position)));
  }, []);

  const jumpLow = useCallback(() => setTonePosition(0), [setTonePosition]);
  const jumpHigh = useCallback(() => setTonePosition(1), [setTonePosition]);
  const jumpCenter = useCallback(
    () => setTonePosition(PIANO_TONE_CENTER_POSITION),
    [setTonePosition],
  );

  const stepThicker = useCallback(() => {
    setTonePosition(tonePosition - PIANO_TONE_STEP);
  }, [setTonePosition, tonePosition]);

  const stepThinner = useCallback(() => {
    setTonePosition(tonePosition + PIANO_TONE_STEP);
  }, [setTonePosition, tonePosition]);

  return useMemo(
    () => ({
      tonePosition,
      semitoneOffset,
      setTonePosition,
      jumpLow,
      jumpHigh,
      jumpCenter,
      stepThicker,
      stepThinner,
      canStepThicker: tonePosition > 0,
      canStepThinner: tonePosition < 1,
      isCenter: Math.abs(tonePosition - PIANO_TONE_CENTER_POSITION) < PIANO_TONE_STEP / 2,
    }),
    [
      tonePosition,
      semitoneOffset,
      setTonePosition,
      jumpLow,
      jumpHigh,
      jumpCenter,
      stepThicker,
      stepThinner,
    ],
  );
}
