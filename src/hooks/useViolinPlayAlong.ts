import type { NotePerformance } from '../instruments/shared/songPerformance';
import { getViolinSongById, VIOLIN_SONGS } from '../instruments/violin/songs/catalog';
import { resolveViolinPlaySession } from '../instruments/violin/songs/resolvePlaySession';
import type {
  PlayMode,
  ViolinSongDefinition,
  ViolinSongEvent,
  ViolinSongScope,
} from '../instruments/violin/songs/types';
import {
  TEMPO_RATES,
  usePlayAlongSession,
  type PlayAlongAdapter,
  type PlayAlongPhase,
  type PlayAlongProgress,
  type PlayAlongResults,
} from '../playAlong/usePlayAlongSession';

export type { PlayMode, ViolinSongScope };
export type { PlayTempo, SupportLevel } from '../playAlong/usePlayAlongSession';
export { TEMPO_RATES };

export type ViolinPlayAlongPhase = PlayAlongPhase;
export type ViolinPlayAlongResults = PlayAlongResults;
export type ViolinPlayAlongProgress = PlayAlongProgress;

const VIOLIN: PlayAlongAdapter<ViolinSongEvent, ViolinSongDefinition, 'violin'> = {
  instrument: 'violin',
  soloMode: 'violin',
  catalog: VIOLIN_SONGS,
  findCatalogSong: getViolinSongById,
  resolveSession: resolveViolinPlaySession,
  idOf: (event) => event.soundId,
  sustains: true,
  penalizeMistimed: true,
  activeDuringWizard: true,
  replayRestarts: false,
  bandSkipsLevelPick: false,
  pressAlwaysSounds: false,
};

export function useViolinPlayAlong(
  playSoundId: (soundId: string, performance?: NotePerformance) => void,
  extraSongs: ViolinSongDefinition[] = [],
  onUserSongOffsetSaved?: (songId: string, eventsStartMs: number) => void,
) {
  const session = usePlayAlongSession(VIOLIN, playSoundId, extraSongs, onUserSongOffsetSaved);
  const handleSoundPress: (soundId: string, options?: { skipPlayback?: boolean }) => void =
    session.handlePress;

  return {
    phase: session.phase,
    selectedSong: session.selectedSong,
    playMode: session.playMode,
    songScope: session.songScope,
    level: session.level,
    tempo: session.tempo,
    countdownValue: session.countdownValue,
    guideSoundId: session.guideId,
    progress: session.progress,
    results: session.results,
    demoJustFinished: session.demoJustFinished,
    isActive: session.isActive,
    isListeningOutro: session.isListeningOutro,
    hasBackingAudio: session.hasBackingAudio,
    calibrateOffsetMs: session.calibrateOffsetMs,
    calibratePreviewing: session.calibratePreviewing,
    audioBusy: session.audioBusy,
    offsetMinMs: session.offsetMinMs,
    offsetMaxMs: session.offsetMaxMs,
    songs: session.songs,
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
    handleSoundPress,
    pickBackingAudio: session.pickBackingAudio,
    setCalibrateOffset: session.setCalibrateOffset,
    previewCalibrate: session.previewCalibrate,
    stopCalibratePreview: session.stopCalibratePreview,
    confirmCalibrate: session.confirmCalibrate,
  };
}
