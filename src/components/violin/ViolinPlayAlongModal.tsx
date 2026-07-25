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
  ViolinPlayAlongPhase,
  ViolinPlayAlongResults,
  PlayMode,
  PlayTempo,
  SupportLevel,
} from '../../hooks/useViolinPlayAlong';
import type { ImportViolinSongResult } from '../../hooks/useUserViolinSongs';
import { VIOLIN_SONG_CATALOG } from '../../instruments/violin/songs/catalog';
import type {
  ViolinSongDefinition,
  ViolinSongDifficulty,
  ViolinSongScope,
} from '../../instruments/violin/songs/types';
import type { UserViolinSong } from '../../storage/userViolinSongsStorage';
import { RequestSongPrompt } from '../instrument/RequestSongPrompt';
import {
  TutorialChoiceRow,
  TutorialSongChip,
} from '../instrument/TutorialChoices';
import { colors } from '../../theme/colors';
import { isDocumentPickerAvailable } from '../../utils/documentPicker';
import { HorizontalSlider } from '../piano/HorizontalSlider';
import { ModalChromeHeader } from '../piano/ModalChromeHeader';

type DifficultyFilter = 'all' | ViolinSongDifficulty;

const DIFFICULTY_FILTERS: DifficultyFilter[] = ['all', 'easy', 'medium', 'hard'];

const DIFFICULTY_COLORS: Record<ViolinSongDifficulty, string> = {
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

type ViolinPlayAlongModalProps = {
  visible: boolean;
  phase: ViolinPlayAlongPhase;
  selectedSong: ViolinSongDefinition | null;
  results: ViolinPlayAlongResults | null;
  tempo: PlayTempo;
  demoJustFinished?: boolean;
  userSongs: UserViolinSong[];
  importing: boolean;
  calibrateOffsetMs: number;
  calibratePreviewing: boolean;
  audioBusy: boolean;
  offsetMinMs: number;
  offsetMaxMs: number;
  onClose: () => void;
  onSelectSong: (songId: string) => void;
  onSelectPlayMode: (mode: PlayMode) => void;
  onSelectScope: (scope: ViolinSongScope) => void;
  onSelectLevel: (level: SupportLevel) => void;
  onSelectTempo: (tempo: PlayTempo) => void;
  onGoBack: () => void;
  onBackToSongList: () => void;
  onReplay: () => void;
  onImportSong: () => Promise<ImportViolinSongResult>;
  onImportSongFromJsonText: (text: string) => Promise<ImportViolinSongResult>;
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
    titleKey: 'violin.game.levels.guided',
    descriptionKey: 'violin.game.levels.guidedDesc',
    icon: 'eye-outline',
  },
  {
    id: 'medium',
    titleKey: 'violin.game.levels.medium',
    descriptionKey: 'violin.game.levels.mediumDesc',
    icon: 'footsteps-outline',
  },
  {
    id: 'free',
    titleKey: 'violin.game.levels.free',
    descriptionKey: 'violin.game.levels.freeDesc',
    icon: 'flash-outline',
  },
];

export function ViolinPlayAlongModal({
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
}: ViolinPlayAlongModalProps) {
  const { t } = useTranslation();
  const [difficultyFilter, setDifficultyFilter] = useState<DifficultyFilter>('all');
  const [pasteOpen, setPasteOpen] = useState(false);
  const [pasteText, setPasteText] = useState('');

  const songs =
    difficultyFilter === 'all'
      ? VIOLIN_SONG_CATALOG
      : VIOLIN_SONG_CATALOG.filter((s) => s.difficulty === difficultyFilter);

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
      Alert.alert(t('violin.game.import.success'), result.song.title);
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
      t('violin.game.import.button'),
      t(`violin.game.import.errors.${result.code}`),
    );
  };

  const handlePasteSubmit = async () => {
    const result = await onImportSongFromJsonText(pasteText);
    if (result.ok) {
      setPasteOpen(false);
      setPasteText('');
      Alert.alert(t('violin.game.import.success'), result.song.title);
      return;
    }
    Alert.alert(
      t('violin.game.import.pasteTitle'),
      t(`violin.game.import.errors.${result.code}`),
    );
  };

  const confirmDelete = (song: UserViolinSong) => {
    Alert.alert(
      t('violin.game.import.deleteTitle'),
      t('violin.game.import.deleteMessage', { title: song.title }),
      [
        { text: t('violin.game.import.deleteCancel'), style: 'cancel' },
        {
          text: t('violin.game.import.deleteConfirm'),
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
            backLabel={showBack ? t('violin.game.back') : undefined}
            badge={t('violin.game.beta')}
            closeLabel={t('violin.game.close')}
            onBack={showBack ? onGoBack : undefined}
            onClose={onClose}
            title={t('violin.game.title')}
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
                <Text style={styles.sectionTitle}>{t('violin.game.pickSong')}</Text>

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
                    <Text style={styles.importTitle}>{t('violin.game.import.button')}</Text>
                    <Text style={styles.importHint}>{t('violin.game.import.hint')}</Text>
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
                    {t('violin.game.import.pasteButton')}
                  </Text>
                </Pressable>

                <Text style={styles.sectionLabel}>{t('violin.game.import.mySongs')}</Text>
                {userSongs.length === 0 ? (
                  <Text style={styles.empty}>{t('violin.game.import.empty')}</Text>
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
                          <Text style={styles.songMeta}>
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
                        accessibilityLabel={t('violin.game.import.delete')}
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

                <Text style={styles.sectionLabel}>{t('violin.game.import.preloaded')}</Text>
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
                          {t(`violin.game.difficulty.${option}`)}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
                {songs.length === 0 ? (
                  <Text style={styles.empty}>{t('violin.game.difficulty.empty')}</Text>
                ) : (
                  songs.map((song) => (
                    <Pressable
                      key={song.id}
                      onPress={() => onSelectSong(song.id)}
                      style={({ pressed }) => [styles.listItem, pressed && styles.pressed]}
                    >
                      <View style={styles.listItemMain}>
                        <Text style={styles.listItemTitle}>{song.title}</Text>
                        {song.artist ? (
                          <Text style={styles.songMeta}>{song.artist}</Text>
                        ) : null}
                        <Text
                          style={[
                            styles.difficultyBadge,
                            { color: DIFFICULTY_COLORS[song.difficulty] },
                          ]}
                        >
                          {t(`violin.game.difficulty.${song.difficulty}`)}
                        </Text>
                      </View>
                      <Ionicons color={colors.textSecondary} name="chevron-forward" size={18} />
                    </Pressable>
                  ))
                )}

                <RequestSongPrompt
                  messageKey="violin.game.requestSong"
                  openFailedKey="violin.game.requestSongOpenFailed"
                />
              </>
            ) : null}

            {phase === 'pickScope' && selectedSong ? (
              <>
                <TutorialSongChip title={selectedSong.title} />
                <Text style={styles.stepSubtitle}>{t('violin.game.pickScope')}</Text>
                <TutorialChoiceRow
                  icon="cut-outline"
                  onPress={() => onSelectScope('partial')}
                  subtitle={t('violin.game.scopePartialHint')}
                  title={t('violin.game.scopePartial')}
                />
                <TutorialChoiceRow
                  icon="musical-notes-outline"
                  onPress={() => onSelectScope('full')}
                  subtitle={t('violin.game.scopeFullHint')}
                  title={t('violin.game.scopeFull')}
                />
              </>
            ) : null}

            {phase === 'pickAudio' && selectedSong ? (
              <>
                <TutorialSongChip title={selectedSong.title} />
                <Text style={styles.stepSubtitle}>{t('violin.game.pickAudio')}</Text>
                <Text style={styles.choiceHint}>{t('violin.game.pickAudioHint')}</Text>
                <Pressable
                  disabled={audioBusy}
                  onPress={() => void handlePickAudio()}
                  style={({ pressed }) => [
                    styles.audioButton,
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
                  <Text style={styles.audioButtonText}>
                    {t('violin.game.pickAudioButton')}
                  </Text>
                </Pressable>
              </>
            ) : null}

            {phase === 'calibrateOffset' && selectedSong ? (
              <>
                <TutorialSongChip title={selectedSong.title} />
                <Text style={styles.stepSubtitle}>{t('violin.game.calibrate')}</Text>
                <Text style={styles.choiceHint}>{t('violin.game.calibrateHint')}</Text>

                <Text style={styles.offsetLabel}>
                  {t('violin.game.calibrateOffset', {
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
                        ? t('violin.game.calibrateStop')
                        : t('violin.game.calibratePreview')}
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
                      {t('violin.game.calibrateConfirm')}
                    </Text>
                  </Pressable>
                </View>
              </>
            ) : null}

            {phase === 'pickLevel' && selectedSong ? (
              <>
                <TutorialSongChip title={selectedSong.title} />
                {demoJustFinished ? (
                  <Text style={styles.demoFinished}>{t('violin.game.demoFinished')}</Text>
                ) : null}
                <Text style={styles.stepSubtitle}>{t('violin.game.pickLevel')}</Text>

                <Text style={styles.tempoLabel}>{t('violin.game.tempo.label')}</Text>
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
                          {t(`violin.game.tempo.${option}`)}
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
                  <Text style={styles.backLinkText}>{t('violin.game.backToSongs')}</Text>
                </Pressable>
              </>
            ) : null}

            {phase === 'results' && results ? (
              <>
                <Text style={styles.sectionTitle}>{t('violin.game.results.title')}</Text>
                <Text style={styles.stars}>
                  {'★'.repeat(results.stars)}
                  {'☆'.repeat(3 - results.stars)}
                </Text>
                <Text style={styles.resultLine}>
                  {t('violin.game.results.accuracy', {
                    percent: Math.round(results.accuracy * 100),
                  })}
                </Text>
                <Text style={styles.resultLine}>
                  {t('violin.game.results.hits', { count: results.hits })}
                </Text>
                <Text style={styles.resultLine}>
                  {t('violin.game.results.misses', { count: results.misses })}
                </Text>
                <Text style={styles.resultLine}>
                  {t('violin.game.results.wrong', { count: results.wrongPresses })}
                </Text>
                <Pressable
                  onPress={onReplay}
                  style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}
                >
                  <Text style={styles.primaryButtonText}>{t('violin.game.results.replay')}</Text>
                </Pressable>
                <Pressable onPress={onGoBack} style={styles.backLink}>
                  <Text style={styles.backLinkText}>{t('violin.game.results.change')}</Text>
                </Pressable>
                <Pressable onPress={onBackToSongList} style={styles.backLink}>
                  <Text style={styles.backLinkText}>{t('violin.game.backToSongs')}</Text>
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
              closeLabel={t('violin.game.close')}
              onClose={() => setPasteOpen(false)}
              title={t('violin.game.import.pasteTitle')}
            />
            <Text style={styles.pasteHint}>{t('violin.game.import.pasteHint')}</Text>
            <TextInput
              autoCapitalize="none"
              autoCorrect={false}
              multiline
              placeholder={t('violin.game.import.pastePlaceholder')}
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
                {t('violin.game.import.pasteSubmit')}
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
    // Let the card's maxHeight bound it — a fixed height here made the list
    // unscrollable when the window was shorter than the cap (landscape).
    flexGrow: 0,
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
  songMeta: {
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
  stepSubtitle: {
    color: colors.textSecondary,
    fontSize: 13,
    marginBottom: 2,
    textAlign: 'center',
  },
  choiceHint: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
  },
  audioButton: {
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
  audioButtonText: {
    color: colors.accent,
    fontSize: 14,
    fontWeight: '700',
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
  rowDisabled: {
    opacity: 0.55,
  },
  tempoLabel: {
    color: colors.textSecondary,
    fontSize: 12,
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
    flex: 1,
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
    textAlign: 'center',
  },
  tempoChipTextSelected: {
    color: colors.accent,
  },
  demoFinished: {
    color: '#FFD54F',
    fontSize: 13,
    fontWeight: '600',
  },
  stars: {
    color: '#FFD54F',
    fontSize: 28,
    letterSpacing: 4,
    textAlign: 'center',
  },
  resultLine: {
    color: colors.text,
    fontSize: 15,
    textAlign: 'center',
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
    paddingVertical: 8,
  },
  backLinkText: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  pressed: {
    opacity: 0.75,
  },
});
