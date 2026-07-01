import type { NoteId } from './pianoNotes';
import type { SongEvent } from './songs/types';

export type SongPlaybackCallbacks = {
  onNotePlay: (noteId: NoteId) => void;
  onNoteHighlight?: (noteId: NoteId | null) => void;
};

export function scheduleSongPlayback(
  events: SongEvent[],
  durationMs: number,
  callbacks: SongPlaybackCallbacks,
): () => void {
  const timers: ReturnType<typeof setTimeout>[] = [];

  for (const event of events) {
    if (event.atMs > durationMs) {
      continue;
    }

    const timer = setTimeout(() => {
      callbacks.onNoteHighlight?.(event.noteId);
      callbacks.onNotePlay(event.noteId);

      const clearHighlight = setTimeout(() => {
        callbacks.onNoteHighlight?.(null);
      }, 280);
      timers.push(clearHighlight);
    }, event.atMs);

    timers.push(timer);
  }

  return () => {
    for (const timer of timers) {
      clearTimeout(timer);
    }
    callbacks.onNoteHighlight?.(null);
  };
}
