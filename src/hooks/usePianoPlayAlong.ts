import type { NoteId } from '../instruments/piano/pianoNotes';
import { getSongById, PIANO_SONGS } from '../instruments/piano/songs/catalog';
import { resolvePlaySession } from '../instruments/piano/songs/resolvePlaySession';
import type {
  PlayMode,
  SongDefinition,
  SongEvent,
  SongScope,
} from '../instruments/piano/songs/types';
import type { NotePerformance } from '../instruments/shared/songPerformance';
import {
  TEMPO_RATES,
  usePlayAlongSession,
  type PlayAlongAdapter,
} from '../playAlong/usePlayAlongSession';
import { recordFeatureUse } from '../storage/profileProgressStorage';

export type { PlayMode, SongScope };
export type {
  PlayAlongPhase,
  PlayAlongProgress,
  PlayAlongResults,
  PlayTempo,
  SupportLevel,
} from '../playAlong/usePlayAlongSession';
export { TEMPO_RATES };

const PIANO: PlayAlongAdapter<SongEvent, SongDefinition, 'piano'> = {
  instrument: 'piano',
  soloMode: 'piano',
  catalog: PIANO_SONGS,
  findCatalogSong: getSongById,
  resolveSession: resolvePlaySession,
  idOf: (event) => event.noteId,
  sustains: true,
  // An accompaniment written on the keys sounds an octave or two down.
  transposeOf: (event) => event.transpose,
  penalizeMistimed: true,
  activeDuringWizard: false,
  replayRestarts: true,
  bandSkipsLevelPick: true,
  pressAlwaysSounds: true,
  onOpen: () => void recordFeatureUse('tutorialOpened'),
  onFinish: () => void recordFeatureUse('tutorialFinished'),
};

export function usePianoPlayAlong(
  playNote: (noteId: NoteId, performance?: NotePerformance) => void,
  extraSongs: SongDefinition[] = [],
  onUserSongOffsetSaved?: (songId: string, eventsStartMs: number) => void,
) {
  const session = usePlayAlongSession(
    PIANO,
    (id, performance) => playNote(id as NoteId, performance),
    extraSongs,
    onUserSongOffsetSaved,
  );
  const handleNotePress: (noteId: NoteId) => void = session.handlePress;

  return {
    songs: session.songs,
    phase: session.phase,
    selectedSong: session.selectedSong,
    playMode: session.playMode,
    songScope: session.songScope,
    level: session.level,
    tempo: session.tempo,
    countdownValue: session.countdownValue,
    guideNoteId: session.guideId as NoteId | null,
    progress: session.progress,
    results: session.results,
    demoJustFinished: session.demoJustFinished,
    isActive: session.isActive,
    isListeningOutro: session.isListeningOutro,
    hasBackingAudio: session.hasBackingAudio,
    hasPianoLessBacking: session.hasStemBacking,
    calibrateOffsetMs: session.calibrateOffsetMs,
    calibratePreviewing: session.calibratePreviewing,
    audioBusy: session.audioBusy,
    offsetMinMs: session.offsetMinMs,
    offsetMaxMs: session.offsetMaxMs,
    open: session.open,
    close: session.close,
    selectSong: session.selectSong,
    selectPlayMode: session.selectPlayMode,
    selectScope: session.selectScope,
    selectLevel: session.selectLevel,
    setTempo: session.setTempo,
    goBack: session.goBack,
    backToSongList: session.backToSongList,
    replay: session.replay,
    handleNotePress,
    pickBackingAudio: session.pickBackingAudio,
    pickPianoLessBacking: session.pickStemBacking,
    setCalibrateOffset: session.setCalibrateOffset,
    previewCalibrate: session.previewCalibrate,
    stopCalibratePreview: session.stopCalibratePreview,
    confirmCalibrate: session.confirmCalibrate,
    openRecalibrate: session.openRecalibrate,
  };
}
