import { createAudioPlayer, type AudioPlayer } from 'expo-audio';

import { playLowLatencyShot, prepareSamplePlayback } from '../../audio/samplePool';
import {
  BASE_SAMPLE_FILES,
  getNoteSampleConfig,
  SAMPLE_ANCHORS,
  type BaseSampleId,
} from './pianoSamples';
import { PIANO_NOTES, type NoteId } from './pianoNotes';

const VOICES_PER_ANCHOR = 8;

type AnchorVoicePool = {
  players: AudioPlayer[];
  cursor: number;
};

const anchorPools = new Map<BaseSampleId, AnchorVoicePool>();
const noteConfigs = new Map<NoteId, { anchorId: BaseSampleId; baseRate: number }>();
let toneOffsetSemitones = 0;
let initialized = false;

function pickVoice(pool: AnchorVoicePool): AudioPlayer {
  const idle = pool.players.find((player) => !player.playing);
  if (idle) {
    return idle;
  }

  const player = pool.players[pool.cursor];
  pool.cursor = (pool.cursor + 1) % pool.players.length;
  return player;
}

export function setPianoToneOffset(semitones: number): void {
  toneOffsetSemitones = semitones;
}

export function getPianoToneOffset(): number {
  return toneOffsetSemitones;
}

export async function initPianoEngine(): Promise<void> {
  if (initialized && anchorPools.size === SAMPLE_ANCHORS.length) {
    return;
  }

  releasePianoEngine();
  await prepareSamplePlayback();

  for (const anchor of SAMPLE_ANCHORS) {
    const players: AudioPlayer[] = [];

    for (let i = 0; i < VOICES_PER_ANCHOR; i++) {
      const player = createAudioPlayer(BASE_SAMPLE_FILES[anchor.id]);
      player.shouldCorrectPitch = false;
      player.volume = 1;
      void player.seekTo(0);
      players.push(player);
    }

    anchorPools.set(anchor.id, { players, cursor: 0 });
  }

  for (const note of PIANO_NOTES) {
    const { anchorId, playbackRate } = getNoteSampleConfig(note.midi);
    noteConfigs.set(note.id, { anchorId, baseRate: playbackRate });
  }

  initialized = true;
}

export function playNote(noteId: NoteId, toneSemitones = toneOffsetSemitones): void {
  const config = noteConfigs.get(noteId);
  const pool = config ? anchorPools.get(config.anchorId) : undefined;
  if (!config || !pool) {
    return;
  }

  const player = pickVoice(pool);
  const toneMultiplier = 2 ** (toneSemitones / 12);
  playLowLatencyShot(player, config.baseRate * toneMultiplier);
}

export function releasePianoEngine(): void {
  for (const pool of anchorPools.values()) {
    for (const player of pool.players) {
      player.remove();
    }
  }

  anchorPools.clear();
  noteConfigs.clear();
  toneOffsetSemitones = 0;
  initialized = false;
}
