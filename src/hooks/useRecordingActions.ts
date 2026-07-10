import { useCallback, useState } from 'react';
import { Alert } from 'react-native';
import { useTranslation } from 'react-i18next';

import type { SavedRecording } from '../types/recording';
import { downloadRecording, shareRecording } from '../utils/recordingExport';

export function useRecordingActions() {
  const { t } = useTranslation();
  const [busyId, setBusyId] = useState<string | null>(null);

  const share = useCallback(
    async (recording: SavedRecording) => {
      setBusyId(recording.id);
      try {
        await shareRecording(recording, t('recordings.shareTitle'));
      } catch (error) {
        const code = error instanceof Error ? error.message : '';
        if (code === 'SHARING_UNAVAILABLE') {
          Alert.alert(t('recordings.shareUnavailable'));
        } else {
          Alert.alert(t('recordings.shareError'));
        }
      } finally {
        setBusyId(null);
      }
    },
    [t],
  );

  const download = useCallback(
    async (recording: SavedRecording) => {
      setBusyId(recording.id);
      try {
        const result = await downloadRecording(recording);
        if (result.destination === 'share') {
          return;
        }
        Alert.alert(
          t('recordings.downloadSuccessTitle'),
          t('recordings.downloadSuccessDocuments', { fileName: result.fileName }),
        );
      } catch {
        Alert.alert(t('recordings.downloadError'));
      } finally {
        setBusyId(null);
      }
    },
    [t],
  );

  return { busyId, share, download };
}
