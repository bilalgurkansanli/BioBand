import { useCallback, useEffect, useRef, useState } from 'react';

import { scheduleSongPlayback } from '../instruments/piano/songPlayer';
import { getSongById, PIANO_SONGS } from '../instruments/piano/songs/catalog';
import type { SongDefinition } from '../instruments/piano/songs/types';
import type { NoteId } from '../instruments/piano/pianoNotes';

export type TutorialPhase =
  | 'idle'
  | 'pickSong'
  | 'readyToWatch'
  | 'watching'
  | 'practice'
  | 'complete';

export function usePianoTutorial(playNote: (noteId: NoteId) => void) {
  const [phase, setPhase] = useState<TutorialPhase>('idle');
  const [selectedSong, setSelectedSong] = useState<SongDefinition | null>(null);
  const [demoNoteId, setDemoNoteId] = useState<NoteId | null>(null);
  const [guideNoteId, setGuideNoteId] = useState<NoteId | null>(null);
  const [practiceIndex, setPracticeIndex] = useState(0);

  const cancelPlaybackRef = useRef<(() => void) | null>(null);
  const endWatchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearPlayback = useCallback(() => {
    cancelPlaybackRef.current?.();
    cancelPlaybackRef.current = null;

    if (endWatchTimerRef.current) {
      clearTimeout(endWatchTimerRef.current);
      endWatchTimerRef.current = null;
    }

    setDemoNoteId(null);
  }, []);

  useEffect(() => {
    return () => {
      clearPlayback();
    };
  }, [clearPlayback]);

  const openTutorial = useCallback(() => {
    clearPlayback();
    setSelectedSong(null);
    setGuideNoteId(null);
    setPracticeIndex(0);
    setPhase('pickSong');
  }, [clearPlayback]);

  const closeTutorial = useCallback(() => {
    clearPlayback();
    setSelectedSong(null);
    setGuideNoteId(null);
    setPracticeIndex(0);
    setPhase('idle');
  }, [clearPlayback]);

  const selectSong = useCallback((songId: string) => {
    const song = getSongById(songId);
    if (!song) {
      return;
    }

    setSelectedSong(song);
    setPhase('readyToWatch');
  }, []);

  const backToSongList = useCallback(() => {
    setPhase('pickSong');
  }, []);

  const startWatch = useCallback(() => {
    if (!selectedSong) {
      return;
    }

    clearPlayback();
    setPhase('watching');
    setGuideNoteId(null);

    cancelPlaybackRef.current = scheduleSongPlayback(
      selectedSong.events,
      selectedSong.previewDurationMs,
      {
        onNotePlay: playNote,
        onNoteHighlight: setDemoNoteId,
      },
    );

    endWatchTimerRef.current = setTimeout(() => {
      clearPlayback();
      setPhase('practice');
      setPracticeIndex(0);
      setGuideNoteId(selectedSong.events[0]?.noteId ?? null);
    }, selectedSong.previewDurationMs);
  }, [clearPlayback, playNote, selectedSong]);

  const handleNotePress = useCallback(
    (noteId: NoteId) => {
      if (phase === 'watching') {
        return;
      }

      if (phase !== 'practice' || !selectedSong) {
        playNote(noteId);
        return;
      }

      const expected = selectedSong.events[practiceIndex]?.noteId;
      if (noteId !== expected) {
        return;
      }

      playNote(noteId);

      const nextIndex = practiceIndex + 1;
      if (nextIndex >= selectedSong.events.length) {
        setGuideNoteId(null);
        setPhase('complete');
        return;
      }

      setPracticeIndex(nextIndex);
      setGuideNoteId(selectedSong.events[nextIndex]?.noteId ?? null);
    },
    [phase, playNote, practiceIndex, selectedSong],
  );

  return {
    songs: PIANO_SONGS,
    phase,
    selectedSong,
    demoNoteId,
    guideNoteId,
    openTutorial,
    closeTutorial,
    selectSong,
    backToSongList,
    startWatch,
    handleNotePress,
  };
}
