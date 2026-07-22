/**
 * Storage modules (profileProgress/profileSettings/practiceReminder) fire this
 * signal after every local write, with zero knowledge of auth or Supabase —
 * `src/supabase/appDataSync.ts` subscribes to it at app startup. Keeps the
 * storage layer decoupled from the cloud-sync layer (and avoids a circular
 * import between them).
 */
type Listener = () => void;

const listeners = new Set<Listener>();

export function notifyAppDataChanged(): void {
  for (const listener of listeners) {
    listener();
  }
}

export function onAppDataChanged(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
