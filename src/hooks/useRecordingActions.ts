import { useCallback, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import type { SavedRecording } from '../types/recording';
import type { StudioProject } from '../types/studio';
import { EncodeCanceledError } from '../audio/pcmEncode';
import { UnrenderableRecordingError } from '../audio/recordingRender';
import { EmptyProjectError } from '../audio/studioProjectRender';
import {
  downloadProject,
  downloadRecording,
  shareProject,
  shareRecording,
  type DownloadResult,
  type ExportOptions,
} from '../utils/recordingExport';

export type ExportKind = 'share' | 'download';

/** What the progress sheet needs to draw itself, or `null` when nothing runs. */
export type ExportJob = {
  id: string;
  kind: ExportKind;
  /** 0..1. */
  progress: number;
};

/**
 * The result of an export, for the screen to show as a toast.
 *
 * Deliberately not `Alert.alert`: the system dialog is drawn by the OS in its
 * own light-grey chrome with a teal button, which lands in the middle of a
 * dark purple app looking like it came from a different decade. Saving a file
 * is also not a decision — it needs no OK button, just an acknowledgement that
 * gets out of the way on its own.
 */
export type ExportFeedback = {
  variant: 'success' | 'error';
  message: string;
  /** Second line — the file name on success. */
  detail?: string;
};

export function useRecordingActions() {
  const { t } = useTranslation();
  const [job, setJob] = useState<ExportJob | null>(null);
  const [feedback, setFeedback] = useState<ExportFeedback | null>(null);
  // Read from inside the encode loop, so it has to be a ref: a state update
  // would not reach the already-running promise.
  const canceledRef = useRef(false);
  // Mirrors `job` for the same reason. A second export starting mid-encode
  // would share this hook's single cancel flag and single progress slot: the
  // sheet would show one job's percentage while Cancel stopped both.
  const runningRef = useRef(false);

  const run = useCallback(
    async (
      id: string,
      kind: ExportKind,
      task: (options: ExportOptions) => Promise<DownloadResult | void>,
    ) => {
      if (runningRef.current) {
        return;
      }
      runningRef.current = true;
      canceledRef.current = false;
      setFeedback(null);
      setJob({ id, kind, progress: 0 });
      try {
        const result = await task({
          onProgress: (progress) =>
            setJob((current) => (current?.id === id ? { ...current, progress } : current)),
          shouldCancel: () => canceledRef.current,
          // The share sheet and the folder picker are native screens; the
          // progress sheet has to be gone before either is presented.
          onFilePrepared: () => setJob(null),
        });

        if (result && result.status === 'saved') {
          setFeedback({
            variant: 'success',
            message:
              result.location === 'folder'
                ? t('recordings.downloadSavedToFolder')
                : t('recordings.downloadSavedToDocuments'),
            detail: result.fileName,
          });
        }
      } catch (error) {
        if (error instanceof EncodeCanceledError) {
          return;
        }
        const fail = (message: string) => setFeedback({ variant: 'error', message });

        if (error instanceof EmptyProjectError) {
          fail(t('studio.exportEmpty'));
          return;
        }
        if (error instanceof UnrenderableRecordingError) {
          fail(t('recordings.exportEmpty'));
          return;
        }
        const code = error instanceof Error ? error.message : '';
        if (code === 'SHARING_UNAVAILABLE') {
          fail(t('recordings.shareUnavailable'));
          return;
        }
        fail(kind === 'share' ? t('recordings.shareError') : t('recordings.downloadError'));
      } finally {
        runningRef.current = false;
        setJob(null);
      }
    },
    [t],
  );

  const share = useCallback(
    (recording: SavedRecording) =>
      run(recording.id, 'share', (options) =>
        shareRecording(recording, t('recordings.shareTitle'), options),
      ),
    [run, t],
  );

  const download = useCallback(
    (recording: SavedRecording) =>
      run(recording.id, 'download', (options) => downloadRecording(recording, options)),
    [run],
  );

  const shareProjectMix = useCallback(
    (project: StudioProject) =>
      run(project.id, 'share', (options) =>
        shareProject(project, t('recordings.shareTitle'), options),
      ),
    [run, t],
  );

  const downloadProjectMix = useCallback(
    (project: StudioProject) =>
      run(project.id, 'download', (options) => downloadProject(project, options)),
    [run],
  );

  const cancel = useCallback(() => {
    canceledRef.current = true;
  }, []);

  const dismissFeedback = useCallback(() => setFeedback(null), []);

  return {
    busyId: job?.id ?? null,
    job,
    cancel,
    feedback,
    dismissFeedback,
    share,
    download,
    shareProjectMix,
    downloadProjectMix,
  };
}
