import { useCallback, useRef, useState } from 'react';
import { Platform } from 'react-native';
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

/**
 * How long to wait for the progress modal to report that it is gone before
 * presenting anyway.
 *
 * A safety net, not the mechanism: the modal normally answers in about the
 * length of its dismissal animation. It exists because the alternative to
 * giving up is an export that waits forever, and a share button that never
 * comes back is a worse bug than a share sheet presented a moment too early.
 */
const DISMISS_TIMEOUT_MS = 1_000;

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
  // Resolves the promise `closeProgressSheet` handed out, once the modal says
  // it has actually gone. Held in a ref because the modal reports back through
  // a prop callback, long after the export promise started waiting.
  const dismissedRef = useRef<(() => void) | null>(null);

  /** Called by the progress modal once iOS has finished dismissing it. */
  const onProgressDismissed = useCallback(() => {
    const resolve = dismissedRef.current;
    dismissedRef.current = null;
    resolve?.();
  }, []);

  /**
   * Takes the progress modal down, and waits for it to be gone when something
   * native is about to be presented in its place.
   *
   * Only an iOS share waits. Android draws the modal as a dialog and starts
   * the share intent through the activity, which does not care what is on
   * screen — and `onDismiss` is iOS-only, so waiting there would always sit
   * out the timeout. An iOS download presents nothing at all: it writes into
   * the app's Documents folder, so making it wait would only make a working
   * button feel slow.
   */
  const closeProgressSheet = useCallback((kind: ExportKind) => {
    if (Platform.OS !== 'ios' || kind !== 'share') {
      setJob(null);
      return Promise.resolve();
    }

    return new Promise<void>((resolve) => {
      let settled = false;
      let timer: ReturnType<typeof setTimeout> | undefined;
      const finish = () => {
        if (settled) {
          return;
        }
        settled = true;
        clearTimeout(timer);
        dismissedRef.current = null;
        resolve();
      };
      // Set before the state update, so a dismissal that reports back
      // immediately still finds someone waiting for it.
      dismissedRef.current = finish;
      timer = setTimeout(finish, DISMISS_TIMEOUT_MS);
      setJob(null);
    });
  }, []);

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
          //
          // The in-flight guard is released here rather than in `finally`,
          // because from this point it protects nothing: the encode is over,
          // and its job was to stop two encodes sharing one cancel flag and
          // one progress slot. Holding it until the promise settles means a
          // native sheet that never resolves — which is exactly what the iOS
          // folder picker did — leaves every export button in the app dead
          // until it is restarted, share and Studio included.
          //
          // Awaited: the modal is a native view controller, and iOS silently
          // drops a share sheet presented while one is still dismissing.
          onFilePrepared: () => {
            runningRef.current = false;
            return closeProgressSheet(kind);
          },
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
    [closeProgressSheet, t],
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
    onProgressDismissed,
    share,
    download,
    shareProjectMix,
    downloadProjectMix,
  };
}
