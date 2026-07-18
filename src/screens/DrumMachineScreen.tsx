import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { DrumMachineSettingsModal } from '../components/drumMachine/DrumMachineSettingsModal';
import { LoadPatternModal } from '../components/drumMachine/LoadPatternModal';
import { StepSequencerGrid } from '../components/drumMachine/StepSequencerGrid';
import { LandscapeOverlay } from '../components/instrument/LandscapeOverlay';
import { useDrumMachine } from '../hooks/useDrumMachine';
import { useDrumMachineEngine } from '../hooks/useDrumMachineEngine';
import { usePianoOrientation } from '../hooks/usePianoOrientation';
import type { DrumMachineTypeId } from '../instruments/drumMachine/drumMachineBanks';
import type { RandomPatternStyle } from '../instruments/drumMachine/drumMachineRows';
import {
  deleteDrumMachineTake,
  loadDrumMachinePatterns,
  saveDrumMachinePattern,
  syncDrumMachinePatternsToRecordings,
  type DrumMachinePattern,
} from '../storage/drumMachinePatternsStorage';
import { colors } from '../theme/colors';
import type { InstrumentsStackParamList } from '../types/navigation';

const DICE_ICON: keyof typeof Ionicons.glyphMap =
  'dice' in Ionicons.glyphMap ? 'dice' : 'shuffle';

type Props = NativeStackScreenProps<InstrumentsStackParamList, 'DrumMachine'>;

export function DrumMachineScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { isPortrait } = usePianoOrientation(navigation);
  const {
    settingsReady,
    machineType,
    setMachineType,
    bank,
    grid,
    bpm,
    playing,
    currentStep,
    togglePlay,
    stop,
    nudgeBpm,
    toggleCell,
    previewRow,
    clearGrid,
    randomizeGrid,
    loadPattern,
  } = useDrumMachine();
  const { ready } = useDrumMachineEngine(machineType);
  const accent = bank.theme.accent;

  const [patterns, setPatterns] = useState<DrumMachinePattern[]>([]);
  const [loadOpen, setLoadOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [naming, setNaming] = useState(false);
  const [nameDraft, setNameDraft] = useState('');

  const refreshPatterns = useCallback(async () => {
    await syncDrumMachinePatternsToRecordings();
    setPatterns(await loadDrumMachinePatterns());
  }, []);

  useEffect(() => {
    void refreshPatterns();
  }, [refreshPatterns]);

  const handleBack = () => {
    stop();
    navigation.goBack();
  };

  const handleSave = () => {
    stop();
    setNameDraft(t('drumMachine.defaultPatternName'));
    setNaming(true);
  };

  const confirmSave = async () => {
    const title = nameDraft.trim();
    if (!title) return;
    await saveDrumMachinePattern({ title, bpm, grid, machineType });
    setNaming(false);
    await refreshPatterns();
  };

  const handleLoadSelect = (pattern: DrumMachinePattern) => {
    loadPattern(pattern);
    setLoadOpen(false);
  };

  const handleDelete = (id: string) => {
    Alert.alert(t('drumMachine.deletePattern'), t('drumMachine.deleteBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: () => {
          void deleteDrumMachineTake(id).then(refreshPatterns);
        },
      },
    ]);
  };

  const handleSelectType = (typeId: DrumMachineTypeId) => {
    setMachineType(typeId);
  };

  const runRandom = (style?: RandomPatternStyle, includeBpm = false) => {
    randomizeGrid({ style, includeBpm });
  };

  const handleRandomPress = () => {
    Alert.alert(t('drumMachine.randomTitle'), t('drumMachine.randomHint'), [
      {
        text: t('drumMachine.randomSurprise'),
        onPress: () => runRandom(undefined, true),
      },
      {
        text: t('drumMachine.randomGroove'),
        onPress: () => runRandom('groove'),
      },
      {
        text: t('drumMachine.randomSparse'),
        onPress: () => runRandom('sparse'),
      },
      {
        text: t('drumMachine.randomDense'),
        onPress: () => runRandom('dense'),
      },
      {
        text: t('drumMachine.randomOffbeat'),
        onPress: () => runRandom('offbeat'),
      },
      {
        text: t('drumMachine.randomMinimal'),
        onPress: () => runRandom('minimal'),
      },
      { text: t('common.cancel'), style: 'cancel' },
    ]);
  };

  const engineReady = settingsReady && ready;

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: bank.theme.stageBg,
          paddingTop: Math.max(insets.top, 8),
          paddingBottom: Math.max(insets.bottom, 8),
          paddingLeft: Math.max(insets.left, 10),
          paddingRight: Math.max(insets.right, 10),
        },
      ]}
    >
      <View style={styles.toolbar}>
        <IconBtn
          accent={accent}
          icon="chevron-back"
          label={t('common.back')}
          onPress={handleBack}
        />
        <LabeledToolbarBtn
          accentColor={accent}
          icon={DICE_ICON}
          label={t('drumMachine.random')}
          onPress={handleRandomPress}
          disabled={!engineReady}
        />
        <LabeledToolbarBtn
          accentColor={accent}
          icon={playing ? 'stop' : 'play'}
          label={playing ? t('drumMachine.stop') : t('drumMachine.start')}
          onPress={togglePlay}
          filled
          disabled={!engineReady && !playing}
        />
        <IconBtn
          accent={accent}
          icon="settings-outline"
          label={t('drumMachine.settings')}
          onPress={() => {
            stop();
            setSettingsOpen(true);
          }}
        />
        <Text style={[styles.title, { color: accent }]} numberOfLines={1}>
          {t('drumMachine.title')}
        </Text>
      </View>

      <View style={styles.stage}>
        {!engineReady ? (
          <View style={styles.loading}>
            <ActivityIndicator color={accent} size="large" />
            <Text style={styles.loadingText}>{t('drumMachine.loading')}</Text>
          </View>
        ) : (
          <StepSequencerGrid
            rows={bank.rows}
            theme={bank.theme}
            grid={grid}
            currentStep={currentStep}
            onToggleCell={toggleCell}
            onPreviewRow={previewRow}
          />
        )}
      </View>

      <View style={styles.footer}>
        <FooterBtn accent={accent} label={t('drumMachine.save')} onPress={handleSave} />
        <FooterBtn
          accent={accent}
          label={t('drumMachine.load')}
          onPress={() => {
            stop();
            void refreshPatterns().then(() => setLoadOpen(true));
          }}
        />
        <FooterBtn accent={accent} label={t('drumMachine.clear')} onPress={clearGrid} />
        <View style={[styles.bpmWrap, { borderColor: accent }]}>
          <BpmHoldButton
            accent={accent}
            icon="remove"
            accessibilityLabel={t('drumMachine.bpmDown')}
            onNudge={() => nudgeBpm(-1)}
          />
          <Text style={[styles.bpmText, { color: accent }]}>
            {t('drumMachine.bpm', { value: bpm })}
          </Text>
          <BpmHoldButton
            accent={accent}
            icon="add"
            accessibilityLabel={t('drumMachine.bpmUp')}
            onNudge={() => nudgeBpm(1)}
          />
        </View>
      </View>

      {naming ? (
        <View style={styles.nameOverlay}>
          <View style={[styles.nameCard, { borderColor: accent }]}>
            <Text style={styles.nameTitle}>{t('drumMachine.saveTitle')}</Text>
            <TextInput
              autoFocus
              placeholder={t('drumMachine.namePlaceholder')}
              placeholderTextColor={colors.textSecondary}
              style={[styles.nameInput, { borderColor: accent }]}
              value={nameDraft}
              onChangeText={setNameDraft}
              maxLength={40}
            />
            <View style={styles.nameActions}>
              <Pressable onPress={() => setNaming(false)} style={styles.nameBtn}>
                <Text style={styles.nameBtnText}>{t('common.cancel')}</Text>
              </Pressable>
              <Pressable
                onPress={() => void confirmSave()}
                style={[styles.nameBtn, styles.nameBtnPrimary, { backgroundColor: accent }]}
              >
                <Text style={[styles.nameBtnText, styles.nameBtnPrimaryText]}>
                  {t('common.save')}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      ) : null}

      <LoadPatternModal
        visible={loadOpen}
        patterns={patterns}
        onClose={() => setLoadOpen(false)}
        onSelect={handleLoadSelect}
        onDelete={handleDelete}
      />

      <DrumMachineSettingsModal
        visible={settingsOpen}
        machineType={machineType}
        onClose={() => setSettingsOpen(false)}
        onSelectType={handleSelectType}
      />

      <LandscapeOverlay visible={isPortrait} />
    </View>
  );
}

function IconBtn({
  icon,
  label,
  onPress,
  accent,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  accent: string;
}) {
  return (
    <Pressable
      accessibilityLabel={label}
      onPress={onPress}
      style={[styles.iconBtn, { borderColor: accent }]}
    >
      <Ionicons color={accent} name={icon} size={20} />
    </Pressable>
  );
}

function LabeledToolbarBtn({
  icon,
  label,
  onPress,
  accentColor,
  filled,
  disabled,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  accentColor: string;
  filled?: boolean;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityLabel={label}
      disabled={disabled}
      onPress={onPress}
      style={[
        styles.labeledBtn,
        {
          borderColor: accentColor,
          backgroundColor: filled ? accentColor : colors.surface,
        },
        disabled && styles.labeledBtnDisabled,
      ]}
    >
      <Ionicons color={filled ? '#FFFFFF' : accentColor} name={icon} size={18} />
      <Text
        style={[
          styles.labeledBtnText,
          { color: filled ? '#FFFFFF' : accentColor },
        ]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function FooterBtn({
  label,
  onPress,
  accent,
}: {
  label: string;
  onPress: () => void;
  accent: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.footerBtn, { borderColor: accent }]}
    >
      <Text style={[styles.footerBtnText, { color: accent }]}>{label}</Text>
    </Pressable>
  );
}

const BPM_HOLD_DELAY_MS = 320;
const BPM_HOLD_INTERVAL_MS = 70;

function BpmHoldButton({
  icon,
  accessibilityLabel,
  onNudge,
  accent,
}: {
  icon: 'add' | 'remove';
  accessibilityLabel: string;
  onNudge: () => void;
  accent: string;
}) {
  const delayRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearHold = useCallback(() => {
    if (delayRef.current) {
      clearTimeout(delayRef.current);
      delayRef.current = null;
    }
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  useEffect(() => clearHold, [clearHold]);

  const startHold = useCallback(() => {
    clearHold();
    onNudge();
    delayRef.current = setTimeout(() => {
      intervalRef.current = setInterval(() => {
        onNudge();
      }, BPM_HOLD_INTERVAL_MS);
    }, BPM_HOLD_DELAY_MS);
  }, [clearHold, onNudge]);

  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      onPressIn={startHold}
      onPressOut={clearHold}
      style={styles.bpmBtn}
    >
      <Ionicons color={accent} name={icon} size={18} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  toolbar: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
    marginBottom: 6,
  },
  iconBtn: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 10,
    borderWidth: 1.5,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  labeledBtn: {
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1.5,
    flexDirection: 'row',
    gap: 4,
    height: 40,
    paddingHorizontal: 10,
  },
  labeledBtnDisabled: {
    opacity: 0.45,
  },
  labeledBtnText: {
    fontSize: 11,
    fontWeight: '700',
  },
  title: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    marginLeft: 4,
    textAlign: 'right',
  },
  stage: {
    flex: 1,
    minHeight: 0,
  },
  loading: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  loadingText: {
    color: colors.textSecondary,
    fontSize: 13,
    marginTop: 10,
  },
  footer: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  footerBtn: {
    backgroundColor: colors.surface,
    borderRadius: 10,
    borderWidth: 1.5,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  footerBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  bpmWrap: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 10,
    borderWidth: 1.5,
    flexDirection: 'row',
    marginLeft: 'auto',
    paddingHorizontal: 4,
  },
  bpmBtn: {
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  bpmText: {
    fontSize: 13,
    fontWeight: '700',
    minWidth: 64,
    textAlign: 'center',
  },
  nameOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    padding: 24,
    zIndex: 20,
  },
  nameCard: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1.5,
    padding: 16,
    width: '100%',
  },
  nameTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 10,
  },
  nameInput: {
    backgroundColor: colors.surfaceLight,
    borderRadius: 10,
    borderWidth: 1.5,
    color: colors.text,
    fontSize: 15,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  nameActions: {
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'flex-end',
    marginTop: 12,
  },
  nameBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  nameBtnPrimary: {
    borderRadius: 8,
  },
  nameBtnText: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
  nameBtnPrimaryText: {
    color: '#FFFFFF',
  },
});
