import { useCallback, useState } from 'react';
import { ActivityIndicator, LayoutChangeEvent, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { InstrumentHeader } from '../components/instrument/InstrumentHeader';
import { LandscapeOverlay } from '../components/instrument/LandscapeOverlay';
import { RecordingBanner } from '../components/instrument/RecordingBanner';
import { PadGrid } from '../components/pads/PadGrid';
import { useInstrumentRecording } from '../hooks/useInstrumentRecording';
import { usePadsEngine } from '../hooks/usePadsEngine';
import { usePianoOrientation } from '../hooks/usePianoOrientation';
import type { PadSoundId } from '../instruments/pads/padsSounds';
import { colors } from '../theme/colors';
import type { InstrumentsStackParamList } from '../types/navigation';

type Props = NativeStackScreenProps<InstrumentsStackParamList, 'Pads'>;

export function PadsScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { ready, error, triggerPad } = usePadsEngine();
  const [stageSize, setStageSize] = useState({ width: 0, height: 0 });

  const { isRecording, mode, handleRecordPress, captureEvent } =
    useInstrumentRecording('pads');

  const { isPortrait } = usePianoOrientation(navigation);

  const handleLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setStageSize({ width, height });
  };

  const onTrigger = useCallback(
    (id: PadSoundId) => {
      captureEvent(id);
      triggerPad(id);
    },
    [captureEvent, triggerPad],
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
        title={t('instruments.pads')}
      />

      <RecordingBanner isRecording={isRecording} mode={mode} />

      <View style={styles.stage} onLayout={handleLayout}>
        {!ready ? (
          <View style={styles.loading}>
            <ActivityIndicator color={colors.accent} size="large" />
            <Text style={styles.loadingText}>
              {error ? t('instruments.padsLoadError') : t('instruments.padsLoading')}
            </Text>
          </View>
        ) : stageSize.width > 0 && stageSize.height > 0 ? (
          <PadGrid height={stageSize.height} onTrigger={onTrigger} width={stageSize.width} />
        ) : null}
      </View>

      <LandscapeOverlay visible={isPortrait} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background,
    flex: 1,
  },
  stage: {
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
