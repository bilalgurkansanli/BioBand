import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, LayoutChangeEvent, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { LandscapeOverlay } from '../components/instrument/LandscapeOverlay';
import { RecordingBanner } from '../components/instrument/RecordingBanner';
import { PianoKeyboard } from '../components/piano/PianoKeyboard';
import { PianoNavigator } from '../components/piano/PianoNavigator';
import { PianoToolbar } from '../components/piano/PianoToolbar';
import { PianoTutorialModal } from '../components/piano/PianoTutorialModal';
import { TutorialBanner } from '../components/piano/TutorialBanner';
import { usePianoTone } from '../hooks/usePianoTone';
import { usePianoEngine } from '../hooks/usePianoEngine';
import { usePianoOrientation } from '../hooks/usePianoOrientation';
import { useInstrumentRecording } from '../hooks/useInstrumentRecording';
import { usePianoTutorial } from '../hooks/usePianoTutorial';
import type { NoteId } from '../instruments/piano/pianoNotes';
import { colors } from '../theme/colors';
import type { InstrumentsStackParamList } from '../types/navigation';

type Props = NativeStackScreenProps<InstrumentsStackParamList, 'Piano'>;

export function PianoScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const tone = usePianoTone();
  const { ready, error, playNote } = usePianoEngine(tone.semitoneOffset);
  const [keyboardSize, setKeyboardSize] = useState({ width: 0, height: 0 });
  const [metronomeOn, setMetronomeOn] = useState(false);
  const [sustainOn, setSustainOn] = useState(false);

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

  const { isRecording, mode, handleRecordPress, captureEvent } =
    useInstrumentRecording('piano');

  const { isPortrait } = usePianoOrientation(navigation);

  const handleKeyboardLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setKeyboardSize({ width, height });
  };

  const onNotePress = useCallback(
    (noteId: NoteId) => {
      captureEvent(noteId);
      handleNotePress(noteId);
    },
    [captureEvent, handleNotePress],
  );

  const showComingSoon = useCallback(
    (featureKey: string) => {
      Alert.alert(t('piano.comingSoonTitle'), t(featureKey));
    },
    [t],
  );

  const handleMenuPress = useCallback(() => {
    Alert.alert(t('piano.toolbar.menu'), undefined, [
      { text: t('tutorial.start'), onPress: openTutorial },
      { text: t('common.cancel'), style: 'cancel' },
    ]);
  }, [openTutorial, t]);

  const handleGamePress = useCallback(() => {
    showComingSoon('piano.game.comingSoon');
  }, [showComingSoon]);

  const isModalVisible = phase === 'pickSong' || phase === 'readyToWatch';

  return (
    <View
      pointerEvents={isPortrait ? 'none' : 'auto'}
      style={[
        styles.container,
        {
          paddingLeft: insets.left,
          paddingRight: insets.right,
          paddingTop: insets.top,
          paddingBottom: insets.bottom,
        },
      ]}
    >
      <PianoToolbar
        isRecording={isRecording}
        metronomeOn={metronomeOn}
        onBack={() => navigation.goBack()}
        onDualKeyboardPress={() => showComingSoon('piano.toolbar.dualKeyboardComingSoon')}
        onFxPress={() => showComingSoon('piano.toolbar.fxComingSoon')}
        onGamePress={handleGamePress}
        onInstrumentPress={() => showComingSoon('piano.toolbar.instrumentComingSoon')}
        onLayoutPress={() => showComingSoon('piano.toolbar.layoutComingSoon')}
        onMenuPress={handleMenuPress}
        onMetronomePress={() => setMetronomeOn((current) => !current)}
        onRecordPress={handleRecordPress}
        onSustainPress={() => setSustainOn((current) => !current)}
        sustainOn={sustainOn}
      />

      <PianoNavigator
        canStepThicker={tone.canStepThicker}
        canStepThinner={tone.canStepThinner}
        onJumpCenter={tone.jumpCenter}
        onJumpHigh={tone.jumpHigh}
        onJumpLow={tone.jumpLow}
        onStepThicker={tone.stepThicker}
        onStepThinner={tone.stepThinner}
        onToneChange={tone.setTonePosition}
        semitoneOffset={tone.semitoneOffset}
        tonePosition={tone.tonePosition}
      />

      <RecordingBanner isRecording={isRecording} mode={mode} />

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
            onNotePressIn={onNotePress}
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

      <LandscapeOverlay
        hintKey="instruments.pianoLandscapeHint"
        titleKey="instruments.pianoLandscapeRequired"
        visible={isPortrait}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background,
    flex: 1,
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
