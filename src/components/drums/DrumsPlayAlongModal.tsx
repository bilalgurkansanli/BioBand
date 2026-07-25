import Ionicons from '@expo/vector-icons/Ionicons';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import type {
  DrumsPlayAlongPhase,
  DrumsPlayAlongResults,
  PlayMode,
  PlayTempo,
  SupportLevel,
} from '../../hooks/useDrumsPlayAlong';
import type { ImportDrumSongResult } from '../../hooks/useUserDrumSongs';
import { DRUM_SONG_CATALOG } from '../../instruments/drums/songs/catalog';
import type {
  DrumSongDefinition,
  DrumSongDifficulty,
  DrumSongScope,
} from '../../instruments/drums/songs/types';
import type { UserDrumSong } from '../../storage/userDrumSongsStorage';
import { RequestSongPrompt } from '../instrument/RequestSongPrompt';
import {
  TutorialChoiceRow,
  TutorialSongChip,
} from '../instrument/TutorialChoices';
import { colors } from '../../theme/colors';
import { isDocumentPickerAvailable } from '../../utils/documentPicker';
import { HorizontalSlider } from '../piano/HorizontalSlider';
import { ModalChromeHeader } from '../piano/ModalChromeHeader';

type DifficultyFilter = 'all' | DrumSongDifficulty;

const DIFFICULTY_FILTERS: DifficultyFilter[] = ['all', 'easy', 'medium', 'hard'];

const DIFFICULTY_COLORS: Record<DrumSongDifficulty, string> = {
  easy: '#2ECC71',
  medium: '#F39C12',
  hard: '#E74C3C',
};

function filterChipColor(option: DifficultyFilter): string {
  if (option === 'all') {
    return colors.accent;
  }
  return DIFFICULTY_COLORS[option];
}

type DrumsPlayAlongModalProps = {
  visible: boolean;
  phase: DrumsPlayAlongPhase;
  selectedSong: DrumSongDefinition | null;
  results: DrumsPlayAlongResults | null;
  tempo: PlayTempo;
  demoJustFinished?: boolean;
  userSongs: UserDrumSong[];
  importing: boolean;
  calibrateOffsetMs: number;
  calibratePreviewing: boolean;
  audioBusy: boolean;
  offsetMinMs: number;
  offsetMaxMs: number;
  onClose: () => void;
  onSelectSong: (songId: string) => void;
  onSelectPlayMode: (mode: PlayMode) => void;
  onSelectScope: (scope: DrumSongScope) => void;
  onSelectLevel: (level: SupportLevel) => void;
  onSelectTempo: (tempo: PlayTempo) => void;
  onGoBack: () => void;
  onBackToSongList: () => void;
  onReplay: () => void;
  onImportSong: () => Promise<ImportDrumSongResult>;
  onImportSongFromJsonText: (text: string) => Promise<ImportDrumSongResult>;
  onDeleteUserSong: (songId: string) => void;
  onPickBackingAudio: (
    sourceUri: string,
    fileNameHint?: string,
  ) => Promise<{ ok: boolean }>;
  onSetCalibrateOffset: (ms: number) => void;
  onPreviewCalibrate: () => void;
  onStopCalibratePreview: () => void;
  onConfirmCalibrate: () => void;
};

const TEMPO_OPTIONS: PlayTempo[] = ['slow', 'normal', 'fast'];

const LEVELS: {
  id: SupportLevel;
  titleKey: string;
  descriptionKey: string;
  icon: keyof typeof Ionicons.glyphMap;
}[] = [
  {
    id: 'guided',
    titleKey: 'drums.game.levels.guided',
    descriptionKey: 'drums.game.levels.guidedDesc',
    icon: 'eye-outline',
  },
  {
    id: 'medium',
    titleKey: 'drums.game.levels.medium',
    descriptionKey: 'drums.game.levels.mediumDesc',
    icon: 'footsteps-outline',
  },
  {
    id: 'free',
    titleKey: 'drums.game.levels.free',
    descriptionKey: 'drums.game.levels.freeDesc',
    icon: 'flash-outline',
  },
];

export function DrumsPlayAlongModal({
  visible,
  phase,
  selectedSong,
  results,
  tempo,
  demoJustFinished = false,
  userSongs,
  importing,
  calibrateOffsetMs,
  calibratePreviewing,
  audioBusy,
  offsetMinMs,
  offsetMaxMs,
  onClose,
  onSelectSong,
  onSelectPlayMode,
  onSelectScope,
  onSelectLevel,
  onSelectTempo,
  onGoBack,
  onBackToSongList,
  onReplay,
  onImportSong,
  onImportSongFromJsonText,
  onDeleteUserSong,
  onPickBackingAudio,
  onSetCalibrateOffset,
  onPreviewCalibrate,
  onStopCalibratePreview,
  onConfirmCalibrate,
}: DrumsPlayAlongModalProps) {
  const { t } = useTranslation();
  const [difficultyFilter, setDifficultyFilter] = useState<DifficultyFilter>('all');
  const [pasteOpen, setPasteOpen] = useState(false);
  const [pasteText, setPasteText] = useState('');

  const songs =
    difficultyFilter === 'all'
      ? DRUM_SONG_CATALOG
      : DRUM_SONG_CATALOG.filter((s) => s.difficulty === difficultyFilter);

  const showBack =
    phase === 'pickScope' ||
    phase === 'pickMode' ||
    phase === 'pickAudio' ||
    phase === 'calibrateOffset' ||
    phase === 'pickLevel' ||
    phase === 'results';

  const handlePickAudio = async () => {
    if (!isDocumentPickerAvailable()) {
      return;
    }
    const { pickAudioDocument } = await import('../../utils/documentPicker');
    const picked = await pickAudioDocument();
    if (!picked.ok) {
      return;
    }
    await onPickBackingAudio(picked.asset.uri, picked.asset.name);
  };

  const handleImport = async () => {
    if (!isDocumentPickerAvailable()) {
      setPasteOpen(true);
      return;
    }
    const result = await onImportSong();
    if (result.ok) {
      Alert.alert(t('drums.game.import.success'), result.song.title);
      return;
    }
    if (result.code === 'canceled') {
      return;
    }
    if (result.code === 'pickerUnavailable') {
      setPasteOpen(true);
      return;
    }
    Alert.alert(
      t('drums.game.import.button'),
      t(`drums.game.import.errors.${result.code}`),
    );
  };

  const handlePasteSubmit = async () => {
    const result = await onImportSongFromJsonText(pasteText);
    if (result.ok) {
      setPasteOpen(false);
      setPasteText('');
      Alert.alert(t('drums.game.import.success'), result.song.title);
      return;
    }
    Alert.alert(
      t('drums.game.import.pasteTitle'),
      t(`drums.game.import.errors.${result.code}`),
    );
  };

  const confirmDelete = (song: UserDrumSong) => {
    Alert.alert(
      t('drums.game.import.deleteTitle'),
      t('drums.game.import.deleteMessage', { title: song.title }),
      [
        { text: t('drums.game.import.deleteCancel'), style: 'cancel' },
        {
          text: t('drums.game.import.deleteConfirm'),
          style: 'destructive',
          onPress: () => onDeleteUserSong(song.id),
        },
      ],
    );
  };

  return (
    <Modal animationType="fade" transparent visible={visible} onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable
          accessibilityRole="button"
          onPress={onClose}
          style={StyleSheet.absoluteFillObject}
        />
        <View style={styles.card}>
          <ModalChromeHeader
            backLabel={showBack ? t('drums.game.back') : undefined}
            badge={t('drums.game.beta')}
            closeLabel={t('drums.game.close')}
            onBack={showBack ? onGoBack : undefined}
            onClose={onClose}
            title={t('drums.game.title')}
          />

          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            nestedScrollEnabled
            showsVerticalScrollIndicator
            style={styles.scroll}
          >
            {phase === 'pickSong' ? (
              <>
                <Text style={styles.sectionTitle}>{t('drums.game.pickSong')}</Text>

                <Pressable
                  disabled={importing}
                  onPress={() => void handleImport()}
                  style={({ pressed }) => [
                    styles.importButton,
                    pressed && styles.pressed,
                    importing && styles.rowDisabled,
                  ]}
                >
                  {importing ? (
                    <ActivityIndicator color={colors.accent} size="small" />
                  ) : (
                    <Ionicons color={colors.accent} name="folder-open-outline" size={20} />
                  )}
                  <View style={styles.importTextWrap}>
                    <Text style={styles.importTitle}>{t('drums.game.import.button')}</Text>
                    <Text style={styles.importHint}>{t('drums.game.import.hint')}</Text>
                  </View>
                </Pressable>

                <Pressable
                  disabled={importing}
                  onPress={() => setPasteOpen(true)}
                  style={({ pressed }) => [
                    styles.pasteButton,
                    pressed && styles.pressed,
                    importing && styles.rowDisabled,
                  ]}
                >
                  <Ionicons color={colors.textSecondary} name="clipboard-outline" size={18} />
                  <Text style={styles.pasteButtonText}>
                    {t('drums.game.import.pasteButton')}
                  </Text>
                </Pressable>

                <Text style={styles.sectionLabel}>{t('drums.game.import.mySongs')}</Text>
                {userSongs.length === 0 ? (
                  <Text style={styles.empty}>{t('drums.game.import.empty')}</Text>
                ) : (
                  userSongs.map((song) => (
                    <View key={song.id} style={styles.userSongRow}>
                      <Pressable
                        onPress={() => onSelectSong(song.id)}
                        style={({ pressed }) => [
                          styles.listItem,
                          styles.userSongMain,
                          pressed && styles.pressed,
                        ]}
                      >
                        <View style={styles.listItemMain}>
                          <Text style={styles.listItemTitle}>{song.title}</Text>
                          <Text style={styles.userSongMeta}>
                            {song.artist ?? song.source.toUpperCase()}
                          </Text>
                        </View>
                        <Ionicons
                          color={colors.textSecondary}
                          name="chevron-forward"
                          size={18}
                        />
                      </Pressable>
                      <Pressable
                        accessibilityLabel={t('drums.game.import.delete')}
                        hitSlop={8}
                        onPress={() => confirmDelete(song)}
                        style={({ pressed }) => [
                          styles.deleteBtn,
                          pressed && styles.pressed,
                        ]}
                      >
                        <Ionicons
                          color={colors.textSecondary}
                          name="trash-outline"
                          size={18}
                        />
                      </Pressable>
                    </View>
                  ))
                )}

                <Text style={styles.sectionLabel}>{t('drums.game.import.preloaded')}</Text>
                <View style={styles.filterRow}>
                  {DIFFICULTY_FILTERS.map((option) => {
                    const selected = option === difficultyFilter;
                    const accent = filterChipColor(option);
                    return (
                      <Pressable
                        key={option}
                        onPress={() => setDifficultyFilter(option)}
                        style={({ pressed }) => [
                          styles.filterChip,
                          selected && {
                            backgroundColor: `${accent}33`,
                            borderColor: accent,
                          },
                          pressed && styles.pressed,
                        ]}
                      >
                        <Text
                          style={[
                            styles.filterChipText,
                            selected && { color: accent },
                          ]}
                        >
                          {t(`drums.game.difficulty.${option}`)}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
                {songs.length === 0 ? (
                  <Text style={styles.empty}>{t('drums.game.difficulty.empty')}</Text>
                ) : (
                  songs.map((song) => (
                    <Pressable
                      key={song.id}
                      onPress={() => onSelectSong(song.id)}
                      style={({ pressed }) => [styles.listItem, pressed && styles.pressed]}
                    >
                      <View style={styles.listItemMain}>
                        <Text style={styles.listItemTitle}>{song.title}</Text>
                        <Text
                          style={[
                            styles.difficultyBadge,
                            { color: DIFFICULTY_COLORS[song.difficulty] },
                          ]}
                        >
                          {t(`drums.game.difficulty.${song.difficulty}`)}
                        </Text>
                      </View>
                      <Ionicons color={colors.textSecondary} name="chevron-forward" size={18} />
                    </Pressable>
                  ))
                )}

                <RequestSongPrompt
                  messageKey="drums.game.requestSong"
                  openFailedKey="drums.game.requestSongOpenFailed"
                />
              </>
            ) : null}

            {phase === 'pickScope' && selectedSong ? (
              <>
                <TutorialSongChip title={selectedSong.title} />
                <Text style={styles.stepSubtitle}>{t('drums.game.pickScope')}</Text>
                <TutorialChoiceRow
                  icon="cut-outline"
                  onPress={() => onSelectScope('partial')}
                  subtitle={t('drums.game.scopePartialHint')}
                  title={t('drums.game.scopePartial')}
                />
                <TutorialChoiceRow
                  icon="musical-notes-outline"
                  onPress={() => onSelectScope('full')}
                  subtitle={t('drums.game.scopeFullHint')}
                  title={t('drums.game.scopeFull')}
                />
              </>
            ) : null}

            {phase === 'pickAudio' && selectedSong ? (
              <>
                <TutorialSongChip title={selectedSong.title} />
                <Text style={styles.stepSubtitle}>{t('drums.game.pickAudio')}</Text>
                <Text style={styles.choiceHint}>{t('drums.game.pickAudioHint')}</Text>
                <Pressable
                  disabled={audioBusy}
                  onPress={() => void handlePickAudio()}
                  style={({ pressed }) => [
                    styles.importButton,
                    pressed && styles.pressed,
                    audioBusy && styles.rowDisabled,
                  ]}
                >
                  {audioBusy ? (
                    <ActivityIndicator color={colors.accent} size="small" />
                  ) : (
                    <Ionicons
                      color={colors.accent}
                      name="musical-notes-outline"
                      size={20}
                    />
                  )}
                  <View style={styles.importTextWrap}>
                    <Text style={styles.importTitle}>
                      {t('drums.game.pickAudioButton')}
                    </Text>
                  </View>
                </Pressable>
              </>
            ) : null}

            {phase === 'calibrateOffset' && selectedSong ? (
              <>
                <TutorialSongChip title={selectedSong.title} />
                <Text style={styles.stepSubtitle}>{t('drums.game.calibrate')}</Text>
                <Text style={styles.choiceHint}>{t('drums.game.calibrateHint')}</Text>

                <Text style={styles.offsetLabel}>
                  {t('drums.game.calibrateOffset', {
                    ms: Math.round(calibrateOffsetMs),
                  })}
                </Text>
                <HorizontalSlider
                  accentColor={colors.accent}
                  max={Math.min(offsetMaxMs, 30000)}
                  min={Math.max(offsetMinMs, 0)}
                  onValueChange={(value) =>
                    onSetCalibrateOffset(Math.round(value / 100) * 100)
                  }
                  style={styles.slider}
                  value={calibrateOffsetMs}
                />

                <View style={styles.calibrateActions}>
                  <Pressable
                    onPress={
                      calibratePreviewing
                        ? onStopCalibratePreview
                        : onPreviewCalibrate
                    }
                    style={({ pressed }) => [
                      styles.secondaryAction,
                      pressed && styles.pressed,
                    ]}
                  >
                    <Text style={styles.secondaryActionText}>
                      {calibratePreviewing
                        ? t('drums.game.calibrateStop')
                        : t('drums.game.calibratePreview')}
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={onConfirmCalibrate}
                    style={({ pressed }) => [
                      styles.primaryButton,
                      pressed && styles.pressed,
                    ]}
                  >
                    <Text style={styles.primaryButtonText}>
                      {t('drums.game.calibrateConfirm')}
                    </Text>
                  </Pressable>
                </View>
              </>
            ) : null}

            {phase === 'pickLevel' && selectedSong ? (
              <>
                <TutorialSongChip title={selectedSong.title} />
                {demoJustFinished ? (
                  <Text style={styles.demoFinished}>{t('drums.game.demoFinished')}</Text>
                ) : null}
                <Text style={styles.stepSubtitle}>{t('drums.game.pickLevel')}</Text>

                <Text style={styles.tempoLabel}>{t('drums.game.tempo.label')}</Text>
                <View style={styles.tempoRow}>
                  {TEMPO_OPTIONS.map((option) => {
                    const selected = option === tempo;
                    return (
                      <Pressable
                        key={option}
                        onPress={() => onSelectTempo(option)}
                        style={({ pressed }) => [
                          styles.tempoChip,
                          selected && styles.tempoChipSelected,
                          pressed && styles.pressed,
                        ]}
                      >
                        <Text
                          style={[
                            styles.tempoChipText,
                            selected && styles.tempoChipTextSelected,
                          ]}
                        >
                          {t(`drums.game.tempo.${option}`)}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>

                {LEVELS.map((entry) => (
                  <TutorialChoiceRow
                    icon={entry.icon}
                    key={entry.id}
                    onPress={() => onSelectLevel(entry.id)}
                    subtitle={t(entry.descriptionKey)}
                    title={t(entry.titleKey)}
                  />
                ))}

                <Pressable onPress={onBackToSongList} style={styles.backLink}>
                  <Text style={styles.backLinkText}>{t('drums.game.backToSongs')}</Text>
                </Pressable>
              </>
            ) : null}

            {phase === 'results' && results ? (
              <>
                <Text style={styles.sectionTitle}>{t('drums.game.results.title')}</Text>
                <Text style={styles.stars}>
                  {'★'.repeat(results.stars)}
                  {'☆'.repeat(3 - results.stars)}
                </Text>
                <Text style={styles.resultLine}>
                  {t('drums.game.results.accuracy', {
                    percent: Math.round(results.accuracy * 100),
                  })}
                </Text>
                <Text style={styles.resultLine}>
                  {t('drums.game.results.hits', { count: results.hits })}
                </Text>
                <Text style={styles.resultLine}>
                  {t('drums.game.results.misses', { count: results.misses })}
                </Text>
                <Text style={styles.resultLine}>
                  {t('drums.game.results.wrong', { count: results.wrongPresses })}
                </Text>
                <Pressable
                  onPress={onReplay}
                  style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}
                >
                  <Text style={styles.primaryButtonText}>{t('drums.game.results.replay')}</Text>
                </Pressable>
                <Pressable onPress={onGoBack} style={styles.backLink}>
                  <Text style={styles.backLinkText}>{t('drums.game.results.change')}</Text>
                </Pressable>
                <Pressable onPress={onBackToSongList} style={styles.backLink}>
                  <Text style={styles.backLinkText}>{t('drums.game.backToSongs')}</Text>
                </Pressable>
              </>
            ) : null}
          </ScrollView>
        </View>
      </View>

      <Modal
        animationType="fade"
        transparent
        visible={pasteOpen}
        onRequestClose={() => setPasteOpen(false)}
      >
        <View style={styles.overlay}>
          <View style={styles.pasteCard}>
            <ModalChromeHeader
              closeLabel={t('drums.game.close')}
              onClose={() => setPasteOpen(false)}
              title={t('drums.game.import.pasteTitle')}
            />
            <Text style={styles.pasteHint}>{t('drums.game.import.pasteHint')}</Text>
            <TextInput
              autoCapitalize="none"
              autoCorrect={false}
              multiline
              placeholder={t('drums.game.import.pastePlaceholder')}
              placeholderTextColor={colors.textSecondary}
              style={styles.pasteInput}
              textAlignVertical="top"
              value={pasteText}
              onChangeText={setPasteText}
            />
            <Pressable
              disabled={importing || pasteText.trim().length === 0}
              onPress={() => void handlePasteSubmit()}
              style={({ pressed }) => [
                styles.primaryButton,
                pressed && styles.pressed,
                (importing || pasteText.trim().length === 0) && styles.rowDisabled,
              ]}
            >
              <Text style={styles.primaryButtonText}>
                {t('drums.game.import.pasteSubmit')}
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 16,
    borderWidth: 1,
    maxHeight: '88%',
    maxWidth: 560,
    paddingHorizontal: 14,
    paddingVertical: 12,
    width: '100%',
  },
  pasteCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 16,
    borderWidth: 1,
    maxHeight: '88%',
    maxWidth: 560,
    paddingHorizontal: 14,
    paddingVertical: 12,
    width: '100%',
  },
  scroll: {
    flexGrow: 0,
    // Shrink with the card in short (landscape) windows — without this the
    // 420px cap can push the list's tail below the screen edge.
    flexShrink: 1,
    maxHeight: 420,
  },
  scrollContent: {
    gap: 10,
    paddingBottom: 12,
    paddingTop: 4,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  sectionLabel: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
    marginTop: 6,
    textTransform: 'uppercase',
  },
  stepSubtitle: {
    color: colors.textSecondary,
    fontSize: 13,
    marginBottom: 2,
    textAlign: 'center',
  },
  demoFinished: {
    color: colors.accent,
    fontSize: 14,
    fontWeight: '600',
  },
  importButton: {
    alignItems: 'center',
    backgroundColor: `${colors.accent}18`,
    borderColor: `${colors.accent}55`,
    borderRadius: 12,
    borderStyle: 'dashed',
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  importTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  importTitle: {
    color: colors.accent,
    fontSize: 14,
    fontWeight: '700',
  },
  importHint: {
    color: colors.textSecondary,
    fontSize: 11,
    marginTop: 2,
  },
  pasteButton: {
    alignItems: 'center',
    backgroundColor: colors.surfaceLight,
    borderColor: colors.border,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    paddingVertical: 10,
  },
  pasteButtonText: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  pasteHint: {
    color: colors.textSecondary,
    fontSize: 12,
    marginBottom: 8,
  },
  pasteInput: {
    backgroundColor: colors.surfaceLight,
    borderColor: colors.border,
    borderRadius: 12,
    borderWidth: 1,
    color: colors.text,
    fontFamily: 'monospace',
    fontSize: 12,
    marginBottom: 10,
    maxHeight: 220,
    minHeight: 140,
    padding: 10,
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterChip: {
    borderColor: '#3A3A3C',
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  filterChipText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  empty: {
    color: colors.textSecondary,
    fontSize: 12,
    paddingHorizontal: 4,
    paddingVertical: 4,
  },
  listItem: {
    alignItems: 'center',
    backgroundColor: colors.surfaceLight,
    borderRadius: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  listItemMain: {
    flex: 1,
    gap: 2,
  },
  listItemTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
  },
  userSongMeta: {
    color: colors.textSecondary,
    fontSize: 12,
  },
  difficultyBadge: {
    fontSize: 12,
    fontWeight: '600',
  },
  userSongRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  userSongMain: {
    flex: 1,
    minWidth: 0,
  },
  deleteBtn: {
    alignItems: 'center',
    backgroundColor: colors.surfaceLight,
    borderColor: colors.border,
    borderRadius: 12,
    borderWidth: 1,
    height: 52,
    justifyContent: 'center',
    width: 44,
  },
  choiceHint: {
    color: colors.textSecondary,
    fontSize: 13,
  },
  offsetLabel: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  slider: {
    height: 36,
    marginHorizontal: 4,
  },
  calibrateActions: {
    gap: 8,
  },
  secondaryAction: {
    alignItems: 'center',
    borderColor: colors.border,
    borderRadius: 10,
    borderWidth: 1,
    paddingVertical: 10,
  },
  secondaryActionText: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
  tempoLabel: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  tempoRow: {
    flexDirection: 'row',
    gap: 8,
  },
  tempoChip: {
    borderColor: '#3A3A3C',
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  tempoChipSelected: {
    backgroundColor: `${colors.accent}33`,
    borderColor: colors.accent,
  },
  tempoChipText: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  tempoChipTextSelected: {
    color: colors.accent,
  },
  stars: {
    color: '#FFD54F',
    fontSize: 28,
    letterSpacing: 4,
    textAlign: 'center',
  },
  resultLine: {
    color: colors.text,
    fontSize: 14,
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: colors.accent,
    borderRadius: 10,
    marginTop: 8,
    paddingVertical: 12,
  },
  primaryButtonText: {
    color: '#111',
    fontSize: 15,
    fontWeight: '700',
  },
  backLink: {
    alignItems: 'center',
    paddingVertical: 6,
  },
  backLinkText: {
    color: colors.accent,
    fontSize: 14,
    fontWeight: '600',
  },
  rowDisabled: {
    opacity: 0.5,
  },
  pressed: {
    opacity: 0.75,
  },
});
