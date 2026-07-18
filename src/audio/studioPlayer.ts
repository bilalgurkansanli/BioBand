import { createAudioPlayer, type AudioPlayer } from 'expo-audio';

import { restorePlaybackAudioMode } from './initAudio';
import { stopAllVoices } from './sampleBank';
import { initDrumsEngine, playHit, releaseDrumsEngine } from '../instruments/drums/drumsEngine';
import type { DrumSoundId } from '../instruments/drums/drumsSounds';
import {
  initGuitarEngine,
  playGuitarSoundId,
  releaseGuitarEngine,
} from '../instruments/guitar/guitarEngine';
import { initPadsEngine, releasePadsEngine, triggerPad } from '../instruments/pads/padsEngine';
import type { PadSoundId } from '../instruments/pads/padsSounds';
import {
  initPianoEngine,
  playNote as playPianoNote,
  releasePianoEngine,
} from '../instruments/piano/pianoEngine';
import type { NoteId } from '../instruments/piano/pianoNotes';
import {
  initViolinEngine,
  playViolinSoundId,
  releaseViolinEngine,
} from '../instruments/violin/violinEngine';
import type { InstrumentId } from '../types/recording';
import {
  getProjectDurationMs,
  isTrackAudible,
  type StudioProject,
  type StudioTrack,
} from '../types/studio';

export type StudioPlaybackHandle = {
  stop: () => void;
};

export type StudioPlayOptions = {
  /** Track ids to skip (e.g. armed overdub slot — unused for beds). */
  excludeTrackIds?: string[];
  onEnded?: () => void;
};

const loadedEngines = new Set<InstrumentId>();
let activeCancel: (() => void) | null = null;
let activeMicPlayers: AudioPlayer[] = [];

async function ensureEngine(instrument: InstrumentId): Promise<void> {
  if (loadedEngines.has(instrument)) {
    return;
  }
  switch (instrument) {
    case 'piano':
      await initPianoEngine();
      break;
    case 'drums':
      await initDrumsEngine();
      break;
    case 'guitar':
      await initGuitarEngine();
      break;
    case 'violin':
      await initViolinEngine();
      break;
    case 'pads':
      await initPadsEngine();
      break;
  }
  loadedEngines.add(instrument);
}

function releaseEngine(instrument: InstrumentId): void {
  switch (instrument) {
    case 'piano':
      releasePianoEngine();
      break;
    case 'drums':
      releaseDrumsEngine();
      break;
    case 'guitar':
      releaseGuitarEngine();
      break;
    case 'violin':
      releaseViolinEngine();
      break;
    case 'pads':
      releasePadsEngine();
      break;
  }
  loadedEngines.delete(instrument);
}

function playInstrumentEvent(instrument: InstrumentId, soundId: string): void {
  switch (instrument) {
    case 'piano':
      playPianoNote(soundId as NoteId);
      return;
    case 'drums':
      playHit(soundId as DrumSoundId);
      return;
    case 'pads':
      triggerPad(soundId as PadSoundId);
      return;
    case 'guitar':
      playGuitarSoundId(soundId);
      return;
    case 'violin':
      playViolinSoundId(soundId);
      return;
  }
}

function stopMicPlayers(): void {
  for (const player of activeMicPlayers) {
    try {
      player.pause();
      player.remove();
    } catch {
      // Already released.
    }
  }
  activeMicPlayers = [];
}

function stopActivePlayback(): void {
  if (activeCancel) {
    activeCancel();
    activeCancel = null;
  }
  stopMicPlayers();
  stopAllVoices();
}

export function stopStudioPlayback(): void {
  stopActivePlayback();
}

export function releaseStudioPlaybackResources(): void {
  stopActivePlayback();
  for (const instrument of [...loadedEngines]) {
    releaseEngine(instrument);
  }
}

function audibleTracks(project: StudioProject, excludeTrackIds?: string[]): StudioTrack[] {
  const exclude = new Set(excludeTrackIds ?? []);
  return project.tracks.filter(
    (track) => !exclude.has(track.id) && isTrackAudible(track, project.tracks),
  );
}

/**
 * Play all audible Studio tracks on one clock.
 * Keeps instrument engines warm across plays (no release on stop).
 */
export async function playStudioProject(
  project: StudioProject,
  options: StudioPlayOptions = {},
): Promise<StudioPlaybackHandle> {
  stopActivePlayback();
  await restorePlaybackAudioMode();

  const tracks = audibleTracks(project, options.excludeTrackIds);
  const durationMs = getProjectDurationMs({ ...project, tracks: project.tracks });
  const onEnded = options.onEnded;

  if (tracks.length === 0 || durationMs <= 0) {
    onEnded?.();
    return { stop: stopActivePlayback };
  }

  const instruments = new Set(tracks.map((track) => track.instrument));
  await Promise.all([...instruments].map((instrument) => ensureEngine(instrument)));

  const timers: ReturnType<typeof setTimeout>[] = [];
  let finished = false;

  const finish = () => {
    if (finished) {
      return;
    }
    finished = true;
    for (const timer of timers) {
      clearTimeout(timer);
    }
    timers.length = 0;
    stopMicPlayers();
    stopAllVoices();
    activeCancel = null;
    onEnded?.();
  };

  for (const track of tracks) {
    if (track.mode === 'microphone' && track.audioUri) {
      const player = createAudioPlayer({ uri: track.audioUri });
      player.volume = track.volume;
      activeMicPlayers.push(player);
      void player.seekTo(0).then(() => {
        if (!finished && activeMicPlayers.includes(player)) {
          player.play();
        }
      });
      continue;
    }

    if (track.mode === 'instrument' && track.events) {
      for (const event of track.events) {
        if (event.atMs > track.durationMs) {
          continue;
        }
        timers.push(
          setTimeout(() => {
            if (finished) {
              return;
            }
            playInstrumentEvent(track.instrument, event.soundId);
          }, event.atMs),
        );
      }
    }
  }

  timers.push(setTimeout(finish, Math.max(durationMs, 0) + 50));

  activeCancel = () => {
    finished = true;
    for (const timer of timers) {
      clearTimeout(timer);
    }
    timers.length = 0;
  };

  return {
    stop: () => {
      stopActivePlayback();
    },
  };
}
