import { Ionicons } from '@expo/vector-icons';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import type {
  GuitarPlayAlongPhase,
  GuitarPlayAlongResults,
  PlayTempo,
  SupportLevel,
} from '../../hooks/useGuitarPlayAlong';
import { GUITAR_SONG_CATALOG } from '../../instruments/guitar/songs/catalog';
import type {
  GuitarSongDefinition,
  GuitarSongDifficulty,
  GuitarSongScope,
} from '../../instruments/guitar/songs/types';
import { colors } from '../../theme/colors';
import {
  getStoreDisplayName,
  openStoreReview,
} from '../../utils/openStoreReview';
import { ModalChromeHeader } from '../piano/ModalChromeHeader';

type DifficultyFilter = 'all' | GuitarSongDifficulty;

const DIFFICULTY_FILTERS: DifficultyFilter[] = ['all', 'easy', 'medium', 'hard'];

const DIFFICULTY_COLORS: Record<GuitarSongDifficulty, string> = {
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

type GuitarPlayAlongModalProps = {
  visible: boolean;
  phase: GuitarPlayAlongPhase;
  selectedSong: GuitarSongDefinition | null;
  results: GuitarPlayAlongResults | null;
  tempo: PlayTempo;
  demoJustFinished?: boolean;
  onClose: () => void;
  onSelectSong: (songId: string) => void;
  onSelectScope: (scope: GuitarSongScope) => void;
  onSelectLevel: (level: SupportLevel) => void;
  onSelectTempo: (tempo: PlayTempo) => void;
  onGoBack: () => void;
  onBackToSongList: () => void;
  onReplay: () => void;
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
    titleKey: 'guitar.game.levels.guided',
    descriptionKey: 'guitar.game.levels.guidedDesc',
    icon: 'eye-outline',
  },
  {
    id: 'medium',
    titleKey: 'guitar.game.levels.medium',
    descriptionKey: 'guitar.game.levels.mediumDesc',
    icon: 'footsteps-outline',
  },
  {
    id: 'free',
    titleKey: 'guitar.game.levels.free',
    descriptionKey: 'guitar.game.levels.freeDesc',
    icon: 'flash-outline',
  },
];

export function GuitarPlayAlongModal({
  visible,
  phase,
  selectedSong,
  results,
  tempo,
  demoJustFinished = false,
  onClose,
  onSelectSong,
  onSelectScope,
  onSelectLevel,
  onSelectTempo,
  onGoBack,
  onBackToSongList,
  onReplay,
}: GuitarPlayAlongModalProps) {
  const { t } = useTranslation();
  const [difficultyFilter, setDifficultyFilter] = useState<DifficultyFilter>('all');

  const songs =
    difficultyFilter === 'all'
      ? GUITAR_SONG_CATALOG
      : GUITAR_SONG_CATALOG.filter((s) => s.difficulty === difficultyFilter);

  const showBack =
    phase === 'pickScope' || phase === 'pickLevel' || phase === 'results';

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
            backLabel={showBack ? t('guitar.game.back') : undefined}
            badge={t('guitar.game.beta')}
            closeLabel={t('guitar.game.close')}
            onBack={showBack ? onGoBack : undefined}
            onClose={onClose}
            title={t('guitar.game.title')}
          />

          <ScrollView
            contentContainerStyle={styles.scrollContent}
            nestedScrollEnabled
            showsVerticalScrollIndicator
            style={styles.scroll}
          >
            {phase === 'pickSong' ? (
              <>
                <Text style={styles.sectionTitle}>{t('guitar.game.pickSong')}</Text>

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
                          {t(`guitar.game.difficulty.${option}`)}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>

                {songs.length === 0 ? (
                  <Text style={styles.empty}>{t('guitar.game.difficulty.empty')}</Text>
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
                          {t(`guitar.game.difficulty.${song.difficulty}`)}
                        </Text>
                      </View>
                      <Ionicons color={colors.textSecondary} name="chevron-forward" size={18} />
                    </Pressable>
                  ))
                )}

                <Pressable
                  accessibilityRole="link"
                  onPress={() => {
                    void openStoreReview().catch(() => {
                      Alert.alert(t('guitar.game.requestSongOpenFailed'));
                    });
                  }}
                  style={({ pressed }) => [
                    styles.requestSongButton,
                    pressed && styles.pressed,
                  ]}
                >
                  <Ionicons
                    color={colors.accent}
                    name="chatbubble-ellipses-outline"
                    size={16}
                  />
                  <Text style={styles.requestSongText}>
                    {t('guitar.game.requestSong', {
                      store: getStoreDisplayName(),
                    })}
                  </Text>
                </Pressable>
              </>
            ) : null}

            {phase === 'pickScope' && selectedSong ? (
              <>
                <Text style={styles.songHeading}>{selectedSong.title}</Text>
                <Text style={styles.sectionTitle}>{t('guitar.game.pickScope')}</Text>
                <Pressable
                  onPress={() => onSelectScope('partial')}
                  style={({ pressed }) => [styles.choiceCard, pressed && styles.pressed]}
                >
                  <Text style={styles.choiceTitle}>{t('guitar.game.scopePartial')}</Text>
                  <Text style={styles.choiceHint}>{t('guitar.game.scopePartialHint')}</Text>
                </Pressable>
                <Pressable
                  onPress={() => onSelectScope('full')}
                  style={({ pressed }) => [styles.choiceCard, pressed && styles.pressed]}
                >
                  <Text style={styles.choiceTitle}>{t('guitar.game.scopeFull')}</Text>
                  <Text style={styles.choiceHint}>{t('guitar.game.scopeFullHint')}</Text>
                </Pressable>
              </>
            ) : null}

            {phase === 'pickLevel' && selectedSong ? (
              <>
                <Text style={styles.songHeading}>{selectedSong.title}</Text>
                {demoJustFinished ? (
                  <Text style={styles.demoFinished}>{t('guitar.game.demoFinished')}</Text>
                ) : null}
                <Text style={styles.sectionTitle}>{t('guitar.game.pickLevel')}</Text>

                <Text style={styles.tempoLabel}>{t('guitar.game.tempo.label')}</Text>
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
                          {t(`guitar.game.tempo.${option}`)}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>

                {LEVELS.map((entry) => (
                  <Pressable
                    key={entry.id}
                    onPress={() => onSelectLevel(entry.id)}
                    style={({ pressed }) => [styles.choiceCard, pressed && styles.pressed]}
                  >
                    <View style={styles.levelHeader}>
                      <Ionicons color="#FFD54F" name={entry.icon} size={20} />
                      <Text style={styles.choiceTitle}>{t(entry.titleKey)}</Text>
                    </View>
                    <Text style={styles.choiceHint}>{t(entry.descriptionKey)}</Text>
                  </Pressable>
                ))}

                <Pressable onPress={onBackToSongList} style={styles.backLink}>
                  <Text style={styles.backLinkText}>{t('guitar.game.backToSongs')}</Text>
                </Pressable>
              </>
            ) : null}

            {phase === 'results' && results ? (
              <>
                <Text style={styles.sectionTitle}>{t('guitar.game.results.title')}</Text>
                <Text style={styles.stars}>
                  {'★'.repeat(results.stars)}
                  {'☆'.repeat(3 - results.stars)}
                </Text>
                <Text style={styles.resultLine}>
                  {t('guitar.game.results.accuracy', {
                    percent: Math.round(results.accuracy * 100),
                  })}
                </Text>
                <Text style={styles.resultLine}>
                  {t('guitar.game.results.hits', { count: results.hits })}
                </Text>
                <Text style={styles.resultLine}>
                  {t('guitar.game.results.misses', { count: results.misses })}
                </Text>
                <Text style={styles.resultLine}>
                  {t('guitar.game.results.wrong', { count: results.wrongPresses })}
                </Text>
                <Pressable
                  onPress={onReplay}
                  style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}
                >
                  <Text style={styles.primaryButtonText}>{t('guitar.game.results.replay')}</Text>
                </Pressable>
                <Pressable onPress={onGoBack} style={styles.backLink}>
                  <Text style={styles.backLinkText}>{t('guitar.game.results.change')}</Text>
                </Pressable>
                <Pressable onPress={onBackToSongList} style={styles.backLink}>
                  <Text style={styles.backLinkText}>{t('guitar.game.backToSongs')}</Text>
                </Pressable>
              </>
            ) : null}
          </ScrollView>
        </View>
      </View>
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
    borderRadius: 16,
    maxHeight: '88%',
    maxWidth: 440,
    paddingBottom: 12,
    paddingHorizontal: 14,
    paddingTop: 6,
    width: '100%',
  },
  scroll: {
    maxHeight: 420,
  },
  scrollContent: {
    gap: 10,
    paddingBottom: 8,
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
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
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
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  filterChipText: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
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
    marginRight: 8,
  },
  listItemTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
  },
  difficultyBadge: {
    fontSize: 12,
    fontWeight: '600',
  },
  empty: {
    color: colors.textSecondary,
    fontSize: 13,
    paddingVertical: 8,
  },
  songHeading: {
    color: colors.accent,
    fontSize: 14,
    fontWeight: '700',
  },
  choiceCard: {
    backgroundColor: colors.surfaceLight,
    borderRadius: 12,
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  choiceTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
  },
  choiceHint: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
  },
  levelHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
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
  requestSongButton: {
    alignItems: 'flex-start',
    backgroundColor: `${colors.accent}12`,
    borderColor: `${colors.accent}44`,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  requestSongText: {
    color: colors.textSecondary,
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
  },
  pressed: {
    opacity: 0.75,
  },
});
