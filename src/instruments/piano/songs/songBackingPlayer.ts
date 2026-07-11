import { createAudioPlayer, type AudioPlayer } from 'expo-audio';

import { restorePlaybackAudioMode } from '../../../audio/initAudio';

let activePlayer: AudioPlayer | null = null;
let statusSub: { remove: () => void } | null = null;

export async function prepareBackingTrack(moduleId: number): Promise<void> {
  await stopBackingTrack();
  await restorePlaybackAudioMode();
  activePlayer = createAudioPlayer(moduleId, { updateInterval: 50 });
}

export async function playBackingFrom(startMs: number): Promise<void> {
  if (!activePlayer) {
    return;
  }
  await activePlayer.seekTo(Math.max(0, startMs) / 1000);
  activePlayer.play();
}

export function pauseBackingTrack(): void {
  activePlayer?.pause();
}

export function resumeBackingTrack(): void {
  activePlayer?.play();
}

export function getBackingCurrentTimeMs(): number {
  if (!activePlayer) {
    return 0;
  }
  return Math.max(0, activePlayer.currentTime * 1000);
}

export function getBackingDurationMs(): number {
  if (!activePlayer) {
    return 0;
  }
  return Math.max(0, activePlayer.duration * 1000);
}

export function isBackingPlaying(): boolean {
  return activePlayer?.playing ?? false;
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
}
