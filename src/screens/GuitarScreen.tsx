import { useCallback } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Fretboard } from '../components/guitar/Fretboard';
import { InstrumentHeader } from '../components/instrument/InstrumentHeader';
import { LandscapeOverlay } from '../components/instrument/LandscapeOverlay';
import { RecordingBanner } from '../components/instrument/RecordingBanner';
import { useGuitarEngine } from '../hooks/useGuitarEngine';
import { useInstrumentRecording } from '../hooks/useInstrumentRecording';
import { usePianoOrientation } from '../hooks/usePianoOrientation';
import type { ChordId } from '../instruments/guitar/guitarChords';
import type { GuitarStringId } from '../instruments/guitar/guitarSounds';
import { colors } from '../theme/colors';
import type { InstrumentsStackParamList } from '../types/navigation';

type Props = NativeStackScreenProps<InstrumentsStackParamList, 'Guitar'>;

export function GuitarScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { ready, error, pluckString, strumChord } = useGuitarEngine();

  const { isRecording, mode, handleRecordPress, captureEvent } =
    useInstrumentRecording('guitar');

  const { isPortrait } = usePianoOrientation(navigation);

  const onPluck = useCallback(
    (stringId: GuitarStringId) => {
      captureEvent(stringId);
      pluckString(stringId);
    },
    [captureEvent, pluckString],
  );

  const onStrum = useCallback(
    (chordId: ChordId) => {
      captureEvent(`chord:${chordId}`);
      strumChord(chordId);
    },
    [captureEvent, strumChord],
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
        title={t('instruments.guitar')}
      />

      <RecordingBanner isRecording={isRecording} mode={mode} />

      {!ready ? (
        <View style={styles.loading}>
          <ActivityIndicator color={colors.accent} size="large" />
          <Text style={styles.loadingText}>
            {error ? t('instruments.guitarLoadError') : t('instruments.guitarLoading')}
          </Text>
        </View>
      ) : (
        <Fretboard onPluck={onPluck} onStrum={onStrum} />
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
