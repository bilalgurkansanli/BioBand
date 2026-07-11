import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';

import {
  PIANO_FX_DEFAULTS,
  PIANO_FX_RANGES,
  type PianoFxSettings,
} from '../../instruments/piano/pianoFx';
import { colors } from '../../theme/colors';
import { HorizontalSlider } from './HorizontalSlider';
import { ModalChromeHeader } from './ModalChromeHeader';

const FX_COMMIT_DEBOUNCE_MS = 80;

type PianoFxModalProps = {
  visible: boolean;
  settings: PianoFxSettings;
  onChange: (settings: PianoFxSettings) => void;
  onClose: () => void;
};

type FxSliderProps = {
  label: string;
  value: number;
  min: number;
  max: number;
  formatValue: (value: number) => string;
  onChange: (value: number) => void;
  accent: string;
  disabled?: boolean;
  onSlidingStart?: () => void;
  onSlidingComplete?: () => void;
};

const FxSlider = React.memo(function FxSlider({
  label,
  value,
  min,
  max,
  formatValue,
  onChange,
  accent,
  disabled = false,
  onSlidingStart,
  onSlidingComplete,
}: FxSliderProps) {
  return (
    <View style={[styles.sliderBlock, disabled && styles.sliderDisabled]}>
      <View style={styles.sliderHeader}>
        <Text style={styles.sliderLabel}>{label}</Text>
        <Text style={[styles.sliderValue, { color: accent }]}>
          {formatValue(value)}
        </Text>
      </View>
      <HorizontalSlider
        accentColor={accent}
        disabled={disabled}
        max={max}
        min={min}
        onSlidingComplete={() => onSlidingComplete?.()}
        onSlidingStart={onSlidingStart}
        onValueChange={onChange}
        value={value}
      />
    </View>
  );
});

type FxSectionProps = {
  title: string;
  accent: string;
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
  onReset: () => void;
  resetLabel: string;
  children: React.ReactNode;
};

function FxSection({
  title,
  accent,
  enabled,
  onToggle,
  onReset,
  resetLabel,
  children,
}: FxSectionProps) {
  return (
    <View style={[styles.section, enabled && { borderColor: accent }]}>
      <View style={styles.sectionHeader}>
        <View style={styles.sectionTitleRow}>
          <View style={[styles.sectionDot, { backgroundColor: accent }]} />
          <Text style={styles.sectionTitle}>{title}</Text>
        </View>
        <Switch
          onValueChange={onToggle}
          thumbColor={enabled ? accent : '#7A7A7E'}
          trackColor={{ false: '#3A3A3C', true: `${accent}55` }}
          value={enabled}
        />
      </View>

      <View style={styles.sectionBody}>{children}</View>

      <Pressable
        onPress={onReset}
        style={({ pressed }) => [styles.resetButton, pressed && styles.pressed]}
      >
        <Text style={[styles.resetText, { color: accent }]}>{resetLabel}</Text>
      </Pressable>
    </View>
  );
}

const DISTORTION_ACCENT = '#FF7043';
const REVERB_ACCENT = '#4FC3F7';
const ECHO_ACCENT = '#BA68C8';

export function PianoFxModal({
  visible,
  settings,
  onChange,
  onClose,
}: PianoFxModalProps) {
  const { t } = useTranslation();
  const commitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const draftRef = useRef(settings);
  const wasVisibleRef = useRef(false);
  const [draft, setDraft] = useState(settings);

  draftRef.current = draft;

  useEffect(() => {
    if (visible && !wasVisibleRef.current) {
      setDraft(settings);
      draftRef.current = settings;
    }
    wasVisibleRef.current = visible;
  }, [visible, settings]);

  useEffect(
    () => () => {
      if (commitTimerRef.current) {
        clearTimeout(commitTimerRef.current);
      }
    },
    [],
  );

  const flushCommit = useCallback(() => {
    if (commitTimerRef.current) {
      clearTimeout(commitTimerRef.current);
      commitTimerRef.current = null;
    }
    onChange(draftRef.current);
  }, [onChange]);

  const commitSettings = useCallback(
    (nextSettings: PianoFxSettings, immediate = false) => {
      setDraft(nextSettings);
      draftRef.current = nextSettings;

      if (commitTimerRef.current) {
        clearTimeout(commitTimerRef.current);
        commitTimerRef.current = null;
      }

      if (immediate) {
        onChange(nextSettings);
        return;
      }

      commitTimerRef.current = setTimeout(() => {
        onChange(nextSettings);
        commitTimerRef.current = null;
      }, FX_COMMIT_DEBOUNCE_MS);
    },
    [onChange],
  );

  const handleSliderSlidingStart = useCallback(() => {}, []);

  const handleSliderSlidingComplete = useCallback(() => {
    flushCommit();
  }, [flushCommit]);

  const handleClose = useCallback(() => {
    flushCommit();
    onClose();
  }, [flushCommit, onClose]);

  const percent = (value: number) => `${Math.round(value * 100)}%`;

  return (
    <Modal animationType="fade" transparent visible={visible} onRequestClose={handleClose}>
      <Pressable style={styles.overlay} onPress={handleClose}>
        <Pressable style={styles.card} onPress={() => {}}>
          <ModalChromeHeader
            closeLabel={t('piano.fx.close')}
            onClose={handleClose}
            title={t('piano.fx.title')}
          />
          <Text style={styles.subtitle}>{t('piano.fx.subtitle')}</Text>

          <View style={styles.sectionsRow}>
            <FxSection
              accent={DISTORTION_ACCENT}
              enabled={draft.distortion.enabled}
              onReset={() => {
                const current = draftRef.current;
                commitSettings(
                  {
                    ...current,
                    distortion: {
                      ...PIANO_FX_DEFAULTS.distortion,
                      enabled: current.distortion.enabled,
                    },
                  },
                  true,
                );
              }}
              onToggle={(enabled) => {
                const current = draftRef.current;
                commitSettings(
                  { ...current, distortion: { ...current.distortion, enabled } },
                  true,
                );
              }}
              resetLabel={t('piano.fx.reset')}
              title={t('piano.fx.distortion')}
            >
              <FxSlider
                accent={DISTORTION_ACCENT}
                disabled={!draft.distortion.enabled}
                formatValue={percent}
                label={t('piano.fx.intensity')}
                max={PIANO_FX_RANGES.intensity.max}
                min={PIANO_FX_RANGES.intensity.min}
                onChange={(intensity) => {
                  const current = draftRef.current;
                  commitSettings({
                    ...current,
                    distortion: { ...current.distortion, intensity },
                  });
                }}
                onSlidingComplete={handleSliderSlidingComplete}
                onSlidingStart={handleSliderSlidingStart}
                value={draft.distortion.intensity}
              />
              <FxSlider
                accent={DISTORTION_ACCENT}
                disabled={!draft.distortion.enabled}
                formatValue={(hz) => `${Math.round(hz)} Hz`}
                label={t('piano.fx.lowPass')}
                max={PIANO_FX_RANGES.lowPassHz.max}
                min={PIANO_FX_RANGES.lowPassHz.min}
                onChange={(lowPassHz) => {
                  const current = draftRef.current;
                  commitSettings({
                    ...current,
                    distortion: { ...current.distortion, lowPassHz },
                  });
                }}
                onSlidingComplete={handleSliderSlidingComplete}
                onSlidingStart={handleSliderSlidingStart}
                value={draft.distortion.lowPassHz}
              />
            </FxSection>

            <FxSection
              accent={REVERB_ACCENT}
              enabled={draft.reverb.enabled}
              onReset={() => {
                const current = draftRef.current;
                commitSettings(
                  {
                    ...current,
                    reverb: {
                      ...PIANO_FX_DEFAULTS.reverb,
                      enabled: current.reverb.enabled,
                    },
                  },
                  true,
                );
              }}
              onToggle={(enabled) => {
                const current = draftRef.current;
                commitSettings(
                  { ...current, reverb: { ...current.reverb, enabled } },
                  true,
                );
              }}
              resetLabel={t('piano.fx.reset')}
              title={t('piano.fx.reverb')}
            >
              <FxSlider
                accent={REVERB_ACCENT}
                disabled={!draft.reverb.enabled}
                formatValue={(s) => `${s.toFixed(1)} s`}
                label={t('piano.fx.time')}
                max={PIANO_FX_RANGES.timeSeconds.max}
                min={PIANO_FX_RANGES.timeSeconds.min}
                onChange={(timeSeconds) => {
                  const current = draftRef.current;
                  commitSettings({
                    ...current,
                    reverb: { ...current.reverb, timeSeconds },
                  });
                }}
                onSlidingComplete={handleSliderSlidingComplete}
                onSlidingStart={handleSliderSlidingStart}
                value={draft.reverb.timeSeconds}
              />
              <FxSlider
                accent={REVERB_ACCENT}
                disabled={!draft.reverb.enabled}
                formatValue={percent}
                label={t('piano.fx.mix')}
                max={PIANO_FX_RANGES.mix.max}
                min={PIANO_FX_RANGES.mix.min}
                onChange={(mix) => {
                  const current = draftRef.current;
                  commitSettings({ ...current, reverb: { ...current.reverb, mix } });
                }}
                onSlidingComplete={handleSliderSlidingComplete}
                onSlidingStart={handleSliderSlidingStart}
                value={draft.reverb.mix}
              />
            </FxSection>

            <FxSection
              accent={ECHO_ACCENT}
              enabled={draft.echo.enabled}
              onReset={() => {
                const current = draftRef.current;
                commitSettings(
                  {
                    ...current,
                    echo: { ...PIANO_FX_DEFAULTS.echo, enabled: current.echo.enabled },
                  },
                  true,
                );
              }}
              onToggle={(enabled) => {
                const current = draftRef.current;
                commitSettings({ ...current, echo: { ...current.echo, enabled } }, true);
              }}
              resetLabel={t('piano.fx.reset')}
              title={t('piano.fx.echo')}
            >
              <FxSlider
                accent={ECHO_ACCENT}
                disabled={!draft.echo.enabled}
                formatValue={(ms) => `${Math.round(ms)} ms`}
                label={t('piano.fx.delay')}
                max={PIANO_FX_RANGES.delayMs.max}
                min={PIANO_FX_RANGES.delayMs.min}
                onChange={(delayMs) => {
                  const current = draftRef.current;
                  commitSettings({ ...current, echo: { ...current.echo, delayMs } });
                }}
                onSlidingComplete={handleSliderSlidingComplete}
                onSlidingStart={handleSliderSlidingStart}
                value={draft.echo.delayMs}
              />
              <FxSlider
                accent={ECHO_ACCENT}
                disabled={!draft.echo.enabled}
                formatValue={percent}
                label={t('piano.fx.feedback')}
                max={PIANO_FX_RANGES.feedback.max}
                min={PIANO_FX_RANGES.feedback.min}
                onChange={(feedback) => {
                  const current = draftRef.current;
                  commitSettings({ ...current, echo: { ...current.echo, feedback } });
                }}
                onSlidingComplete={handleSliderSlidingComplete}
                onSlidingStart={handleSliderSlidingStart}
                value={draft.echo.feedback}
              />
              <FxSlider
                accent={ECHO_ACCENT}
                disabled={!draft.echo.enabled}
                formatValue={percent}
                label={t('piano.fx.mix')}
                max={PIANO_FX_RANGES.echoMix.max}
                min={PIANO_FX_RANGES.echoMix.min}
                onChange={(mix) => {
                  const current = draftRef.current;
                  commitSettings({ ...current, echo: { ...current.echo, mix } });
                }}
                onSlidingComplete={handleSliderSlidingComplete}
                onSlidingStart={handleSliderSlidingStart}
                value={draft.echo.mix}
              />
            </FxSection>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    flex: 1,
    justifyContent: 'center',
    padding: 16,
  },
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 20,
    borderWidth: 1,
    maxHeight: '96%',
    maxWidth: 720,
    paddingHorizontal: 14,
    paddingVertical: 14,
    width: '100%',
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: 12,
    marginBottom: 12,
    marginTop: 2,
    textAlign: 'center',
  },
  sectionsRow: {
    alignItems: 'stretch',
    flexDirection: 'row',
    gap: 10,
    width: '100%',
  },
  section: {
    backgroundColor: colors.surfaceLight,
    borderColor: colors.border,
    borderRadius: 16,
    borderWidth: 1,
    flex: 1,
    minWidth: 0,
    paddingBottom: 10,
    paddingHorizontal: 12,
    paddingTop: 12,
  },
  sectionHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  sectionTitleRow: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  sectionDot: {
    borderRadius: 4,
    height: 8,
    marginRight: 7,
    width: 8,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
  sectionBody: {
    flexGrow: 0,
    flexShrink: 0,
  },
  sliderBlock: {
    marginBottom: 4,
  },
  sliderDisabled: {
    opacity: 0.4,
  },
  sliderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  sliderLabel: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  sliderValue: {
    fontSize: 12,
    fontVariant: ['tabular-nums'],
    fontWeight: '700',
  },
  resetButton: {
    alignSelf: 'center',
    marginTop: 'auto',
    paddingBottom: 4,
    paddingHorizontal: 12,
    paddingTop: 10,
  },
  resetText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  pressed: {
    opacity: 0.75,
  },
});
