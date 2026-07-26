import { useCallback, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import {
  BackupTooLargeError,
  BackupUnreadableError,
  exportLibrary,
  exportLibraryAsAudio,
  NoFolderPickedError,
  restoreLibrary,
} from '../utils/libraryBackup';
import { pickBackupDocument } from '../utils/documentPicker';
import { shareFile } from '../utils/shareFile';
import { recordFeatureUse } from '../storage/profileProgressStorage';

export type BackupJob = {
  kind: 'export' | 'audio' | 'restore';
  /** 0..1. */
  progress: number;
};

export type BackupFeedback = {
  variant: 'success' | 'error';
  message: string;
  detail?: string;
};

function megabytes(bytes: number): string {
  return (bytes / (1024 * 1024)).toFixed(1);
}

export function useLibraryBackup(onRestored?: () => void) {
  const { t } = useTranslation();
  const [job, setJob] = useState<BackupJob | null>(null);
  const [feedback, setFeedback] = useState<BackupFeedback | null>(null);
  // Both operations rewrite the same library; letting them overlap would mean
  // a restore merging into a list an export is halfway through reading.
  const runningRef = useRef(false);

  const dismissFeedback = useCallback(() => setFeedback(null), []);

  const backup = useCallback(async () => {
    if (runningRef.current) {
      return;
    }
    runningRef.current = true;
    setFeedback(null);
    setJob({ kind: 'export', progress: 0 });
    try {
      const result = await exportLibrary((progress) =>
        setJob({ kind: 'export', progress }),
      );
      // The sheet has to be gone before a native share screen is presented.
      setJob(null);
      void recordFeatureUse('backupExported');
      await shareFile(result.uri, 'application/json', t('backup.shareTitle'));
      setFeedback({
        variant: 'success',
        message: t('backup.exportDone', { count: result.recordingCount }),
        detail: `${result.fileName} · ${megabytes(result.bytes)} MB`,
      });
    } catch (error) {
      if (error instanceof BackupTooLargeError) {
        setFeedback({
          variant: 'error',
          message: t('backup.tooLarge', { size: megabytes(error.totalBytes) }),
        });
      } else {
        setFeedback({ variant: 'error', message: t('backup.exportFailed') });
      }
    } finally {
      runningRef.current = false;
      setJob(null);
    }
  }, [t]);

  const exportAudio = useCallback(async () => {
    if (runningRef.current) {
      return;
    }
    runningRef.current = true;
    setFeedback(null);
    setJob({ kind: 'audio', progress: 0 });
    try {
      const result = await exportLibraryAsAudio((progress) =>
        setJob({ kind: 'audio', progress }),
      );
      setFeedback({
        variant: 'success',
        message: t('backup.audioDone', { count: result.written }),
        detail: result.skipped > 0 ? t('backup.audioSkipped', { count: result.skipped }) : undefined,
      });
    } catch (error) {
      // Backing out of the folder picker is a decision, not a failure.
      if (error instanceof NoFolderPickedError) {
        return;
      }
      setFeedback({ variant: 'error', message: t('backup.audioFailed') });
    } finally {
      runningRef.current = false;
      setJob(null);
    }
  }, [t]);

  const restore = useCallback(async () => {
    if (runningRef.current) {
      return;
    }
    // Picked before the busy flag goes up: the picker is a native screen and
    // the user may well cancel it.
    const picked = await pickBackupDocument();
    if (!picked.ok) {
      if (picked.code === 'pickerUnavailable') {
        setFeedback({ variant: 'error', message: t('backup.pickerUnavailable') });
      }
      return;
    }

    runningRef.current = true;
    setFeedback(null);
    setJob({ kind: 'restore', progress: 0 });
    try {
      const result = await restoreLibrary(picked.asset.uri, (progress) =>
        setJob({ kind: 'restore', progress }),
      );
      onRestored?.();
      setFeedback({
        variant: 'success',
        message: t('backup.restoreDone', { count: result.restored }),
        detail: result.skipped > 0 ? t('backup.restoreSkipped', { count: result.skipped }) : undefined,
      });
    } catch (error) {
      setFeedback({
        variant: 'error',
        message:
          error instanceof BackupUnreadableError
            ? t('backup.unreadable')
            : t('backup.restoreFailed'),
      });
    } finally {
      runningRef.current = false;
      setJob(null);
    }
  }, [onRestored, t]);

  return { job, feedback, dismissFeedback, backup, exportAudio, restore };
}
