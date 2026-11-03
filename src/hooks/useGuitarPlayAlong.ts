import { getGuitarSongById, GUITAR_SONGS } from '../instruments/guitar/songs/catalog';
import { resolveGuitarPlaySession } from '../instruments/guitar/songs/resolvePlaySession';
import type {
  GuitarSongDefinition,
  GuitarSongEvent,
  GuitarSongScope,
  PlayMode,
} from '../instruments/guitar/songs/types';
import type { NotePerformance } from '../instruments/shared/songPerformance';
import {
  TEMPO_RATES,
  usePlayAlongSession,
  type PlayAlongAdapter,
  type PlayAlongPhase,
  type PlayAlongProgress,
  type PlayAlongResults,
} from '../playAlong/usePlayAlongSession';

export type { PlayMode, GuitarSongScope };
export type { PlayTempo, SupportLevel } from '../playAlong/usePlayAlongSession';
export { TEMPO_RATES };

export type GuitarPlayAlongPhase = PlayAlongPhase;
export type GuitarPlayAlongResults = PlayAlongResults;
export type GuitarPlayAlongProgress = PlayAlongProgress;

const GUITAR: PlayAlongAdapter<GuitarSongEvent, GuitarSongDefinition, 'guitar'> = {
  instrument: 'guitar',
  soloMode: 'guitar',
  catalog: GUITAR_SONGS,
  findCatalogSong: getGuitarSongById,
  resolveSession: resolveGuitarPlaySession,
  idOf: (event) => event.soundId,
  sustains: true,
  penalizeMistimed: true,
  activeDuringWizard: true,
  replayRestarts: false,
  bandSkipsLevelPick: false,
  pressAlwaysSounds: false,
};

export function useGuitarPlayAlong(
  playSoundId: (soundId: string, performance?: NotePerformance) => void,
  extraSongs: GuitarSongDefinition[] = [],
  onUserSongOffsetSaved?: (songId: string, eventsStartMs: number) => void,
) {
  const session = usePlayAlongSession(GUITAR, playSoundId, extraSongs, onUserSongOffsetSaved);
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
