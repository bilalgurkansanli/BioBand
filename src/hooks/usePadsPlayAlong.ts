import type { PadSoundId } from '../instruments/pads/padsSounds';
import { getPadSongById, PAD_SONGS } from '../instruments/pads/songs/catalog';
import { resolvePadPlaySession } from '../instruments/pads/songs/resolvePlaySession';
import type {
  PadSongDefinition,
  PadSongEvent,
  PadSongScope,
  PlayMode,
} from '../instruments/pads/songs/types';
import type { NotePerformance } from '../instruments/shared/songPerformance';
import {
  TEMPO_RATES,
  usePlayAlongSession,
  type PlayAlongAdapter,
  type PlayAlongPhase,
  type PlayAlongProgress,
  type PlayAlongResults,
} from '../playAlong/usePlayAlongSession';

export type { PlayMode, PadSongScope };
export type { PlayTempo, SupportLevel } from '../playAlong/usePlayAlongSession';
export { TEMPO_RATES };

export type PadsPlayAlongPhase = PlayAlongPhase;
export type PadsPlayAlongResults = PlayAlongResults;
export type PadsPlayAlongProgress = PlayAlongProgress;

const PADS: PlayAlongAdapter<PadSongEvent, PadSongDefinition, 'pads'> = {
  instrument: 'pads',
  soloMode: 'pads',
  catalog: PAD_SONGS,
  findCatalogSong: getPadSongById,
  resolveSession: resolvePadPlaySession,
  idOf: (event) => event.padId,
  sustains: true,
  penalizeMistimed: true,
  activeDuringWizard: false,
  replayRestarts: true,
  bandSkipsLevelPick: false,
  pressAlwaysSounds: true,
};

export function usePadsPlayAlong(
  triggerPad: (id: PadSoundId, velocity?: number, performance?: NotePerformance) => void,
  extraSongs: PadSongDefinition[] = [],
  onUserSongOffsetSaved?: (songId: string, eventsStartMs: number) => void,
) {
  const session = usePlayAlongSession(
    PADS,
    (id, performance) => triggerPad(id as PadSoundId, undefined, performance),
    extraSongs,
    onUserSongOffsetSaved,
  );
  const handlePadPress: (padId: PadSoundId) => void = session.handlePress;

  return {
    phase: session.phase,
    selectedSong: session.selectedSong,
    playMode: session.playMode,
    songScope: session.songScope,
    level: session.level,
    tempo: session.tempo,
    countdownValue: session.countdownValue,
    guidePadId: session.guideId as PadSoundId | null,
    progress: session.progress,
    results: session.results,
    demoJustFinished: session.demoJustFinished,
    isActive: session.isActive,
    isListeningOutro: session.isListeningOutro,
    hasBackingAudio: session.hasBackingAudio,
    hasPadLessBacking: session.hasStemBacking,
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
    handlePadPress,
    pickBackingAudio: session.pickBackingAudio,
    pickPadLessBacking: session.pickStemBacking,
    setCalibrateOffset: session.setCalibrateOffset,
    previewCalibrate: session.previewCalibrate,
    stopCalibratePreview: session.stopCalibratePreview,
    confirmCalibrate: session.confirmCalibrate,
    openRecalibrate: session.openRecalibrate,
  };
}
