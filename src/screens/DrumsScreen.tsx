import { useCallback, useState } from 'react';
import { ActivityIndicator, LayoutChangeEvent, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DrumKit } from '../components/drums/DrumKit';
import { InstrumentHeader } from '../components/instrument/InstrumentHeader';
import { LandscapeOverlay } from '../components/instrument/LandscapeOverlay';
import { RecordingBanner } from '../components/instrument/RecordingBanner';
import { useDrumsEngine } from '../hooks/useDrumsEngine';
import { useInstrumentRecording } from '../hooks/useInstrumentRecording';
import { usePianoOrientation } from '../hooks/usePianoOrientation';
import type { DrumSoundId } from '../instruments/drums/drumsSounds';
import { colors } from '../theme/colors';
import type { InstrumentsStackParamList } from '../types/navigation';

type Props = NativeStackScreenProps<InstrumentsStackParamList, 'Drums'>;

export function DrumsScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { ready, error, playHit } = useDrumsEngine();
  const [stageSize, setStageSize] = useState({ width: 0, height: 0 });

  const { isRecording, mode, handleRecordPress, captureEvent } =
    useInstrumentRecording('drums');

  const { isPortrait } = usePianoOrientation(navigation);

  const handleLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setStageSize({ width, height });
  };

  const onHit = useCallback(
    (id: DrumSoundId) => {
      captureEvent(id);
      playHit(id);
    },
    [captureEvent, playHit],
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
        title={t('instruments.drums')}
      />

      <RecordingBanner isRecording={isRecording} mode={mode} />

      <View style={styles.stage} onLayout={handleLayout}>
        {!ready ? (
          <View style={styles.loading}>
            <ActivityIndicator color={colors.accent} size="large" />
            <Text style={styles.loadingText}>
              {error ? t('instruments.drumsLoadError') : t('instruments.drumsLoading')}
            </Text>
          </View>
        ) : stageSize.width > 0 && stageSize.height > 0 ? (
          <View style={styles.kitWrap}>
            <DrumKit height={stageSize.height} onHit={onHit} width={stageSize.width} />
          </View>
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
  kitWrap: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
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
