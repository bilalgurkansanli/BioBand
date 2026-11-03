// The sequencer's playhead as a tiny external store.
//
// The playhead moves every 16th note — 12 times a second at 180 BPM. Held in
// React state by the drum machine hook, every move re-rendered the whole
// ~1000-line screen: toolbar, footer and every modal's props. The step grid
// subscribes to this store itself (useSyncExternalStore), so a step now
// re-renders the grid and nothing else.

export type CurrentStepStore = {
  /** The step sounding now, or -1 when stopped. */
  get: () => number;
  set: (step: number) => void;
  subscribe: (listener: () => void) => () => void;
};

export function createCurrentStepStore(): CurrentStepStore {
  let current = -1;
  const listeners = new Set<() => void>();
  return {
    get: () => current,
    set: (step: number) => {
      if (step === current) {
        return;
      }
      current = step;
      for (const listener of listeners) {
        listener();
      }
    },
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}
