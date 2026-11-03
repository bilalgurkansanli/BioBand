import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';

import { usePlaySpeed } from '../../hooks/usePlaySpeed';
import { colors } from '../../theme/colors';

/**
 * How a screen tells the HUD that a note was played, without owning the
 * play-speed state itself.
 *
 * The rolling rate ticks every 80 ms while someone plays. Held by the screen,
 * each tick re-rendered the whole instrument screen — toolbar, banners, every
 * modal — to move one bar. The HUD owns that state now; the screen only fires
 * this signal, which costs no render at all.
 */
export type NoteOnsetSignal = {
  emit: () => void;
  subscribe: (listener: () => void) => () => void;
};

export function createNoteOnsetSignal(): NoteOnsetSignal {
  const listeners = new Set<() => void>();
  return {
    emit: () => {
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

type PlaySpeedHudProps = {
  onsets: NoteOnsetSignal;
  visible?: boolean;
};

function barColor(ratio: number): string {
  if (ratio < 0.35) {
    return colors.accent;
  }
  if (ratio < 0.7) {
    return '#FFB74D';
  }
  return '#FF8A65';
}

export function PlaySpeedHud({ onsets, visible = true }: PlaySpeedHudProps) {
  // Hidden means idle: no tick interval and no onsets kept while the bar is
  // not on screen (usePlaySpeed's `enabled`).
  const { notesPerSec, recordNoteOn, maxNotesPerSec } = usePlaySpeed(visible);

  useEffect(() => onsets.subscribe(recordNoteOn), [onsets, recordNoteOn]);

  if (!visible) {
    return null;
  }

  const ratio = Math.max(0, Math.min(1, notesPerSec / maxNotesPerSec));

  return (
    <View style={styles.track}>
      <View
        style={[
          styles.fill,
          {
            backgroundColor: barColor(ratio),
            opacity: ratio < 0.02 ? 0.15 : 0.85,
            width: `${Math.max(ratio * 100, ratio > 0 ? 4 : 0)}%`,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    backgroundColor: '#2C2C2E',
    height: 6,
    marginHorizontal: 8,
    marginVertical: 4,
    overflow: 'hidden',
    borderRadius: 3,
  },
  fill: {
    borderRadius: 3,
    height: '100%',
  },
});
