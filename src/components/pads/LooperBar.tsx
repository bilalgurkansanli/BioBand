import { useCallback, useEffect, useRef, useState } from 'react';
import Ionicons from '@expo/vector-icons/Ionicons';
import {
  Alert,
  Animated,
  Easing,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';

import type { LooperBars, LooperLayer, LooperPhase } from '../../hooks/usePadsLooper';
import type { PadBankId } from '../../instruments/pads/padsBanks';

type LooperBarProps = {
  phase: LooperPhase;
  bars: LooperBars;
  bpm: number;
  recArmed: boolean;
  layers: LooperLayer[];
  countInBeat: number;
  cycleStamp: number;
  loopDurationMs: number;
  /** Takes exist — the bar count is part of the recorded timebase. */
  barsLocked?: boolean;
  accent: string;
  bankIconFor: (bankId: PadBankId) => string;
  onStart: () => void;
  onStop: () => void;
  onSetBars: (bars: LooperBars) => void;
  onToggleRecArm: () => void;
  onCommitLayer: () => void;
  onToggleLayerMuted: (layerId: string) => void;
  onRemoveLayer: (layerId: string) => void;
  onClearLayers: () => void;
  onExport: () => void;
  onClose: () => void;
};

const BAR_OPTIONS: LooperBars[] = [1, 2, 4];

export function LooperBar({
  phase,
  bars,
  bpm,
  recArmed,
  layers,
  countInBeat,
  cycleStamp,
  loopDurationMs,
  barsLocked = false,
  accent,
  bankIconFor,
  onStart,
  onStop,
  onSetBars,
  onToggleRecArm,
  onCommitLayer,
  onToggleLayerMuted,
  onRemoveLayer,
  onClearLayers,
  onExport,
  onClose,
}: LooperBarProps) {
  const { t } = useTranslation();
  const [trackWidth, setTrackWidth] = useState(0);
  const playhead = useRef(new Animated.Value(0)).current;

  const running = phase === 'running';
  const hasEvents = layers.some((layer) => layer.events.length > 0);

  useEffect(() => {
    playhead.stopAnimation();
    if (!running || trackWidth <= 0 || loopDurationMs <= 0) {
      playhead.setValue(0);
      return;
    }
    playhead.setValue(0);
    const animation = Animated.timing(playhead, {
      toValue: trackWidth,
      duration: loopDurationMs,
      easing: Easing.linear,
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [cycleStamp, loopDurationMs, playhead, running, trackWidth]);

  const confirmRemoveLayer = useCallback(
    (layer: LooperLayer, index: number) => {
      Alert.alert(
        t('pads.looper.removeLayerTitle'),
        t('pads.looper.removeLayerMessage', { index: index + 1 }),
        [
          { text: t('common.cancel'), style: 'cancel' },
          {
            text: t('pads.looper.removeLayer'),
            style: 'destructive',
            onPress: () => onRemoveLayer(layer.id),
          },
        ],
      );
    },
    [onRemoveLayer, t],
  );

  return (
    <View style={[styles.container, { borderColor: `${accent}44` }]}>
      <View style={styles.transportRow}>
        <Pressable
          accessibilityLabel={running || phase === 'countIn' ? t('pads.looper.stop') : t('pads.looper.play')}
          onPress={running || phase === 'countIn' ? onStop : onStart}
          style={({ pressed }) => [
            styles.transportButton,
            (running || phase === 'countIn') && { backgroundColor: `${accent}33` },
            pressed && styles.pressed,
          ]}
        >
          <Ionicons
            color={running || phase === 'countIn' ? accent : '#E8E8EC'}
            name={running || phase === 'countIn' ? 'stop' : 'play'}
            size={18}
          />
        </Pressable>

        <Pressable
          accessibilityLabel={t('pads.looper.record')}
          onPress={onToggleRecArm}
          style={({ pressed }) => [
            styles.transportButton,
            recArmed && styles.recArmed,
            pressed && styles.pressed,
          ]}
        >
          <View style={[styles.recDot, recArmed && styles.recDotArmed]} />
        </Pressable>

        <View style={styles.barsGroup}>
          {BAR_OPTIONS.map((option) => {
            const locked = phase !== 'idle' || barsLocked;
            return (
              <Pressable
                key={option}
                disabled={locked}
                onPress={() => onSetBars(option)}
                style={({ pressed }) => [
                  styles.barChip,
                  option === bars && { backgroundColor: `${accent}2E`, borderColor: accent },
                  locked && option !== bars && styles.barChipDisabled,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={[styles.barChipText, option === bars && { color: accent }]}>
                  {option}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View
          onLayout={(event) => setTrackWidth(event.nativeEvent.layout.width)}
          style={styles.progressTrack}
        >
          {phase === 'countIn' && countInBeat > 0 ? (
            <Text style={[styles.countIn, { color: accent }]}>{countInBeat}</Text>
          ) : (
            <Animated.View
              style={[
                styles.playhead,
                {
                  backgroundColor: accent,
                  opacity: running ? 1 : 0,
                  transform: [{ translateX: playhead }],
                },
              ]}
            />
          )}
          <Text style={styles.bpmLabel}>
            {bpm} BPM · {bars} {t('pads.looper.barsShort')}
          </Text>
        </View>

        <Pressable
          accessibilityLabel={t('pads.looper.export')}
          disabled={!hasEvents}
          onPress={onExport}
          style={({ pressed }) => [
            styles.transportButton,
            !hasEvents && styles.disabled,
            pressed && styles.pressed,
          ]}
        >
          <Ionicons color={hasEvents ? '#FFD54F' : '#5A5A5E'} name="albums-outline" size={18} />
        </Pressable>

        <Pressable
          accessibilityLabel={t('common.close')}
          onPress={onClose}
          style={({ pressed }) => [styles.transportButton, pressed && styles.pressed]}
        >
          <Ionicons color="#A0A0A6" name="close" size={18} />
        </Pressable>
      </View>

      <View style={styles.layersRow}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.layersInner}>
            {layers.map((layer, index) => (
              <Pressable
                key={layer.id}
                onLongPress={() => confirmRemoveLayer(layer, index)}
                onPress={() => onToggleLayerMuted(layer.id)}
                style={({ pressed }) => [
                  styles.layerChip,
                  layer.muted && styles.layerChipMuted,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={styles.layerIcon}>{bankIconFor(layer.bankId)}</Text>
                <Text style={[styles.layerCount, layer.muted && styles.layerTextMuted]}>
                  {layer.events.length}
                </Text>
                {layer.muted ? (
                  <Ionicons color="#8A8A8E" name="volume-mute" size={11} />
                ) : null}
              </Pressable>
            ))}

            <Pressable
              onPress={onCommitLayer}
              style={({ pressed }) => [styles.layerChip, styles.addChip, pressed && styles.pressed]}
            >
              <Ionicons color={accent} name="add" size={14} />
              <Text style={[styles.addChipText, { color: accent }]}>
                {t('pads.looper.newLayer')}
              </Text>
            </Pressable>

            {hasEvents ? (
              <Pressable
                onPress={onClearLayers}
                style={({ pressed }) => [styles.layerChip, pressed && styles.pressed]}
              >
                <Ionicons color="#FF7043" name="trash-outline" size={13} />
              </Pressable>
            ) : null}
          </View>
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#15151B',
    borderBottomWidth: 1,
    paddingBottom: 6,
    paddingHorizontal: 8,
    paddingTop: 6,
  },
  transportRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  transportButton: {
    alignItems: 'center',
    borderRadius: 8,
    height: 32,
    justifyContent: 'center',
    width: 34,
  },
  recArmed: {
    backgroundColor: '#3A1214',
  },
  recDot: {
    backgroundColor: '#7A3A3E',
    borderRadius: 5,
    height: 10,
    width: 10,
  },
  recDotArmed: {
    backgroundColor: '#FF3B30',
  },
  barsGroup: {
    flexDirection: 'row',
    gap: 4,
  },
  barChip: {
    alignItems: 'center',
    borderColor: '#3A3A3E',
    borderRadius: 7,
    borderWidth: 1,
    height: 28,
    justifyContent: 'center',
    width: 28,
  },
  barChipDisabled: {
    opacity: 0.4,
  },
  barChipText: {
    color: '#C8C8CC',
    fontSize: 12,
    fontWeight: '800',
  },
  progressTrack: {
    backgroundColor: '#0E0E12',
    borderRadius: 8,
    flex: 1,
    height: 30,
    justifyContent: 'center',
    overflow: 'hidden',
  },
  playhead: {
    borderRadius: 1.5,
    bottom: 3,
    left: 0,
    position: 'absolute',
    top: 3,
    width: 3,
  },
  countIn: {
    fontSize: 18,
    fontWeight: '900',
    textAlign: 'center',
  },
  bpmLabel: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 10,
    fontWeight: '700',
    textAlign: 'center',
  },
  layersRow: {
    marginTop: 6,
  },
  layersInner: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  layerChip: {
    alignItems: 'center',
    backgroundColor: '#1E1E26',
    borderColor: '#33333C',
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 4,
    minHeight: 28,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  layerChipMuted: {
    opacity: 0.55,
  },
  layerIcon: {
    fontSize: 13,
  },
  layerCount: {
    color: '#E8E8EC',
    fontSize: 11,
    fontWeight: '800',
  },
  layerTextMuted: {
    color: '#8A8A8E',
  },
  addChip: {
    backgroundColor: 'transparent',
    borderStyle: 'dashed',
  },
  addChipText: {
    fontSize: 11,
    fontWeight: '800',
  },
  disabled: {
    opacity: 0.5,
  },
  pressed: {
    opacity: 0.7,
  },
});
