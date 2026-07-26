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
import { playNote as playPianoNote } from '../instruments/piano/pianoEngine';
import type { NoteId } from '../instruments/piano/pianoNotes';
import type { NotePerformance } from '../instruments/shared/songPerformance';
import {
  playViolinSoundId,
  setViolinVoice,
  stopViolinPhrases,
} from '../instruments/violin/violinEngine';
import { isViolinVoiceId } from '../instruments/violin/violinVoices';
import type { InstrumentId, SavedRecording } from '../types/recording';

export type RecordingPlaybackHandle = {
  stop: () => void;
  /** Jumps playback to a position in milliseconds. */
  seek: (positionMs: number) => void;
  /**
   * Arm or disarm looping mid-playback. Live rather than a start-time option
   * so turning it on does not interrupt the take you are already listening to.
   */
  setLoop: (loop: boolean) => void;
};

export type RecordingPlayOptions = {
  /**
   * Tempo multiplier — 1 plays as recorded, 0.5 at half speed. Positions and
   * durations stay in "material time" (the ms stored on the take), so the
   * scrubber still spans the whole recording however fast it is playing.
   */
  rate?: number;
  /** Restart from the top when the take ends instead of stopping. */
  loop?: boolean;
};

let activeMicPlayer: AudioPlayer | null = null;
let activeCancel: (() => void) | null = null;
/** The one registry reference this module holds, if any. */
let heldInstrument: InstrumentId | null = null;

// Bumped on every playSavedRecording() call. If two calls overlap (the user
// taps play on a different recording before the first call's awaits
// resolve), whichever resolves last would otherwise silently overwrite
// `active*` without ever stopping the other's audio — an orphaned,
// uncontrollable player. Each call snapshots its generation and checks it
// after every await; a stale call bails out instead of touching shared
// state.
let playbackGeneration = 0;

async function ensureInstrumentEngine(instrument: InstrumentId): Promise<void> {
  if (heldInstrument === instrument) {
    return;
  }

  const previous = heldInstrument;
  // Recorded before awaiting: acquireEngine takes its reference synchronously,
  // so a teardown landing mid-load still sees one to give back.
  heldInstrument = instrument;
  if (previous) {
    // Only this module's reference goes — the Studio mix or an open instrument
    // screen may still need the previous engine, and the registry knows it.
    releaseEngine(previous);
  }

  await acquireEngine(instrument);
}

function playInstrumentEvent(
  instrument: InstrumentId,
  soundId: string,
  velocity: number | undefined,
  padBankId: PadBankId,
  atContextTime: number,
): void {
  // The onset is handed to the engine as an absolute audio-context time, so the
  // audio thread owns it from here. That is the whole point of scheduling this
  // way: a JS thread busy rendering the scrubber can no longer move the beat.
  const performance: NotePerformance = { atTime: atContextTime };
  switch (instrument) {
    case 'piano':
      playPianoNote(soundId as NoteId, undefined, undefined, 1, performance);
      return;
    case 'drums':
      playHit(soundId as DrumSoundId, velocity, 1, performance);
      return;
    case 'pads':
      triggerPadForBank(padBankId, soundId as PadSoundId, velocity ?? 1, 1, performance);
      return;
    case 'guitar': {
      playGuitarSoundId(soundId, velocity, 1, performance);
      return;
    }
    case 'violin': {
      playViolinSoundId(soundId, 1, performance);
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
  if (heldInstrument) {
    releaseEngine(heldInstrument);
    heldInstrument = null;
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
  options: RecordingPlayOptions = {},
): Promise<RecordingPlaybackHandle> {
  const rate = Math.max(0.1, options.rate ?? 1);
  // Mutable: the handle can flip it while the take is playing.
  let loopEnabled = options.loop ?? false;
  const generation = ++playbackGeneration;
  const isSuperseded = () => generation !== playbackGeneration;
  const noopHandle: RecordingPlaybackHandle = {
    stop: () => {},
    seek: () => {},
    setLoop: () => {},
  };

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
      return { stop: stopActivePlayback, seek: () => {}, setLoop: () => {} };
    }

    const player = createAudioPlayer({ uri });
    activeMicPlayer = player;
    player.loop = loopEnabled;
    if (rate !== 1) {
      try {
        // Slowing a take down to hear a mistake only helps if it still sounds
        // like the instrument — without this it drops an octave.
        player.shouldCorrectPitch = true;
        player.setPlaybackRate(rate, 'high');
      } catch {
        // Older runtimes: fall back to the plain property.
        player.playbackRate = rate;
      }
    }

    const subscription = player.addListener('playbackStatusUpdate', (status) => {
      if (isSuperseded()) {
        return;
      }
      if (status.isLoaded) {
        const durationMs = status.duration > 0 ? status.duration * 1000 : recording.durationMs;
        onProgress?.(status.currentTime * 1000, durationMs);
      }
      // The player repeats on its own when looping; only an unlooped ending
      // tears the session down.
      if (status.didJustFinish && !loopEnabled) {
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
      setLoop: (value: boolean) => {
        loopEnabled = value;
        player.loop = value;
      },
    };
  }

  const events = recording.events ?? [];
  if (events.length === 0) {
    onEnded();
    return { stop: stopActivePlayback, seek: () => {}, setLoop: () => {} };
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

  let scheduler: SongSchedulerHandle | null = null;
  let progressInterval: ReturnType<typeof setInterval> | null = null;
  let finished = false;

  const clearScheduled = () => {
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
    if (loopEnabled) {
      // Straight back to the top: the take never "ends", so the screen keeps
      // its playing state and the scrubber simply starts over.
      stopViolinPhrases();
      stopAllVoices();
      schedule(0);
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

    // Rebased onto the new start so the scheduler's clock can begin at zero;
    // it sorts internally, so a take whose events were stored out of order
    // still plays in time.
    const pending = events
      .filter((event) => event.atMs >= startAtMs && event.atMs <= recording.durationMs)
      .map((event) => ({ ...event, atMs: event.atMs - startAtMs }));

    const remainingMs = Math.max(recording.durationMs - startAtMs, 0);
    const lastAtMs = pending.reduce((latest, event) => Math.max(latest, event.atMs), 0);

    const handle = startSongScheduler({
      events: pending,
      onEvent: (event, _index, atContextTime) => {
        playInstrumentEvent(
          recording.instrument,
          event.soundId,
          event.velocity,
          padBankId,
          atContextTime,
        );
      },
      onDone: finish,
      rate,
      // A take runs to its recorded length, not to its last note: trailing
      // silence someone deliberately left in is part of the performance.
      //
      // The extra 50 ms lets the final note ring before playback tears down —
      // but a loop tears nothing down, so there it would just be 50 ms of
      // silence added to every pass, dragging the take out of time with itself.
      tailMs: Math.max(remainingMs - lastAtMs, 0) + (loopEnabled ? 0 : 50),
    });
    scheduler = handle;

    if (onProgress) {
      progressInterval = setInterval(() => {
        // Read off the audio clock the notes are on, so the scrubber cannot
        // drift away from what is actually sounding.
        const elapsed = Math.min(startAtMs + handle.getElapsedMs(), recording.durationMs);
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
    setLoop: (value: boolean) => {
      loopEnabled = value;
    },
  };
}
