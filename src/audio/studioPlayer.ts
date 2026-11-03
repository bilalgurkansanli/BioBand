import { createAudioPlayer, type AudioPlayer } from 'expo-audio';

import { acquireEngine, releaseEngine } from './engineRegistry';
import { restorePlaybackAudioMode } from './initAudio';
import { playInstrumentEvent, resolveEventVoice, type EventVoice } from './playInstrumentEvent';
import { getSharedAudioContext, stopVoicesOwnedBy, withVoiceOwner } from './sampleBank';
import { MIN_LOOP_PASS_MS, passEndContextTime, passTailMs } from './schedulerTiming';
import { startSongScheduler, type SongSchedulerHandle } from './songScheduler';
import { stopViolinPhrases } from '../instruments/violin/violinEngine';
import type { InstrumentEvent, InstrumentId } from '../types/recording';
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
  /**
   * Audio-context time the mix's starting position sounds at. An overdub
   * measures its recording's offset against it.
   */
  startContextTime: number;
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
  /**
   * Switch the session to plain playback before starting (default true). A
   * mic overdub has already put it in its recording mode, which plays fine —
   * switching back would take the microphone away from the recorder.
   */
  restoreAudioMode?: boolean;
};

/**
 * A mix with every slow step (audio session, engine loading) done, ready to
 * start in the same tick as something it has to line up with.
 */
export type PreparedStudioPlayback = {
  /** Starts sounding now. A no-op handle if playback was stopped meanwhile. */
  start: () => StudioPlaybackHandle;
};

/**
 * Registry references this module holds, so its own release stays balanced —
 * and the in-flight acquire, so a second play waits for a load the first one
 * started instead of scheduling notes on an engine that is not up yet.
 */
const heldEngines = new Map<InstrumentId, Promise<void>>();
let activeCancel: (() => void) | null = null;
let activeMicPlayers: AudioPlayer[] = [];
/** Loop passes retiring the previous pass's mic players at its exact end. */
const micRetireTimers = new Set<ReturnType<typeof setTimeout>>();

/**
 * Voices the mix schedules carry this owner, so stopping the mix (or an
 * overdub's beds) silences only the mix — never the instrument the user is
 * recording over it.
 */
const VOICE_OWNER = 'studio';

// Bumped by every play and every stop. A play resuming from one of its awaits
// to find the generation moved on was stopped (blur, overdub cancelled) or
// replaced (a BPM change re-plays the mix) while it was loading, and must not
// start a mix nobody can stop any more.
let playGeneration = 0;

function holdEngine(instrument: InstrumentId): Promise<void> {
  const held = heldEngines.get(instrument);
  if (held) {
    return held;
  }
  // Recorded before awaiting: acquireEngine takes its reference synchronously,
  // so a teardown landing mid-load still sees one to give back.
  const loading: Promise<void> = acquireEngine(instrument).catch((error: unknown) => {
    // A failed init still took a reference — give it back and forget the
    // entry, so the next play retries instead of reusing the failure.
    if (heldEngines.get(instrument) === loading) {
      heldEngines.delete(instrument);
      releaseEngine(instrument);
    }
    throw error;
  });
  heldEngines.set(instrument, loading);
  return loading;
}


function stopPlayers(players: AudioPlayer[]): void {
  for (const player of players) {
    try {
      player.pause();
      player.remove();
    } catch {
      // Already released.
    }
  }
}

/** Players of an ending loop pass, still sounding until their retire timer. */
let retiringMicPlayers: AudioPlayer[] = [];

/** Stop every mic clip at once — running, and retiring from a loop pass. */
function stopMicPlayers(): void {
  for (const timer of micRetireTimers) {
    clearTimeout(timer);
  }
  micRetireTimers.clear();
  stopPlayers(activeMicPlayers);
  stopPlayers(retiringMicPlayers);
  activeMicPlayers = [];
  retiringMicPlayers = [];
}

/**
 * Stop the mic players running now at audio-clock time `contextTime` — the
 * end of a loop pass, while the next pass's clips are already queued.
 */
function retireMicPlayersAt(contextTime: number): void {
  const retiring = activeMicPlayers;
  activeMicPlayers = [];
  if (retiring.length === 0) {
    return;
  }
  retiringMicPlayers.push(...retiring);
  const delayMs = Math.max(0, (contextTime - getSharedAudioContext().currentTime) * 1000);
  const timer = setTimeout(() => {
    micRetireTimers.delete(timer);
    stopPlayers(retiring);
    retiringMicPlayers = retiringMicPlayers.filter((player) => !retiring.includes(player));
  }, delayMs);
  micRetireTimers.add(timer);
}

function stopActivePlayback(): void {
  if (activeCancel) {
    activeCancel();
    activeCancel = null;
  }
  stopMicPlayers();
  // Cancel violin phrase notes still scheduled inside the engine.
  stopViolinPhrases();
  stopVoicesOwnedBy(VOICE_OWNER);
}

export function stopStudioPlayback(): void {
  playGeneration += 1;
  stopActivePlayback();
}

export function releaseStudioPlaybackResources(): void {
  playGeneration += 1;
  stopActivePlayback();
  for (const instrument of heldEngines.keys()) {
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
  const prepared = await prepareStudioPlayback(project, options);
  return prepared.start();
}

/**
 * Everything slow about starting a mix — stopping the previous one, the audio
 * session, loading every track's engine — without starting it. `start()` is
 * then synchronous, so a caller can line the mix up with something else (an
 * overdub's recorder) in a single tick.
 */
export async function prepareStudioPlayback(
  project: StudioProject,
  options: StudioPlayOptions = {},
): Promise<PreparedStudioPlayback> {
  const generation = ++playGeneration;
  const isSuperseded = () => generation !== playGeneration;
  const noopHandle = (): StudioPlaybackHandle => ({
    stop: () => {},
    seek: () => {},
    startContextTime: getSharedAudioContext().currentTime,
  });
  const superseded: PreparedStudioPlayback = { start: noopHandle };

  stopActivePlayback();
  if (options.restoreAudioMode !== false) {
    await restorePlaybackAudioMode();
    if (isSuperseded()) {
      return superseded;
    }
  }

  const tracks = audibleTracks(project, options.excludeTrackIds);
  const durationMs = getProjectDurationMs({ ...project, tracks: project.tracks });
  const onEnded = options.onEnded;
  const onProgress = options.onProgress;
  const loop = (options.loop ?? false) && durationMs >= MIN_LOOP_PASS_MS;
  // All scheduling below works in "material time" (the ms stored on tracks);
  // wall-clock delays are that time divided by the rate.
  const rate = Math.max(0.1, options.rate ?? 1);
  const initialStartAtMs = Math.max(0, Math.min(options.startAtMs ?? 0, durationMs));

  if (tracks.length === 0 || durationMs <= 0) {
    return {
      start: () => {
        if (!isSuperseded()) {
          onEnded?.();
        }
        return noopHandle();
      },
    };
  }

  const instruments = new Set(tracks.map((track) => track.instrument));
  await Promise.all([...instruments].map((instrument) => holdEngine(instrument)));
  if (isSuperseded()) {
    // Stopped or replaced while the engines loaded. The references stay held
    // (released with the module's resources), but nothing may start.
    return superseded;
  }

  return {
    start: () => {
      if (isSuperseded()) {
        return noopHandle();
      }
      return startPreparedMix({
        tracks,
        durationMs,
        onEnded,
        onProgress,
        loop,
        rate,
        initialStartAtMs,
        isSuperseded,
      });
    },
  };
}

function startPreparedMix(params: {
  tracks: StudioTrack[];
  durationMs: number;
  onEnded?: () => void;
  onProgress?: (positionMs: number, durationMs: number) => void;
  loop: boolean;
  rate: number;
  initialStartAtMs: number;
  isSuperseded: () => boolean;
}): StudioPlaybackHandle {
  const { tracks, durationMs, onEnded, onProgress, loop, rate, initialStartAtMs } = params;

  // Every track plays on its own recorded kit / voice / bank, handed to the
  // engine per note (older tracks without one get the base voice). Nothing
  // global is touched, so the instrument an overdub is being played on keeps
  // the voice the user picked — and the export, which always rendered each
  // track on its own voice, now sounds like the live mix.
  const trackVoices = new Map<string, EventVoice>(
    tracks.map((track) => [track.id, resolveEventVoice(track)]),
  );

  /**
   * One note from any track, rebased onto the playhead. Every track's events
   * are merged into a single list so the whole mix rides one clock — tracks
   * cannot drift apart from each other.
   */
  type ScheduledNote = {
    atMs: number;
    instrument: InstrumentId;
    event: InstrumentEvent;
    voice: EventVoice;
    gainScale: number;
  };

  // Clip entry points for microphone tracks. These stay on wall-clock timers:
  // one per clip rather than one per note, and they hand off to a file player
  // that owns its own timing from there.
  let micTimers: ReturnType<typeof setTimeout>[] = [];
  let scheduler: SongSchedulerHandle | null = null;
  let progressInterval: ReturnType<typeof setInterval> | null = null;
  let finished = false;
  /** Bumped per pass, so a pass whose onDone fired synchronously cannot clobber its successor. */
  let passSerial = 0;
  /** The running pass: its length on the timeline and its clock anchor. */
  let pass = { remainingMs: 0, startContextTime: 0 };

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
      // Seamlessly restart the mix from the top instead of ending. This runs
      // one lookahead before the pass ends, so the next pass is anchored to
      // the exact end on the audio clock instead of to whenever a JS tick
      // noticed — the loop no longer drifts lap after lap. The ending pass's
      // notes and mic clips are cut at that same boundary.
      const boundary = passEndContextTime(pass.startContextTime, pass.remainingMs, rate);
      stopViolinPhrases();
      stopVoicesOwnedBy(VOICE_OWNER, { at: boundary });
      retireMicPlayersAt(boundary);
      schedule(0, boundary, true);
      return;
    }
    finished = true;
    clearScheduled();
    stopMicPlayers();
    stopViolinPhrases();
    stopVoicesOwnedBy(VOICE_OWNER);
    activeCancel = null;
    onProgress?.(durationMs, durationMs);
    onEnded?.();
  };

  // (Re)schedule the whole mix from an absolute project position, anchored at
  // audio-clock time `startContextTime` (default: now). Reused by seek so
  // jumping restarts every audible track from the new spot, honoring each
  // track's timeline offset (startMs), and by the loop to queue the next pass
  // (`loopPass`: the previous pass's mic clips retire on their own).
  const schedule = (startAtMs: number, startContextTime?: number, loopPass = false) => {
    clearScheduled();
    if (!loopPass) {
      stopMicPlayers();
    }
    finished = false;
    const serial = ++passSerial;
    const clampedStart = Math.max(0, Math.min(startAtMs, durationMs));
    const anchor = startContextTime ?? getSharedAudioContext().currentTime;
    // A queued loop pass starts in the future; its mic clips wait that long too.
    const leadMs = Math.max(0, (anchor - getSharedAudioContext().currentTime) * 1000);
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
          micTimers.push(
            setTimeout(() => startPlayer(0), (trackStart - clampedStart) / rate + leadMs),
          );
        } else if (leadMs > 0) {
          micTimers.push(setTimeout(() => startPlayer(clampedStart - trackStart), leadMs));
        } else {
          // Playhead is already inside the clip — jump into it.
          startPlayer(clampedStart - trackStart);
        }
        continue;
      }

      const voice = trackVoices.get(track.id);
      if (track.mode === 'instrument' && track.events && voice) {
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
            event,
            voice,
          });
        }
      }
    }

    const remainingMs = Math.max(durationMs - clampedStart, 0);
    const lastAtMs = notes.reduce((latest, note) => Math.max(latest, note.atMs), 0);
    pass = { remainingMs, startContextTime: anchor };

    const handle = startSongScheduler({
      events: notes,
      onEvent: (note, _index, atContextTime) => {
        if (finished) {
          return;
        }
        // Absolute audio-context onset, straight through to the engine. In a
        // mix this matters more than anywhere else: every track is timed off
        // the same clock, so a late JS timer would not just drag one note, it
        // would pull that track out of alignment with the others.
        withVoiceOwner(VOICE_OWNER, () =>
          playInstrumentEvent(
            note.instrument,
            note.event,
            note.voice,
            note.gainScale,
            atContextTime,
          ),
        );
      },
      onDone: finish,
      rate,
      startAtContextTime: anchor,
      // The mix runs to the project's length, not to its last note — a track
      // that ends early must not cut the ones still playing behind it. A
      // looping pass hands over a lookahead early instead (see passTailMs).
      tailMs: passTailMs(remainingMs, lastAtMs, loop),
    });
    if (serial !== passSerial) {
      // Over by its first tick, and finish() already moved on.
      handle.stop();
      return;
    }
    scheduler = handle;

    if (onProgress) {
      if (!loopPass) {
        onProgress(clampedStart, durationMs);
      }
      progressInterval = setInterval(() => {
        // The scheduler's clock is already in material time, so the playhead
        // still spans the whole timeline at any rate — and it is the same clock
        // the notes sound on, so the two cannot drift apart. A queued loop
        // pass reads negative until it starts: the previous one is finishing.
        const passElapsed = handle.getElapsedMs();
        const elapsed =
          passElapsed < 0 ? durationMs : Math.min(clampedStart + passElapsed, durationMs);
        onProgress(elapsed, durationMs);
      }, 100);
    }
  };

  const startContextTime = getSharedAudioContext().currentTime;
  schedule(initialStartAtMs, startContextTime);

  activeCancel = () => {
    finished = true;
    clearScheduled();
  };

  return {
    stop: () => {
      if (!params.isSuperseded()) {
        stopStudioPlayback();
      }
    },
    seek: (positionMs: number) => {
      if (finished || params.isSuperseded()) {
        return;
      }
      stopMicPlayers();
      stopViolinPhrases();
      stopVoicesOwnedBy(VOICE_OWNER);
      schedule(Math.max(0, Math.min(positionMs, durationMs)));
    },
    startContextTime,
  };
}
