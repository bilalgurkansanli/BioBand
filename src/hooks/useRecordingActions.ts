import { useCallback, useState } from 'react';
import { Alert } from 'react-native';
import { useTranslation } from 'react-i18next';

import type { SavedRecording } from '../types/recording';
import {
  downloadRecording,
  downloadRecordingAsAudio,
  shareRecording,
  shareRecordingAsAudio,
  UnsupportedExportFormatError,
  type AudioExportFormat,
} from '../utils/recordingExport';

export type ExportFormatChoice = 'original' | AudioExportFormat;

export function useRecordingActions() {
  const { t } = useTranslation();
  const [busyId, setBusyId] = useState<string | null>(null);

  const share = useCallback(
    async (recording: SavedRecording, format: ExportFormatChoice = 'original') => {
      setBusyId(recording.id);
      try {
        if (format === 'original') {
          await shareRecording(recording, t('recordings.shareTitle'));
        } else {
          await shareRecordingAsAudio(recording, format, t('recordings.shareTitle'));
        }
      } catch (error) {
        if (error instanceof UnsupportedExportFormatError) {
          Alert.alert(t('recordings.exportUnsupported'));
          return;
        }
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
    async (recording: SavedRecording, format: ExportFormatChoice = 'original') => {
      setBusyId(recording.id);
      try {
        const result =
          format === 'original'
            ? await downloadRecording(recording)
            : await downloadRecordingAsAudio(recording, format);
        if (result.destination === 'share') {
          return;
        }
        Alert.alert(
          t('recordings.downloadSuccessTitle'),
          t('recordings.downloadSuccessDocuments', { fileName: result.fileName }),
        );
      } catch (error) {
        if (error instanceof UnsupportedExportFormatError) {
          Alert.alert(t('recordings.exportUnsupported'));
          return;
        }
        Alert.alert(t('recordings.downloadError'));
      } finally {
        setBusyId(null);
      }
    },
    [t],
  );

  return { busyId, share, download };
}
