import { createAudioPlayer, type AudioPlayer } from 'expo-audio';

import { acquireEngine, releaseEngine } from './engineRegistry';
import { restorePlaybackAudioMode } from './initAudio';
import { stopAllVoices } from './sampleBank';
import { startSongScheduler, type SongSchedulerHandle } from './songScheduler';
import { playHit, setDrumKit } from '../instruments/drums/drumsEngine';
import { isDrumKitId } from '../instruments/drums/drumsKits';
import type { DrumSoundId } from '../instruments/drums/drumsSounds';
import { playGuitarSoundId, setGuitarVoice } from '../instruments/guitar/guitarEngine';
import { isGuitarVoiceId } from '../instruments/guitar/guitarVoices';
import { triggerPadForBank } from '../instruments/pads/padsEngine';
import { isPadBankId, type PadBankId } from '../instruments/pads/padsBanks';
import type { PadSoundId } from '../instruments/pads/padsSounds';
import {
  playNote as playPianoNote,
  setPianoVoice,
} from '../instruments/piano/pianoEngine';
import type { NoteId } from '../instruments/piano/pianoNotes';
import { PIANO_VOICES, type PianoVoiceId } from '../instruments/piano/pianoVoices';
import type { NotePerformance } from '../instruments/shared/songPerformance';
import {
  playViolinSoundId,
  setViolinVoice,
  stopViolinPhrases,
} from '../instruments/violin/violinEngine';
import { isViolinVoiceId } from '../instruments/violin/violinVoices';
import type { InstrumentId } from '../types/recording';
import {
  getProjectDurationMs,
  getTrackStartMs,
  isTrackAudible,
  type StudioProject,
  type StudioTrack,
} from '../types/studio';

export type StudioPlaybackHandle = {
  stop: () => void;
  /** Jumps the whole mix to a position in ms (reschedules every track). */
  seek: (positionMs: number) => void;
};

export type StudioPlayOptions = {
  /** Track ids to skip (e.g. armed overdub slot — unused for beds). */
  excludeTrackIds?: string[];
  onEnded?: () => void;
  /** Where to begin playback, in ms from project start (default 0). */
  startAtMs?: number;
  /** Periodic playback position, so the UI can drive a playhead/seek. */
  onProgress?: (positionMs: number, durationMs: number) => void;
  /** Restart from 0 when the mix ends instead of stopping. */
  loop?: boolean;
  /** Tempo multiplier — 1 plays as recorded, 2 plays twice as fast. */
  rate?: number;
};

/** Registry references this module holds, so its own release stays balanced. */
const heldEngines = new Set<InstrumentId>();
let activeCancel: (() => void) | null = null;
let activeMicPlayers: AudioPlayer[] = [];

async function holdEngine(instrument: InstrumentId): Promise<void> {
  if (heldEngines.has(instrument)) {
    return;
  }
  // Recorded before awaiting: acquireEngine takes its reference synchronously,
  // so a teardown landing mid-load still sees one to give back.
  heldEngines.add(instrument);
  await acquireEngine(instrument);
}

function playInstrumentEvent(
  instrument: InstrumentId,
  soundId: string,
  velocity: number | undefined,
  padBankId: PadBankId,
  gainScale: number,
  atContextTime: number,
): void {
  // Absolute audio-context onset, straight through to the engine. In a mix this
  // matters more than anywhere else: every track is timed off the same clock,
  // so a late JS timer would not just drag one note, it would pull that track
  // out of alignment with the others.
  const performance: NotePerformance = { atTime: atContextTime };
  switch (instrument) {
    case 'piano':
      playPianoNote(soundId as NoteId, undefined, undefined, gainScale, performance);
      return;
    case 'drums':
      playHit(soundId as DrumSoundId, velocity, gainScale, performance);
      return;
    case 'pads':
      // Per-track bank — looper exports layer tracks from different banks.
      triggerPadForBank(padBankId, soundId as PadSoundId, velocity ?? 1, gainScale, performance);
      return;
    case 'guitar':
      playGuitarSoundId(soundId, velocity, gainScale, performance);
      return;
    case 'violin':
      playViolinSoundId(soundId, gainScale, performance);
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
  for (const instrument of heldEngines) {
    releaseEngine(instrument);
  }
  heldEngines.clear();
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
  const onProgress = options.onProgress;
  const loop = options.loop ?? false;
  // All scheduling below works in "material time" (the ms stored on tracks);
  // wall-clock delays are that time divided by the rate.
  const rate = Math.max(0.1, options.rate ?? 1);
  const initialStartAtMs = Math.max(0, Math.min(options.startAtMs ?? 0, durationMs));

  if (tracks.length === 0 || durationMs <= 0) {
    onEnded?.();
    return { stop: stopActivePlayback, seek: () => {} };
  }

  const instruments = new Set(tracks.map((track) => track.instrument));
  await Promise.all([...instruments].map((instrument) => holdEngine(instrument)));

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

  // Piano bus is global as well — first piano track's voice wins.
  const pianoTrack = tracks.find((track) => track.instrument === 'piano');
  if (pianoTrack) {
    const voice = PIANO_VOICES.find((entry) => entry.id === pianoTrack.pianoVoiceId);
    setPianoVoice((voice?.id ?? 'acoustic') as PianoVoiceId);
  }

  /**
   * One note from any track, rebased onto the playhead. Every track's events
   * are merged into a single list so the whole mix rides one clock — tracks
   * cannot drift apart from each other.
   */
  type ScheduledNote = {
    atMs: number;
    instrument: InstrumentId;
    soundId: string;
    velocity?: number;
    padBankId: PadBankId;
    gainScale: number;
  };

  // Clip entry points for microphone tracks. These stay on wall-clock timers:
  // one per clip rather than one per note, and they hand off to a file player
  // that owns its own timing from there.
  let micTimers: ReturnType<typeof setTimeout>[] = [];
  let scheduler: SongSchedulerHandle | null = null;
  let progressInterval: ReturnType<typeof setInterval> | null = null;
  let finished = false;

  const clearScheduled = () => {
    for (const timer of micTimers) {
      clearTimeout(timer);
    }
    micTimers = [];
    scheduler?.stop();
    scheduler = null;
    if (progressInterval) {
      clearInterval(progressInterval);
      progressInterval = null;
    }
  };

  const finish = () => {
    if (finished) {
      return;
    }
    if (loop) {
      // Seamlessly restart the mix from the top instead of ending.
      stopMicPlayers();
      stopViolinPhrases();
      stopAllVoices();
      schedule(0);
      return;
    }
    finished = true;
    clearScheduled();
    stopMicPlayers();
    stopViolinPhrases();
    stopAllVoices();
    activeCancel = null;
    onProgress?.(durationMs, durationMs);
    onEnded?.();
  };

  // (Re)schedule the whole mix from an absolute project position. Reused by
  // seek so jumping restarts every audible track from the new spot, honoring
  // each track's timeline offset (startMs).
  const schedule = (startAtMs: number) => {
    clearScheduled();
    stopMicPlayers();
    finished = false;
    const clampedStart = Math.max(0, Math.min(startAtMs, durationMs));
    const notes: ScheduledNote[] = [];

    for (const track of tracks) {
      const trackStart = getTrackStartMs(track);
      const trackEnd = trackStart + track.durationMs;
      if (trackEnd <= clampedStart) {
        // Clip already finished before the playhead — nothing to schedule.
        continue;
      }

      if (track.mode === 'microphone' && track.audioUri) {
        const uri = track.audioUri;
        const volume = track.volume;
        const startPlayer = (seekMs: number) => {
          if (finished) {
            return;
          }
          const player = createAudioPlayer({ uri });
          player.volume = volume;
          if (rate !== 1) {
            try {
              // Keep vocals natural while the tempo changes.
              player.shouldCorrectPitch = true;
              player.setPlaybackRate(rate, 'high');
            } catch {
              // Older runtimes: fall back to the plain property.
              player.playbackRate = rate;
            }
          }
          activeMicPlayers.push(player);
          void player.seekTo(Math.max(0, seekMs) / 1000).then(() => {
            if (!finished && activeMicPlayers.includes(player)) {
              player.play();
            }
          });
        };
        if (clampedStart <= trackStart) {
          // Clip starts later on the timeline — delay it into place.
          micTimers.push(setTimeout(() => startPlayer(0), (trackStart - clampedStart) / rate));
        } else {
          // Playhead is already inside the clip — jump into it.
          startPlayer(clampedStart - trackStart);
        }
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
          const absAtMs = trackStart + event.atMs;
          if (absAtMs < clampedStart) {
            continue;
          }
          notes.push({
            atMs: absAtMs - clampedStart,
            gainScale: track.volume,
            instrument: track.instrument,
            padBankId: trackPadBank,
            soundId: event.soundId,
            velocity: event.velocity,
          });
        }
      }
    }

    const remainingMs = Math.max(durationMs - clampedStart, 0);
    const lastAtMs = notes.reduce((latest, note) => Math.max(latest, note.atMs), 0);

    const handle = startSongScheduler({
      events: notes,
      onEvent: (note, _index, atContextTime) => {
        if (finished) {
          return;
        }
        playInstrumentEvent(
          note.instrument,
          note.soundId,
          note.velocity,
          note.padBankId,
          note.gainScale,
          atContextTime,
        );
      },
      onDone: finish,
      rate,
      // The mix runs to the project's length, not to its last note — a track
      // that ends early must not cut the ones still playing behind it.
      tailMs: Math.max(remainingMs - lastAtMs, 0) + 50,
    });
    scheduler = handle;

    if (onProgress) {
      onProgress(clampedStart, durationMs);
      progressInterval = setInterval(() => {
        // The scheduler's clock is already in material time, so the playhead
        // still spans the whole timeline at any rate — and it is the same clock
        // the notes sound on, so the two cannot drift apart.
        const elapsed = Math.min(clampedStart + handle.getElapsedMs(), durationMs);
        onProgress(elapsed, durationMs);
      }, 100);
    }
  };

  schedule(initialStartAtMs);

  activeCancel = () => {
    finished = true;
    clearScheduled();
  };

  return {
    stop: () => {
      stopActivePlayback();
    },
    seek: (positionMs: number) => {
      if (finished) {
        return;
      }
      stopMicPlayers();
      stopViolinPhrases();
      stopAllVoices();
      schedule(Math.max(0, Math.min(positionMs, durationMs)));
    },
  };
}
