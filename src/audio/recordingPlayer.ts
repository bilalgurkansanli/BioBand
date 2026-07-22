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
import type { InstrumentId, SavedRecording } from '../types/recording';

export type RecordingPlaybackHandle = {
  stop: () => void;
  /** Jumps playback to a position in milliseconds. */
  seek: (positionMs: number) => void;
};

let activeMicPlayer: AudioPlayer | null = null;
let activeCancel: (() => void) | null = null;
let loadedInstrument: InstrumentId | null = null;

// Bumped on every playSavedRecording() call. If two calls overlap (the user
// taps play on a different recording before the first call's awaits
// resolve), whichever resolves last would otherwise silently overwrite
// `active*` without ever stopping the other's audio — an orphaned,
// uncontrollable player. Each call snapshots its generation and checks it
// after every await; a stale call bails out instead of touching shared
// state.
let playbackGeneration = 0;

async function ensureInstrumentEngine(instrument: InstrumentId): Promise<void> {
  if (loadedInstrument && loadedInstrument !== instrument) {
    releaseInstrumentEngine(loadedInstrument);
    loadedInstrument = null;
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

  loadedInstrument = instrument;
}

function releaseInstrumentEngine(instrument: InstrumentId): void {
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
}

function playInstrumentEvent(
  instrument: InstrumentId,
  soundId: string,
  velocity?: number,
  padBankId: PadBankId = 'drums',
): void {
  switch (instrument) {
    case 'piano':
      playPianoNote(soundId as NoteId);
      return;
    case 'drums':
      playHit(soundId as DrumSoundId, velocity);
      return;
    case 'pads':
      triggerPadForBank(padBankId, soundId as PadSoundId, velocity ?? 1);
      return;
    case 'guitar': {
      playGuitarSoundId(soundId, velocity);
      return;
    }
    case 'violin': {
      playViolinSoundId(soundId);
      return;
    }
  }
}

function stopActivePlayback(): void {
  if (activeCancel) {
    activeCancel();
    activeCancel = null;
  }
  if (activeMicPlayer) {
    try {
      activeMicPlayer.pause();
      activeMicPlayer.remove();
    } catch {
      // Player may already be released.
    }
    activeMicPlayer = null;
  }
  // Phrase presets schedule their notes inside the violin engine — cancel
  // them too, or a stop mid-phrase keeps sounding the rest.
  stopViolinPhrases();
  stopAllVoices();
}

export function stopRecordingPlayback(): void {
  stopActivePlayback();
}

export function releaseRecordingPlaybackResources(): void {
  stopActivePlayback();
  if (loadedInstrument) {
    releaseInstrumentEngine(loadedInstrument);
    loadedInstrument = null;
  }
}

/**
 * Plays a saved recording. Stops any previous playback first.
 * Calls onEnded when the track finishes (or immediately if empty/invalid).
 * Calls onProgress periodically with the current playback position, so the
 * UI can draw a scrubber — seeking is exposed on the returned handle.
 */
export async function playSavedRecording(
  recording: SavedRecording,
  onEnded: () => void,
  onProgress?: (positionMs: number, durationMs: number) => void,
): Promise<RecordingPlaybackHandle> {
  const generation = ++playbackGeneration;
  const isSuperseded = () => generation !== playbackGeneration;
  const noopHandle: RecordingPlaybackHandle = { stop: () => {}, seek: () => {} };

  stopActivePlayback();
  await restorePlaybackAudioMode();

  if (isSuperseded()) {
    // A newer playSavedRecording() call started while we were awaiting —
    // it already owns `active*`; don't touch it or fire our own callbacks.
    return noopHandle;
  }

  if (recording.mode === 'microphone') {
    const uri = recording.audioUri;
    if (!uri) {
      onEnded();
      return { stop: stopActivePlayback, seek: () => {} };
    }

    const player = createAudioPlayer({ uri });
    activeMicPlayer = player;

    const subscription = player.addListener('playbackStatusUpdate', (status) => {
      if (isSuperseded()) {
        return;
      }
      if (status.isLoaded) {
        const durationMs = status.duration > 0 ? status.duration * 1000 : recording.durationMs;
        onProgress?.(status.currentTime * 1000, durationMs);
      }
      if (status.didJustFinish) {
        stopActivePlayback();
        onEnded();
      }
    });

    activeCancel = () => {
      subscription.remove();
    };

    void player.seekTo(0).then(() => {
      if (activeMicPlayer === player) {
        player.play();
      }
    });

    return {
      stop: () => {
        if (!isSuperseded()) {
          stopActivePlayback();
        }
      },
      seek: (positionMs: number) => {
        if (!isSuperseded()) {
          void player.seekTo(Math.max(0, positionMs) / 1000);
        }
      },
    };
  }

  const events = recording.events ?? [];
  if (events.length === 0) {
    onEnded();
    return { stop: stopActivePlayback, seek: () => {} };
  }

  await ensureInstrumentEngine(recording.instrument);

  if (isSuperseded()) {
    // Superseded while the engine was loading — the newer call has already
    // taken over (and may have switched/released engines itself); bail out
    // without releasing anything out from under it.
    return noopHandle;
  }

  // Replay with the kit/voice the take was performed on — not whatever the
  // engine happens to be left on. Older takes without one default to the base.
  if (recording.instrument === 'drums') {
    setDrumKit(isDrumKitId(recording.drumKitId) ? recording.drumKitId : 'acoustic');
  }
  if (recording.instrument === 'guitar') {
    setGuitarVoice(
      isGuitarVoiceId(recording.guitarVoiceId) ? recording.guitarVoiceId : 'nylon',
    );
  }
  if (recording.instrument === 'violin') {
    setViolinVoice(
      isViolinVoiceId(recording.violinVoiceId) ? recording.violinVoiceId : 'classic',
    );
  }
  const padBankId: PadBankId = isPadBankId(recording.padBankId)
    ? recording.padBankId
    : 'drums';

  let timers: ReturnType<typeof setTimeout>[] = [];
  let progressInterval: ReturnType<typeof setInterval> | null = null;
  let finished = false;

  const clearScheduled = () => {
    for (const timer of timers) {
      clearTimeout(timer);
    }
    timers = [];
    if (progressInterval) {
      clearInterval(progressInterval);
      progressInterval = null;
    }
  };

  const finish = () => {
    if (finished) {
      return;
    }
    finished = true;
    clearScheduled();
    stopViolinPhrases();
    stopAllVoices();
    activeCancel = null;
    onEnded();
  };

  // Schedules remaining events/finish from `startAtMs` — reused by seek to
  // reschedule playback from a new position instead of the start.
  const schedule = (startAtMs: number) => {
    clearScheduled();
    finished = false;
    const wallClockStart = Date.now();

    for (const event of events) {
      if (event.atMs < startAtMs || event.atMs > recording.durationMs) {
        continue;
      }
      timers.push(
        setTimeout(() => {
          playInstrumentEvent(recording.instrument, event.soundId, event.velocity, padBankId);
        }, event.atMs - startAtMs),
      );
    }

    const remainingMs = Math.max(recording.durationMs - startAtMs, 0);
    timers.push(setTimeout(finish, remainingMs + 50));

    if (onProgress) {
      progressInterval = setInterval(() => {
        const elapsed = Math.min(startAtMs + (Date.now() - wallClockStart), recording.durationMs);
        onProgress(elapsed, recording.durationMs);
      }, 100);
    }
  };

  schedule(0);

  activeCancel = () => {
    finished = true;
    clearScheduled();
  };

  return {
    stop: () => {
      if (!isSuperseded()) {
        stopActivePlayback();
      }
    },
    seek: (positionMs: number) => {
      if (finished || isSuperseded()) {
        return;
      }
      stopAllVoices();
      schedule(Math.max(0, Math.min(positionMs, recording.durationMs)));
      onProgress?.(Math.max(0, Math.min(positionMs, recording.durationMs)), recording.durationMs);
    },
  };
}
