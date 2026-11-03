import { createAudioPlayer, type AudioPlayer } from 'expo-audio';

import { acquireEngine, releaseEngine } from './engineRegistry';
import { restorePlaybackAudioMode } from './initAudio';
import { playInstrumentEvent, resolveEventVoice } from './playInstrumentEvent';
import { getSharedAudioContext, stopVoicesOwnedBy, withVoiceOwner } from './sampleBank';
import { MIN_LOOP_PASS_MS, passEndContextTime, passTailMs } from './schedulerTiming';
import { startSongScheduler, type SongSchedulerHandle } from './songScheduler';
import { getPianoVoice } from '../instruments/piano/pianoEngine';
import { stopViolinPhrases } from '../instruments/violin/violinEngine';
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

/**
 * Voices this player schedules carry this owner, so stopping a take silences
 * only the take — not the instrument the user is playing, nor a Studio mix.
 */
const VOICE_OWNER = 'recording';

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
  stopViolinPhrases(VOICE_OWNER);
  stopVoicesOwnedBy(VOICE_OWNER);
}

export function stopRecordingPlayback(): void {
  // A stop is also a "newer call": a playSavedRecording still awaiting its
  // engine must not start sounding once it resumes.
  playbackGeneration += 1;
  stopActivePlayback();
}

export function releaseRecordingPlaybackResources(): void {
  playbackGeneration += 1;
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
  // engine happens to be left on — passed per note, so the instrument the user
  // plays by hand keeps its own. Older takes without one default to the base
  // voice; a piano take without one keeps the current piano voice, as before.
  const voice = resolveEventVoice(recording, getPianoVoice());

  let scheduler: SongSchedulerHandle | null = null;
  let progressInterval: ReturnType<typeof setInterval> | null = null;
  let finished = false;
  /** Bumped per pass, so a pass whose onDone fired synchronously cannot clobber its successor. */
  let passSerial = 0;
  /** The running pass: where it started on the take, its length and its clock anchor. */
  let pass = { startAtMs: 0, remainingMs: 0, startContextTime: 0 };
  // A take shorter than this cannot loop — it would hand over before it began.
  const canLoop = recording.durationMs >= MIN_LOOP_PASS_MS;
  const looping = () => loopEnabled && canLoop;

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
    if (looping()) {
      // Straight back to the top: the take never "ends", so the screen keeps
      // its playing state and the scrubber simply starts over. This runs one
      // lookahead before the pass ends, so the next pass is anchored to the
      // exact end time on the audio clock — no tick of lateness, no drift
      // accumulating lap after lap. The ringing tail is cut at that same
      // boundary, not now.
      // Never in the past: Android pauses JS timers in the background while
      // the audio clock runs on, so on return the computed end can be many
      // passes behind. Anchoring there made each pass finish synchronously
      // and start the next — one nested call per missed pass.
      const boundary = Math.max(
        passEndContextTime(pass.startContextTime, pass.remainingMs, rate),
        getSharedAudioContext().currentTime,
      );
      stopViolinPhrases(VOICE_OWNER);
      stopVoicesOwnedBy(VOICE_OWNER, { at: boundary });
      schedule(0, boundary);
      return;
    }
    finished = true;
    clearScheduled();
    stopViolinPhrases(VOICE_OWNER);
    stopVoicesOwnedBy(VOICE_OWNER);
    activeCancel = null;
    onEnded();
  };

  // Schedules remaining events/finish from `startAtMs`, anchored at audio-clock
  // time `startContextTime` (default: now) — reused by seek to reschedule from
  // a new position, and by the loop to queue the next pass.
  const schedule = (startAtMs: number, startContextTime?: number) => {
    clearScheduled();
    finished = false;
    const serial = ++passSerial;

    // Rebased onto the new start so the scheduler's clock can begin at zero;
    // it sorts internally, so a take whose events were stored out of order
    // still plays in time.
    const pending = events
      .filter((event) => event.atMs >= startAtMs && event.atMs <= recording.durationMs)
      .map((event) => ({ ...event, atMs: event.atMs - startAtMs }));

    const remainingMs = Math.max(recording.durationMs - startAtMs, 0);
    const lastAtMs = pending.reduce((latest, event) => Math.max(latest, event.atMs), 0);
    pass = {
      startAtMs,
      remainingMs,
      startContextTime: startContextTime ?? getSharedAudioContext().currentTime,
    };

    const handle = startSongScheduler({
      events: pending,
      onEvent: (event, _index, atContextTime) => {
        withVoiceOwner(VOICE_OWNER, () =>
          playInstrumentEvent(recording.instrument, event, voice, 1, atContextTime, rate),
        );
      },
      onDone: finish,
      rate,
      startAtContextTime: pass.startContextTime,
      // A take runs to its recorded length, not to its last note: trailing
      // silence someone deliberately left in is part of the performance. A
      // looping pass hands over a lookahead early instead (see passTailMs).
      tailMs: passTailMs(remainingMs, lastAtMs, looping()),
    });
    if (serial !== passSerial || finished) {
      // The pass was over by its first tick and finish() already queued the
      // next one (or ended playback) — leave that state alone.
      handle.stop();
      return;
    }
    scheduler = handle;

    if (onProgress) {
      progressInterval = setInterval(() => {
        // Read off the audio clock the notes are on, so the scrubber cannot
        // drift away from what is actually sounding. A queued loop pass reads
        // negative until it starts — the previous pass is still finishing.
        const passElapsed = handle.getElapsedMs();
        const elapsed =
          passElapsed < 0
            ? recording.durationMs
            : Math.min(startAtMs + passElapsed, recording.durationMs);
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
      stopViolinPhrases(VOICE_OWNER);
      stopVoicesOwnedBy(VOICE_OWNER);
      schedule(Math.max(0, Math.min(positionMs, recording.durationMs)));
      onProgress?.(Math.max(0, Math.min(positionMs, recording.durationMs)), recording.durationMs);
    },
    setLoop: (value: boolean) => {
      loopEnabled = value;
      // The running pass decides when to hand over from its tail — move it,
      // so arming the loop mid-take wraps on time and disarming it lets the
      // take end normally.
      if (scheduler) {
        const lastAtMs = events.reduce(
          (latest, event) =>
            event.atMs >= pass.startAtMs && event.atMs <= recording.durationMs
              ? Math.max(latest, event.atMs - pass.startAtMs)
              : latest,
          0,
        );
        scheduler.setTailMs(passTailMs(pass.remainingMs, lastAtMs, looping()));
      }
    },
  };
}
