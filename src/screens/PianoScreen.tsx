import { useState } from 'react';
import { ActivityIndicator, LayoutChangeEvent, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PianoKeyboard } from '../components/piano/PianoKeyboard';
import { PianoLandscapeOverlay } from '../components/piano/PianoLandscapeOverlay';
import { PianoTutorialModal } from '../components/piano/PianoTutorialModal';
import { TutorialBanner } from '../components/piano/TutorialBanner';
import { usePianoEngine } from '../hooks/usePianoEngine';
import { usePianoOrientation } from '../hooks/usePianoOrientation';
import { usePianoTutorial } from '../hooks/usePianoTutorial';
import { colors } from '../theme/colors';
import type { InstrumentsStackParamList } from '../types/navigation';

type Props = NativeStackScreenProps<InstrumentsStackParamList, 'Piano'>;

export function PianoScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { ready, error, playNote } = usePianoEngine();
  const [keyboardSize, setKeyboardSize] = useState({ width: 0, height: 0 });

  const {
    songs,
    phase,
    selectedSong,
    demoNoteId,
    guideNoteId,
    openTutorial,
    closeTutorial,
    selectSong,
    backToSongList,
    startWatch,
    handleNotePress,
  } = usePianoTutorial(playNote);

  const { isPortrait } = usePianoOrientation(navigation);

  const handleKeyboardLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setKeyboardSize({ width, height });
  };

  const isModalVisible = phase === 'pickSong' || phase === 'readyToWatch';

  return (
    <View
      pointerEvents={isPortrait ? 'none' : 'auto'}
      style={[
        styles.container,
        {
          paddingLeft: insets.left + 8,
          paddingRight: insets.right + 8,
          paddingTop: insets.top + 4,
          paddingBottom: insets.bottom + 4,
        },
      ]}
    >
      <View style={styles.header}>
        <Pressable
          hitSlop={8}
          onPress={() => navigation.goBack()}
          style={({ pressed }) => [styles.backWrap, pressed && styles.pressed]}
        >
          <Text style={styles.backButton}>← {t('common.back')}</Text>
        </Pressable>
        <Text style={styles.title}>{t('instruments.piano')}</Text>
        <Pressable
          hitSlop={8}
          onPress={openTutorial}
          style={({ pressed }) => [styles.tutorialButton, pressed && styles.pressed]}
        >
          <Text style={styles.tutorialButtonText}>{t('tutorial.start')}</Text>
        </Pressable>
      </View>

      <TutorialBanner phase={phase} songTitleKey={selectedSong?.titleKey} />

      <View style={styles.keyboardArea} onLayout={handleKeyboardLayout}>
        {!ready ? (
          <View style={styles.loading}>
            <ActivityIndicator color={colors.accent} size="large" />
            <Text style={styles.loadingText}>
              {error ? t('instruments.pianoLoadError') : t('instruments.pianoLoading')}
            </Text>
          </View>
        ) : keyboardSize.width > 0 && keyboardSize.height > 0 ? (
          <PianoKeyboard
            demoNoteId={demoNoteId}
            guideNoteId={guideNoteId}
            height={keyboardSize.height}
            onNotePressIn={handleNotePress}
            width={keyboardSize.width}
          />
        ) : null}
      </View>

      <PianoTutorialModal
        onBackToSongList={backToSongList}
        onClose={closeTutorial}
        onSelectSong={selectSong}
        onStartWatch={startWatch}
        phase={phase}
        selectedSong={selectedSong}
        songs={songs}
        visible={isModalVisible && !isPortrait}
      />

      <PianoLandscapeOverlay visible={isPortrait} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background,
    flex: 1,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  backWrap: {
    minWidth: 72,
  },
  backButton: {
    color: colors.accent,
    fontSize: 15,
    fontWeight: '600',
  },
  pressed: {
    opacity: 0.7,
  },
  title: {
    color: colors.text,
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  tutorialButton: {
    backgroundColor: colors.surfaceLight,
    borderColor: colors.accent,
    borderRadius: 8,
    borderWidth: 1,
    maxWidth: 120,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  tutorialButtonText: {
    color: colors.accent,
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
  },
  keyboardArea: {
    flex: 1,
  },
  loading: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  loadingText: {
    color: colors.textSecondary,
    fontSize: 14,
    marginTop: 12,
    textAlign: 'center',
  },
});
