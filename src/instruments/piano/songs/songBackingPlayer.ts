import { createAudioPlayer, type AudioPlayer } from 'expo-audio';

import { restorePlaybackAudioMode } from '../../../audio/initAudio';
import { getSharedAudioContext } from '../../../audio/sampleBank';
import type { SongBackingTrack } from './types';
import { songHasBackingAudio } from './types';

/** Volume for the original full-mix (low — piano in the mix would clash). */
export const BAND_BACKING_VOLUME_FULL = 0.28;
/** Volume for piano-less stems (higher — no clash with the user's piano). */
export const BAND_BACKING_VOLUME_PIANO_LESS = 0.65;

let currentBackingVolume = BAND_BACKING_VOLUME_FULL;
/** Desired song-time playback rate (applied when a player exists). */
let desiredPlaybackRate = 1;

let activePlayer: AudioPlayer | null = null;
let statusSub: { remove: () => void } | null = null;

async function ensureMixableAudio(): Promise<void> {
  await restorePlaybackAudioMode();
  const ctx = getSharedAudioContext();
  if (ctx.state === 'suspended') {
    await ctx.resume();
  }
}

/**
 * Prepare a backing player. Prefers `pianoLessUri` (piano-removed stem)
 * over `uri` (full mix) so the user's live piano replaces the recording's.
 */
export async function prepareBackingTrack(source: SongBackingTrack): Promise<void> {
  await stopBackingTrack();
  if (!songHasBackingAudio(source)) {
    return;
  }

  await ensureMixableAudio();

  // Piano-less stem gets priority — best "play-along" feel.
  if (typeof source.pianoLessUri === 'string' && source.pianoLessUri.length > 0) {
    activePlayer = createAudioPlayer({ uri: source.pianoLessUri }, { updateInterval: 50 });
    currentBackingVolume = BAND_BACKING_VOLUME_PIANO_LESS;
  } else if (typeof source.uri === 'string' && source.uri.length > 0) {
    activePlayer = createAudioPlayer({ uri: source.uri }, { updateInterval: 50 });
    currentBackingVolume = BAND_BACKING_VOLUME_FULL;
  } else if (typeof source.module === 'number') {
    activePlayer = createAudioPlayer(source.module, { updateInterval: 50 });
    currentBackingVolume = BAND_BACKING_VOLUME_FULL;
  }

  if (activePlayer) {
    activePlayer.volume = currentBackingVolume;
    activePlayer.shouldCorrectPitch = true;
    activePlayer.playbackRate = desiredPlaybackRate;
  }
}

/** Song-time rate for Band Mode (1 = normal). Pitch correction stays on. */
export function setBackingPlaybackRate(rate: number): void {
  desiredPlaybackRate = Math.max(0.1, Math.min(2, rate));
  if (!activePlayer) {
    return;
  }
  activePlayer.playbackRate = desiredPlaybackRate;
  activePlayer.shouldCorrectPitch = true;
}

export async function playBackingFrom(startMs: number): Promise<void> {
  if (!activePlayer) {
    return;
  }
  await ensureMixableAudio();
  activePlayer.volume = currentBackingVolume;
  activePlayer.shouldCorrectPitch = true;
  activePlayer.playbackRate = desiredPlaybackRate;
  await activePlayer.seekTo(Math.max(0, startMs) / 1000);
  activePlayer.play();
}

export function pauseBackingTrack(): void {
  activePlayer?.pause();
}

export function getBackingCurrentTimeMs(): number {
  if (!activePlayer) {
    return 0;
  }
  return Math.max(0, activePlayer.currentTime * 1000);
}

/** Session elapsed relative to audioStartMs (clamped ≥ 0). */
export function getBackingElapsedMs(audioStartMs: number): number {
  return Math.max(0, getBackingCurrentTimeMs() - audioStartMs);
}

export function onBackingFinished(callback: () => void): void {
  if (!activePlayer) {
    return;
  }
  statusSub?.remove();
  statusSub = activePlayer.addListener('playbackStatusUpdate', (status) => {
    if (status.didJustFinish) {
      callback();
    }
  });
}

export async function stopBackingTrack(): Promise<void> {
  statusSub?.remove();
  statusSub = null;
  if (activePlayer) {
    try {
      activePlayer.pause();
      activePlayer.remove();
    } catch {
      // Player may already be released.
    }
    activePlayer = null;
  }
  desiredPlaybackRate = 1;
}

/** True when the source has a piano-less URI attached. */
export function hasPianoLessTrack(
  track: SongBackingTrack | null | undefined,
): boolean {
  if (!track) {
    return false;
  }
  return typeof track.pianoLessUri === 'string' && track.pianoLessUri.length > 0;
}

/** Current backing volume (depends on full-mix vs piano-less). */
