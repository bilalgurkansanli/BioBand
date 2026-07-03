import { useCallback } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { InstrumentHeader } from '../components/instrument/InstrumentHeader';
import { LandscapeOverlay } from '../components/instrument/LandscapeOverlay';
import { RecordingBanner } from '../components/instrument/RecordingBanner';
import { ViolinFingerboard } from '../components/violin/ViolinFingerboard';
import { useInstrumentRecording } from '../hooks/useInstrumentRecording';
import { usePianoOrientation } from '../hooks/usePianoOrientation';
import { useViolinEngine } from '../hooks/useViolinEngine';
import type { PhraseId } from '../instruments/violin/violinPhrases';
import type { ViolinStringId } from '../instruments/violin/violinSounds';
import { colors } from '../theme/colors';
import type { InstrumentsStackParamList } from '../types/navigation';

type Props = NativeStackScreenProps<InstrumentsStackParamList, 'Violin'>;

export function ViolinScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { ready, error, playNote, playPhrase } = useViolinEngine();

  const { isRecording, mode, handleRecordPress, captureEvent } =
    useInstrumentRecording('violin');

  const { isPortrait } = usePianoOrientation(navigation);

  const onPlayNote = useCallback(
    (stringId: ViolinStringId, position: number) => {
      captureEvent(`${stringId}:${position}`);
      playNote(stringId, position);
    },
    [captureEvent, playNote],
  );

  const onPlayPhrase = useCallback(
    (phraseId: PhraseId) => {
      captureEvent(`phrase:${phraseId}`);
      playPhrase(phraseId);
    },
    [captureEvent, playPhrase],
  );

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
      <InstrumentHeader
        isRecording={isRecording}
        onBack={() => navigation.goBack()}
        onRecordPress={handleRecordPress}
        title={t('instruments.violin')}
      />

      <RecordingBanner isRecording={isRecording} mode={mode} />

      {!ready ? (
        <View style={styles.loading}>
          <ActivityIndicator color={colors.accent} size="large" />
          <Text style={styles.loadingText}>
            {error ? t('instruments.violinLoadError') : t('instruments.violinLoading')}
          </Text>
        </View>
      ) : (
        <ViolinFingerboard onPlayNote={onPlayNote} onPlayPhrase={onPlayPhrase} />
      )}

      <LandscapeOverlay visible={isPortrait} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background,
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
