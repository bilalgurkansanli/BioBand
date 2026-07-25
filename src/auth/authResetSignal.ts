/**
 * Fired once local storage has been wiped after a sign-out, so `App.tsx` can
 * remount the whole navigation tree — every screen re-reads its state from
 * (now-empty) storage instead of continuing to show the signed-out user's
 * data until the next cold launch.
 */
type Listener = () => void;

const listeners = new Set<Listener>();

export function triggerAuthReset(): void {
  for (const listener of listeners) {
    listener();
  }
}

export function onAuthReset(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
