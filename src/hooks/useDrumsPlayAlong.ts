import type { DrumSoundId } from '../instruments/drums/drumsSounds';
import { DRUM_SONGS, getDrumSongById } from '../instruments/drums/songs/catalog';
import { resolveDrumPlaySession } from '../instruments/drums/songs/resolvePlaySession';
import type {
  DrumSongDefinition,
  DrumSongEvent,
  DrumSongScope,
  PlayMode,
} from '../instruments/drums/songs/types';
import type { NotePerformance } from '../instruments/shared/songPerformance';
import {
  TEMPO_RATES,
  usePlayAlongSession,
  type PlayAlongAdapter,
  type PlayAlongPhase,
  type PlayAlongProgress,
  type PlayAlongResults,
} from '../playAlong/usePlayAlongSession';

export type { PlayMode, DrumSongScope };
export type { PlayTempo, SupportLevel } from '../playAlong/usePlayAlongSession';
export { TEMPO_RATES };

export type DrumsPlayAlongPhase = PlayAlongPhase;
export type DrumsPlayAlongResults = PlayAlongResults;
export type DrumsPlayAlongProgress = PlayAlongProgress;

const DRUMS: PlayAlongAdapter<DrumSongEvent, DrumSongDefinition, 'drums'> = {
  instrument: 'drums',
  soloMode: 'drums',
  catalog: DRUM_SONGS,
  findCatalogSong: getDrumSongById,
  resolveSession: resolveDrumPlaySession,
  idOf: (event) => event.padId,
  // A struck drum has no written length — the sample rings for as long as the
  // kit says — so unlike the pitched instruments there is no sustain.
  sustains: false,
  // The right pad just outside its window is not penalised: if it stays
  // unhit, the tick loop scores it as a single miss (no double punishment).
  penalizeMistimed: false,
  activeDuringWizard: true,
  replayRestarts: false,
  bandSkipsLevelPick: false,
  pressAlwaysSounds: false,
};

export function useDrumsPlayAlong(
  playHit: (id: DrumSoundId, velocity?: number, performance?: NotePerformance) => void,
  extraSongs: DrumSongDefinition[] = [],
  onUserSongOffsetSaved?: (songId: string, eventsStartMs: number) => void,
) {
  const session = usePlayAlongSession(
    DRUMS,
    (id, performance) => playHit(id as DrumSoundId, undefined, performance),
    extraSongs,
    onUserSongOffsetSaved,
  );
  const handlePadPress: (padId: DrumSoundId) => void = session.handlePress;

  return {
    phase: session.phase,
    selectedSong: session.selectedSong,
    playMode: session.playMode,
    songScope: session.songScope,
    level: session.level,
    tempo: session.tempo,
    countdownValue: session.countdownValue,
    guidePadId: session.guideId as DrumSoundId | null,
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
    handlePadPress,
    pickBackingAudio: session.pickBackingAudio,
    setCalibrateOffset: session.setCalibrateOffset,
    previewCalibrate: session.previewCalibrate,
    stopCalibratePreview: session.stopCalibratePreview,
    confirmCalibrate: session.confirmCalibrate,
  };
}
