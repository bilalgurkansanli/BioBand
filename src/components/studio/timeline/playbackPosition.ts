import { useSyncExternalStore } from 'react';

/**
 * The Studio playhead position, readable without re-rendering whoever holds it.
 *
 * Playback reports its position ten times a second. As React state on the
 * project screen, every report re-rendered the whole editor — header, take
 * list filter, a dozen modals — to move one line and one clock. The screen now
 * writes the position here instead, and only the components that draw it
 * subscribe.
 */
export type PlaybackPosition = {
  get: () => number;
  subscribe: (listener: () => void) => () => void;
};

export type WritablePlaybackPosition = PlaybackPosition & {
  set: (positionMs: number) => void;
};

export function createPlaybackPosition(initialMs = 0): WritablePlaybackPosition {
  let current = initialMs;
  const listeners = new Set<() => void>();
  return {
    get: () => current,
    set: (positionMs) => {
      if (positionMs === current) {
        return;
      }
      current = positionMs;
      for (const listener of listeners) {
        listener();
      }
    },
    subscribe: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}

/** Re-renders the calling component, and only it, when the position moves. */
export function usePlaybackPositionMs(position: PlaybackPosition): number {
  return useSyncExternalStore(position.subscribe, position.get);
}
