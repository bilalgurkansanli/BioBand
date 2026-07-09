import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import type {
  PlayAlongPhase,
  PlayAlongResults,
  SupportLevel,
} from '../../hooks/usePianoPlayAlong';
import { SONG_CATALOG } from '../../instruments/piano/songs/catalog';
import type { SongDefinition } from '../../instruments/piano/songs/types';
import { colors } from '../../theme/colors';

type PlayAlongModalProps = {
  visible: boolean;
  phase: PlayAlongPhase;
  selectedSong: SongDefinition | null;
  results: PlayAlongResults | null;
  onClose: () => void;
  onSelectSong: (songId: string) => void;
  onSelectLevel: (level: SupportLevel) => void;
  onBackToSongList: () => void;
  onReplay: () => void;
};

const LEVELS: { id: SupportLevel; titleKey: string; descriptionKey: string }[] = [
  {
    id: 'guided',
    titleKey: 'piano.game.levels.guided',
    descriptionKey: 'piano.game.levels.guidedDesc',
  },
  {
    id: 'medium',
    titleKey: 'piano.game.levels.medium',
    descriptionKey: 'piano.game.levels.mediumDesc',
  },
  {
    id: 'free',
    titleKey: 'piano.game.levels.free',
    descriptionKey: 'piano.game.levels.freeDesc',
  },
];

function Stars({ count }: { count: 0 | 1 | 2 | 3 }) {
  return (
    <Text style={styles.stars}>
      {'★'.repeat(count)}
      <Text style={styles.starsEmpty}>{'★'.repeat(3 - count)}</Text>
    </Text>
  );
}

export function PlayAlongModal({
  visible,
  phase,
  selectedSong,
  results,
  onClose,
  onSelectSong,
  onSelectLevel,
  onBackToSongList,
  onReplay,
}: PlayAlongModalProps) {
  const { t } = useTranslation();

  return (
    <Modal animationType="fade" transparent visible={visible} onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.title}>{t('piano.game.title')}</Text>

          {phase === 'pickSong' ? (
            <>
              <Text style={styles.subtitle}>{t('piano.game.pickSong')}</Text>
              <ScrollView style={styles.list}>
                {SONG_CATALOG.map((entry) => {
                  const isPlayable = entry.song !== null;

                  return (
                    <Pressable
                      disabled={!isPlayable}
                      key={entry.id}
                      onPress={() => onSelectSong(entry.id)}
                      style={({ pressed }) => [
                        styles.row,
                        !isPlayable && styles.rowDisabled,
                        pressed && styles.pressed,
                      ]}
                    >
                      <View style={styles.rowHeader}>
                        <Text
                          style={[styles.rowTitle, !isPlayable && styles.rowTitleDisabled]}
                        >
                          {entry.title}
                        </Text>
                        {!isPlayable ? (
                          <View style={styles.comingSoonBadge}>
                            <Text style={styles.comingSoonText}>
                              {t('piano.game.comingSoon')}
                            </Text>
                          </View>
                        ) : null}
                      </View>
                      <Text style={styles.rowDescription}>{entry.artist}</Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </>
          ) : null}

          {phase === 'pickLevel' && selectedSong ? (
            <>
              <Text style={styles.selectedSongTitle}>{selectedSong.title}</Text>
              <Text style={styles.subtitle}>{t('piano.game.pickLevel')}</Text>
              <ScrollView style={styles.list}>
                {LEVELS.map((levelOption) => (
                  <Pressable
                    key={levelOption.id}
                    onPress={() => onSelectLevel(levelOption.id)}
                    style={({ pressed }) => [styles.row, pressed && styles.pressed]}
                  >
                    <Text style={styles.rowTitle}>{t(levelOption.titleKey)}</Text>
                    <Text style={styles.rowDescription}>{t(levelOption.descriptionKey)}</Text>
                  </Pressable>
                ))}
              </ScrollView>
              <Pressable
                onPress={onBackToSongList}
                style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}
              >
                <Text style={styles.secondaryButtonText}>{t('piano.game.backToSongs')}</Text>
              </Pressable>
            </>
          ) : null}

          {phase === 'results' && results ? (
            <>
              <Text style={styles.resultsHeading}>{t('piano.game.results.title')}</Text>
              {selectedSong ? (
                <Text style={styles.selectedSongTitle}>{selectedSong.title}</Text>
              ) : null}
              <Stars count={results.stars} />
              <Text style={styles.accuracy}>
                {t('piano.game.results.accuracy', {
                  percent: Math.round(results.accuracy * 100),
                })}
              </Text>

              <View style={styles.statsBox}>
                <Text style={styles.statLine}>
                  {t('piano.game.results.hits', { count: results.hits })}
                </Text>
                {results.autos > 0 ? (
                  <Text style={styles.statLine}>
                    {t('piano.game.results.autos', { count: results.autos })}
                  </Text>
                ) : null}
                {results.misses > 0 ? (
                  <Text style={styles.statLine}>
                    {t('piano.game.results.misses', { count: results.misses })}
                  </Text>
                ) : null}
                {results.wrongPresses > 0 ? (
                  <Text style={styles.statLine}>
                    {t('piano.game.results.wrong', { count: results.wrongPresses })}
                  </Text>
                ) : null}
              </View>

              <Pressable
                onPress={onReplay}
                style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}
              >
                <Text style={styles.primaryButtonText}>{t('piano.game.results.replay')}</Text>
              </Pressable>
              <Pressable
                onPress={onBackToSongList}
                style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}
              >
                <Text style={styles.secondaryButtonText}>{t('piano.game.results.change')}</Text>
              </Pressable>
            </>
          ) : null}

          <Pressable
            onPress={onClose}
            style={({ pressed }) => [styles.closeButton, pressed && styles.pressed]}
          >
            <Text style={styles.closeButtonText}>{t('piano.game.close')}</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 16,
    borderWidth: 1,
    maxHeight: '85%',
    padding: 20,
    width: '100%',
  },
  title: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: 14,
    marginBottom: 16,
    textAlign: 'center',
  },
  list: {
    maxHeight: 260,
  },
  row: {
    backgroundColor: colors.surfaceLight,
    borderColor: colors.border,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 10,
    padding: 14,
  },
  rowDisabled: {
    opacity: 0.55,
  },
  rowHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  rowTitle: {
    color: colors.text,
    flexShrink: 1,
    fontSize: 16,
    fontWeight: '700',
  },
  rowTitleDisabled: {
    color: colors.textSecondary,
  },
  comingSoonBadge: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    marginLeft: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  comingSoonText: {
    color: colors.textSecondary,
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  rowDescription: {
    color: colors.textSecondary,
    fontSize: 13,
  },
  selectedSongTitle: {
    color: colors.accent,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  resultsHeading: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 6,
    textAlign: 'center',
  },
  stars: {
    color: '#FFD54F',
    fontSize: 34,
    letterSpacing: 6,
    marginBottom: 6,
    textAlign: 'center',
  },
  starsEmpty: {
    color: colors.border,
  },
  accuracy: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
    textAlign: 'center',
  },
  statsBox: {
    backgroundColor: colors.surfaceLight,
    borderColor: colors.border,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 14,
    padding: 12,
  },
  statLine: {
    color: colors.textSecondary,
    fontSize: 14,
    marginBottom: 4,
    textAlign: 'center',
  },
  primaryButton: {
    backgroundColor: colors.accent,
    borderRadius: 12,
    marginBottom: 10,
    paddingVertical: 14,
  },
  primaryButtonText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
  secondaryButton: {
    borderColor: colors.border,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
    paddingVertical: 12,
  },
  secondaryButtonText: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  closeButton: {
    marginTop: 8,
    paddingVertical: 10,
  },
  closeButtonText: {
    color: colors.textSecondary,
    fontSize: 14,
    textAlign: 'center',
  },
  pressed: {
    opacity: 0.75,
  },
});
