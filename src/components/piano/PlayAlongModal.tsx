import { Ionicons } from '@expo/vector-icons';
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
  PlayAlongPhase,
  PlayAlongResults,
  PlayMode,
  SongScope,
  SupportLevel,
} from '../../hooks/usePianoPlayAlong';
import type { ImportSongResult } from '../../hooks/useUserSongs';
import { SONG_CATALOG } from '../../instruments/piano/songs/catalog';
import type { SongDefinition } from '../../instruments/piano/songs/types';
import type { UserSong } from '../../storage/userSongsStorage';
import { colors } from '../../theme/colors';
import { ModalChromeHeader } from './ModalChromeHeader';

type PlayAlongModalProps = {
  visible: boolean;
  phase: PlayAlongPhase;
  selectedSong: SongDefinition | null;
  results: PlayAlongResults | null;
  userSongs: UserSong[];
  importing: boolean;
  onClose: () => void;
  onSelectSong: (songId: string) => void;
  onSelectPlayMode: (mode: PlayMode) => void;
  onSelectScope: (scope: SongScope) => void;
  onSelectLevel: (level: SupportLevel) => void;
  onGoBack: () => void;
  onBackToSongList: () => void;
  onReplay: () => void;
  onImportSong: () => Promise<ImportSongResult>;
  onImportSongFromJsonText: (text: string) => Promise<ImportSongResult>;
  onDeleteUserSong: (songId: string) => void;
};

const LEVELS: {
  id: SupportLevel;
  titleKey: string;
  descriptionKey: string;
  icon: keyof typeof Ionicons.glyphMap;
}[] = [
  {
    id: 'guided',
    titleKey: 'piano.game.levels.guided',
    descriptionKey: 'piano.game.levels.guidedDesc',
    icon: 'eye-outline',
  },
  {
    id: 'medium',
    titleKey: 'piano.game.levels.medium',
    descriptionKey: 'piano.game.levels.mediumDesc',
    icon: 'footsteps-outline',
  },
  {
    id: 'free',
    titleKey: 'piano.game.levels.free',
    descriptionKey: 'piano.game.levels.freeDesc',
    icon: 'flash-outline',
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

type ChoiceRowProps = {
  title: string;
  subtitle?: string;
  icon: keyof typeof Ionicons.glyphMap;
  disabled?: boolean;
  comingSoon?: boolean;
  comingSoonLabel?: string;
  showChevron?: boolean;
  onPress?: () => void;
};

function ChoiceRow({
  title,
  subtitle,
  icon,
  disabled = false,
  comingSoon = false,
  comingSoonLabel,
  showChevron = false,
  onPress,
}: ChoiceRowProps) {
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        disabled && styles.rowDisabled,
        pressed && !disabled && styles.pressed,
      ]}
    >
      <View style={[styles.iconWrap, disabled && styles.iconWrapDisabled]}>
        <Ionicons
          color={disabled ? colors.textSecondary : colors.accent}
          name={icon}
          size={18}
        />
      </View>

      <View style={styles.rowText}>
        <Text
          numberOfLines={1}
          style={[styles.rowTitle, disabled && styles.rowTitleDisabled]}
        >
          {title}
        </Text>
        {subtitle ? (
          <Text numberOfLines={2} style={styles.rowSubtitle}>
            {subtitle}
          </Text>
        ) : null}
      </View>

      {comingSoon ? (
        <View style={styles.comingSoonBadge}>
          <Text style={styles.comingSoonText}>{comingSoonLabel}</Text>
        </View>
      ) : showChevron ? (
        <Ionicons color={colors.textSecondary} name="chevron-forward" size={18} />
      ) : null}
    </Pressable>
  );
}

export function PlayAlongModal({
  visible,
  phase,
  selectedSong,
  results,
  userSongs,
  importing,
  onClose,
  onSelectSong,
  onSelectPlayMode,
  onSelectScope,
  onSelectLevel,
  onGoBack,
  onBackToSongList,
  onReplay,
  onImportSong,
  onImportSongFromJsonText,
  onDeleteUserSong,
}: PlayAlongModalProps) {
  const { t } = useTranslation();
  const [pasteOpen, setPasteOpen] = useState(false);
  const [pasteText, setPasteText] = useState('');

  const showBack =
    phase === 'pickMode' ||
    phase === 'pickScope' ||
    phase === 'pickLevel' ||
    phase === 'results';

  const subtitle =
    phase === 'pickSong'
      ? t('piano.game.pickSong')
      : phase === 'pickMode'
        ? t('piano.game.pickMode')
        : phase === 'pickScope'
          ? t('piano.game.pickScope')
          : phase === 'pickLevel'
            ? t('piano.game.pickLevel')
            : phase === 'results'
              ? t('piano.game.results.title')
              : null;

  const handleImport = async () => {
    const result = await onImportSong();
    if (result.ok) {
      Alert.alert(t('piano.game.import.success'), result.song.title);
      return;
    }
    if (result.code === 'canceled') {
      return;
    }
    if (result.code === 'pickerUnavailable') {
      Alert.alert(
        t('piano.game.import.button'),
        t('piano.game.import.pickerUnavailable'),
        [
          { text: t('piano.game.import.deleteCancel'), style: 'cancel' },
          {
            text: t('piano.game.import.pasteButton'),
            onPress: () => setPasteOpen(true),
          },
        ],
      );
      return;
    }
    Alert.alert(
      t('piano.game.import.button'),
      t(`piano.game.import.errors.${result.code}`),
    );
  };

  const handlePasteSubmit = async () => {
    const result = await onImportSongFromJsonText(pasteText);
    if (result.ok) {
      setPasteOpen(false);
      setPasteText('');
      Alert.alert(t('piano.game.import.success'), result.song.title);
      return;
    }
    Alert.alert(
      t('piano.game.import.pasteTitle'),
      t(`piano.game.import.errors.${result.code}`),
    );
  };

  const confirmDelete = (song: UserSong) => {
    Alert.alert(
      t('piano.game.import.deleteTitle'),
      t('piano.game.import.deleteMessage', { title: song.title }),
      [
        { text: t('piano.game.import.deleteCancel'), style: 'cancel' },
        {
          text: t('piano.game.import.deleteConfirm'),
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
            backLabel={showBack ? t('piano.game.back') : undefined}
            closeLabel={t('piano.game.close')}
            onBack={showBack ? onGoBack : undefined}
            onClose={onClose}
            title={t('piano.game.title')}
          />

          {selectedSong && phase !== 'pickSong' ? (
            <View style={styles.songChip}>
              <Ionicons color={colors.accent} name="musical-note" size={12} />
              <Text numberOfLines={1} style={styles.songChipText}>
                {selectedSong.title}
              </Text>
            </View>
          ) : null}
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}

          <ScrollView
            bounces
            contentContainerStyle={styles.listContent}
            keyboardShouldPersistTaps="handled"
            nestedScrollEnabled
            showsVerticalScrollIndicator
            style={styles.list}
          >
            {phase === 'pickSong' ? (
              <>
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
                    <Text style={styles.importTitle}>{t('piano.game.import.button')}</Text>
                    <Text style={styles.importHint}>{t('piano.game.import.hint')}</Text>
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
                  <Text style={styles.pasteButtonText}>{t('piano.game.import.pasteButton')}</Text>
                </Pressable>

                <Text style={styles.sectionLabel}>{t('piano.game.import.mySongs')}</Text>
                {userSongs.length === 0 ? (
                  <Text style={styles.emptyText}>{t('piano.game.import.empty')}</Text>
                ) : (
                  userSongs.map((song) => (
                    <View key={song.id} style={styles.userSongRow}>
                      <View style={styles.userSongMain}>
                        <ChoiceRow
                          icon="document-attach-outline"
                          onPress={() => onSelectSong(song.id)}
                          showChevron
                          subtitle={song.artist ?? song.source.toUpperCase()}
                          title={song.title}
                        />
                      </View>
                      <Pressable
                        accessibilityLabel={t('piano.game.import.delete')}
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

                <Text style={styles.sectionLabel}>{t('piano.game.import.preloaded')}</Text>
                {SONG_CATALOG.map((entry) => {
                  const isPlayable = entry.song !== null;
                  return (
                    <ChoiceRow
                      comingSoon={!isPlayable}
                      comingSoonLabel={t('piano.game.comingSoon')}
                      disabled={!isPlayable}
                      icon="musical-notes"
                      key={entry.id}
                      onPress={() => onSelectSong(entry.id)}
                      showChevron={isPlayable}
                      subtitle={entry.artist}
                      title={entry.title}
                    />
                  );
                })}
              </>
            ) : null}

            {phase === 'pickMode' ? (
              <>
                <ChoiceRow
                  icon="keypad-outline"
                  onPress={() => onSelectPlayMode('piano')}
                  showChevron
                  subtitle={t('piano.game.modePianoHint')}
                  title={t('piano.game.modePiano')}
                />
                <ChoiceRow
                  comingSoon={!selectedSong?.backingTrack}
                  comingSoonLabel={t('piano.game.comingSoon')}
                  disabled={!selectedSong?.backingTrack}
                  icon="people-outline"
                  onPress={() => onSelectPlayMode('fullBand')}
                  showChevron={Boolean(selectedSong?.backingTrack)}
                  subtitle={t('piano.game.modeFullBandHint')}
                  title={t('piano.game.modeFullBand')}
                />
              </>
            ) : null}

            {phase === 'pickScope' ? (
              <>
                <ChoiceRow
                  icon="cut-outline"
                  onPress={() => onSelectScope('partial')}
                  showChevron
                  title={t('piano.game.scopePartial')}
                />
                <ChoiceRow
                  icon="albums-outline"
                  onPress={() => onSelectScope('full')}
                  showChevron
                  title={t('piano.game.scopeFull')}
                />
              </>
            ) : null}

            {phase === 'pickLevel'
              ? LEVELS.map((levelOption) => (
                  <ChoiceRow
                    icon={levelOption.icon}
                    key={levelOption.id}
                    onPress={() => onSelectLevel(levelOption.id)}
                    showChevron
                    subtitle={t(levelOption.descriptionKey)}
                    title={t(levelOption.titleKey)}
                  />
                ))
              : null}

            {phase === 'results' && results ? (
              <View style={styles.resultsBlock}>
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
                  <Text style={styles.primaryButtonText}>
                    {t('piano.game.results.replay')}
                  </Text>
                </Pressable>
                <Pressable
                  onPress={onGoBack}
                  style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}
                >
                  <Text style={styles.secondaryButtonText}>
                    {t('piano.game.results.change')}
                  </Text>
                </Pressable>
                <Pressable
                  onPress={onBackToSongList}
                  style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}
                >
                  <Text style={styles.secondaryButtonText}>
                    {t('piano.game.backToSongs')}
                  </Text>
                </Pressable>
              </View>
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
              closeLabel={t('piano.game.close')}
              onClose={() => setPasteOpen(false)}
              title={t('piano.game.import.pasteTitle')}
            />
            <Text style={styles.pasteHint}>{t('piano.game.import.pasteHint')}</Text>
            <TextInput
              autoCapitalize="none"
              autoCorrect={false}
              multiline
              placeholder={t('piano.game.import.pastePlaceholder')}
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
                {t('piano.game.import.pasteSubmit')}
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
  songChip: {
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: `${colors.accent}22`,
    borderColor: `${colors.accent}55`,
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 6,
    marginBottom: 6,
    maxWidth: '100%',
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  songChipText: {
    color: colors.accent,
    flexShrink: 1,
    fontSize: 12,
    fontWeight: '700',
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: 13,
    marginBottom: 10,
    textAlign: 'center',
  },
  list: {
    flexGrow: 0,
    maxHeight: 360,
  },
  listContent: {
    gap: 8,
    paddingBottom: 8,
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
  sectionLabel: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
    marginTop: 6,
    textTransform: 'uppercase',
  },
  emptyText: {
    color: colors.textSecondary,
    fontSize: 12,
    paddingHorizontal: 4,
    paddingVertical: 4,
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
  row: {
    alignItems: 'center',
    backgroundColor: colors.surfaceLight,
    borderColor: colors.border,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    minHeight: 52,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  rowDisabled: {
    opacity: 0.55,
  },
  iconWrap: {
    alignItems: 'center',
    backgroundColor: `${colors.accent}22`,
    borderRadius: 18,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  iconWrapDisabled: {
    backgroundColor: colors.surface,
  },
  rowText: {
    flex: 1,
    minWidth: 0,
  },
  rowTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
  rowTitleDisabled: {
    color: colors.textSecondary,
  },
  rowSubtitle: {
    color: colors.textSecondary,
    fontSize: 11,
    lineHeight: 15,
    marginTop: 2,
  },
  comingSoonBadge: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  comingSoonText: {
    color: colors.textSecondary,
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  resultsBlock: {
    gap: 4,
  },
  stars: {
    color: '#FFD54F',
    fontSize: 28,
    letterSpacing: 4,
    marginBottom: 2,
    textAlign: 'center',
  },
  starsEmpty: {
    color: colors.border,
  },
  accuracy: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  statsBox: {
    backgroundColor: colors.surfaceLight,
    borderColor: colors.border,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  statLine: {
    color: colors.textSecondary,
    fontSize: 13,
    marginBottom: 2,
    textAlign: 'center',
  },
  primaryButton: {
    backgroundColor: colors.accent,
    borderRadius: 12,
    paddingVertical: 12,
  },
  primaryButtonText: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center',
  },
  secondaryButton: {
    borderColor: colors.border,
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 10,
  },
  secondaryButtonText: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  pressed: {
    opacity: 0.75,
  },
});
