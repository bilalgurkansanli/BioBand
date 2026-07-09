import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import type { SongDefinition } from '../../instruments/piano/songs/types';
import { colors } from '../../theme/colors';
import type { TutorialPhase } from '../../hooks/usePianoTutorial';

type PianoTutorialModalProps = {
  visible: boolean;
  phase: TutorialPhase;
  songs: SongDefinition[];
  selectedSong: SongDefinition | null;
  onClose: () => void;
  onSelectSong: (songId: string) => void;
  onStartWatch: () => void;
  onBackToSongList: () => void;
};

export function PianoTutorialModal({
  visible,
  phase,
  songs,
  selectedSong,
  onClose,
  onSelectSong,
  onStartWatch,
  onBackToSongList,
}: PianoTutorialModalProps) {
  const { t } = useTranslation();

  return (
    <Modal animationType="fade" transparent visible={visible} onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.title}>{t('tutorial.title')}</Text>

          {phase === 'pickSong' ? (
            <>
              <Text style={styles.subtitle}>{t('tutorial.pickSong')}</Text>
              <ScrollView style={styles.songList}>
                {songs.map((song) => (
                  <Pressable
                    key={song.id}
                    onPress={() => onSelectSong(song.id)}
                    style={({ pressed }) => [styles.songRow, pressed && styles.pressed]}
                  >
                    <Text style={styles.songTitle}>{song.title}</Text>
                    <Text style={styles.songDescription}>
                      {song.descriptionKey ? t(song.descriptionKey) : song.artist}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            </>
          ) : null}

          {phase === 'readyToWatch' && selectedSong ? (
            <>
              <Text style={styles.selectedSongTitle}>{selectedSong.title}</Text>
              <Text style={styles.subtitle}>{t('tutorial.watchDescription')}</Text>
              <Pressable
                onPress={onStartWatch}
                style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}
              >
                <Text style={styles.primaryButtonText}>{t('tutorial.watchNow')}</Text>
              </Pressable>
              <Pressable
                onPress={onBackToSongList}
                style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}
              >
                <Text style={styles.secondaryButtonText}>{t('tutorial.backToSongs')}</Text>
              </Pressable>
            </>
          ) : null}

          <Pressable
            onPress={onClose}
            style={({ pressed }) => [styles.closeButton, pressed && styles.pressed]}
          >
            <Text style={styles.closeButtonText}>{t('tutorial.close')}</Text>
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
    maxHeight: '80%',
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
  songList: {
    maxHeight: 240,
  },
  songRow: {
    backgroundColor: colors.surfaceLight,
    borderColor: colors.border,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 10,
    padding: 14,
  },
  songTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  songDescription: {
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
