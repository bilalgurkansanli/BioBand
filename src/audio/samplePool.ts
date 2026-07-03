import { createAudioPlayer, type AudioPlayer } from 'expo-audio';

import { restorePlaybackAudioMode } from './initAudio';

export type SamplePool = {
  players: AudioPlayer[];
  cursor: number;
};

export function createSamplePool(source: number, voices: number): SamplePool {
  const players: AudioPlayer[] = [];
  for (let i = 0; i < voices; i++) {
    const player = createAudioPlayer(source);
    player.shouldCorrectPitch = false;
    players.push(player);
  }
  return { players, cursor: 0 };
}

export function playOneShot(player: AudioPlayer, playbackRate?: number): void {
  player.pause();
  player.shouldCorrectPitch = false;

  if (playbackRate !== undefined) {
    player.setPlaybackRate(playbackRate);
  }

  void player.seekTo(0).then(() => {
    player.play();
  });
}

export function playLowLatencyShot(player: AudioPlayer, playbackRate?: number): void {
  player.shouldCorrectPitch = false;

  if (playbackRate !== undefined) {
    player.setPlaybackRate(playbackRate);
  }

  void player.seekTo(0);
  player.play();
}

export function pickPoolVoice(pool: SamplePool): AudioPlayer | null {
  if (pool.players.length === 0) {
    return null;
  }

  const idle = pool.players.find((player) => !player.playing);
  if (idle) {
    return idle;
  }

  const player = pool.players[pool.cursor];
  pool.cursor = (pool.cursor + 1) % pool.players.length;
  return player;
}

export function playFromPool(
  pool: SamplePool,
  options?: { playbackRate?: number },
): void {
  const player = pickPoolVoice(pool);
  if (!player) {
    return;
  }

  playLowLatencyShot(player, options?.playbackRate);
}

export function releaseSamplePool(pool: SamplePool): void {
  for (const player of pool.players) {
    player.remove();
  }
  pool.players.length = 0;
}

export function releaseSamplePools(pools: Iterable<SamplePool>): void {
  for (const pool of pools) {
    releaseSamplePool(pool);
  }
}

export async function prepareSamplePlayback(): Promise<void> {
  await restorePlaybackAudioMode();
}
