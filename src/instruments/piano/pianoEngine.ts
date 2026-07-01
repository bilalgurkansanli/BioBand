import { createAudioPlayer, setIsAudioActiveAsync, type AudioPlayer } from 'expo-audio';

import { getNoteSampleConfig } from './pianoSamples';
import { PIANO_NOTES, type NoteId } from './pianoNotes';

const players = new Map<NoteId, AudioPlayer>();
let initialized = false;

export async function initPianoEngine(): Promise<void> {
  if (initialized && players.size === PIANO_NOTES.length) {
    return;
  }

  releasePianoEngine();
  await setIsAudioActiveAsync(true);

  for (const note of PIANO_NOTES) {
    const { source, playbackRate } = getNoteSampleConfig(note.midi);
    const player = createAudioPlayer(source);
    player.setPlaybackRate(playbackRate, 'medium');
    players.set(note.id, player);
  }

  initialized = true;
}

export function playNote(noteId: NoteId): void {
  const player = players.get(noteId);
  if (!player) {
    return;
  }

  void player.seekTo(0).then(() => {
    player.play();
  });
}

export function releasePianoEngine(): void {
  for (const player of players.values()) {
    player.remove();
  }

  players.clear();
  initialized = false;
}
