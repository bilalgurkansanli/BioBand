import { createAudioPlayer, type AudioPlayer } from 'expo-audio';

import { restorePlaybackAudioMode } from './initAudio';
import { stopAllVoices } from './sampleBank';
import {
  initDrumsEngine,
  playHit,
  releaseDrumsEngine,
  setDrumKit,
} from '../instruments/drums/drumsEngine';
import { isDrumKitId } from '../instruments/drums/drumsKits';
import type { DrumSoundId } from '../instruments/drums/drumsSounds';
import {
  initGuitarEngine,
  playGuitarSoundId,
  releaseGuitarEngine,
  setGuitarVoice,
} from '../instruments/guitar/guitarEngine';
import { isGuitarVoiceId } from '../instruments/guitar/guitarVoices';
import {
  initPadsEngine,
  releasePadsEngine,
  triggerPadForBank,
} from '../instruments/pads/padsEngine';
import { isPadBankId, type PadBankId } from '../instruments/pads/padsBanks';
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
  setViolinVoice,
  stopViolinPhrases,
} from '../instruments/violin/violinEngine';
import { isViolinVoiceId } from '../instruments/violin/violinVoices';
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

function playInstrumentEvent(
  instrument: InstrumentId,
  soundId: string,
  velocity?: number,
  padBankId: PadBankId = 'drums',
  gainScale = 1,
): void {
  switch (instrument) {
    case 'piano':
      playPianoNote(soundId as NoteId, undefined, undefined, gainScale);
      return;
    case 'drums':
      playHit(soundId as DrumSoundId, velocity, gainScale);
      return;
    case 'pads':
      // Per-track bank — looper exports layer tracks from different banks.
      triggerPadForBank(padBankId, soundId as PadSoundId, velocity ?? 1, gainScale);
      return;
    case 'guitar':
      playGuitarSoundId(soundId, velocity, gainScale);
      return;
    case 'violin':
      playViolinSoundId(soundId, gainScale);
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
  // Cancel violin phrase notes still scheduled inside the engine.
  stopViolinPhrases();
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

  // The drums bus is global, so one kit per play: use the first drums track's
  // recorded kit (older tracks without one fall back to acoustic).
  const drumsTrack = tracks.find((track) => track.instrument === 'drums');
  if (drumsTrack) {
    setDrumKit(isDrumKitId(drumsTrack.drumKitId) ? drumsTrack.drumKitId : 'acoustic');
  }

  // The guitar bus is global too — one voice per play, first guitar track wins.
  const guitarTrack = tracks.find((track) => track.instrument === 'guitar');
  if (guitarTrack) {
    setGuitarVoice(
      isGuitarVoiceId(guitarTrack.guitarVoiceId) ? guitarTrack.guitarVoiceId : 'nylon',
    );
  }

  // Same for violin — first violin track's voice wins.
  const violinTrack = tracks.find((track) => track.instrument === 'violin');
  if (violinTrack) {
    setViolinVoice(
      isViolinVoiceId(violinTrack.violinVoiceId) ? violinTrack.violinVoiceId : 'classic',
    );
  }

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
    stopViolinPhrases();
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
      const trackPadBank: PadBankId = isPadBankId(track.padBankId)
        ? track.padBankId
        : 'drums';
      for (const event of track.events) {
        if (event.atMs > track.durationMs) {
          continue;
        }
        timers.push(
          setTimeout(() => {
            if (finished) {
              return;
            }
            playInstrumentEvent(
              track.instrument,
              event.soundId,
              event.velocity,
              trackPadBank,
              track.volume,
            );
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
