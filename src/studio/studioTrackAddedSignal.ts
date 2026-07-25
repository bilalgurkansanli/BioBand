/**
 * Fired when an overdub take is appended to a Studio project from an
 * instrument screen. The Studio project screen shows a themed toast instead of
 * a native alert. A `pending` flag bridges the navigation gap: the signal
 * usually fires just before navigating back to Studio, so the screen consumes
 * the flag once it regains focus.
 */
type Listener = () => void;

let pending = false;
const listeners = new Set<Listener>();

export function notifyStudioTrackAdded(): void {
  pending = true;
  for (const listener of listeners) {
    listener();
  }
}

/** Reads and clears the pending flag. Returns true if a track was just added. */
export function consumeStudioTrackAdded(): boolean {
  const was = pending;
  pending = false;
  return was;
}

export function subscribeStudioTrackAdded(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
