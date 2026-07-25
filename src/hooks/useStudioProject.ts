import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useEffect, useRef, useState } from 'react';

import {
  addTrackFromTake,
  duplicateStudioTrack,
  getStudioProject,
  removeStudioTrack,
  renameStudioProject,
  updateStudioProjectBpm,
  updateStudioTrack,
} from '../storage/studioProjectsStorage';
import type { SavedRecording } from '../types/recording';
import type { StudioProject, StudioTrack } from '../types/studio';

export function useStudioProject(projectId: string) {
  const [project, setProject] = useState<StudioProject | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setProject(await getStudioProject(projectId));
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  const rename = useCallback(
    async (title: string) => {
      const next = await renameStudioProject(projectId, title);
      if (next) {
        setProject(next);
      }
    },
    [projectId],
  );

  const importTake = useCallback(
    async (take: SavedRecording) => {
      const next = await addTrackFromTake(projectId, take);
      if (next) {
        setProject(next);
      }
      return next;
    },
    [projectId],
  );

  const patchTrack = useCallback(
    async (
      trackId: string,
      patch: Partial<
        Pick<
          StudioTrack,
          | 'muted'
          | 'solo'
          | 'volume'
          | 'startMs'
          | 'drumKitId'
          | 'guitarVoiceId'
          | 'violinVoiceId'
          | 'padBankId'
          | 'pianoVoiceId'
        >
      >,
    ) => {
      const next = await updateStudioTrack(projectId, trackId, patch);
      if (next) {
        setProject(next);
      }
    },
    [projectId],
  );

  const deleteTrack = useCallback(
    async (trackId: string) => {
      const next = await removeStudioTrack(projectId, trackId);
      if (next) {
        setProject(next);
      }
    },
    [projectId],
  );

  const duplicate = useCallback(
    async (trackId: string) => {
      const next = await duplicateStudioTrack(projectId, trackId);
      if (next) {
        setProject(next);
      }
    },
    [projectId],
  );

  // Holding the +/- BPM buttons fires rapidly, so the UI updates optimistically
  // and the storage write is debounced (and flushed on unmount).
  const bpmTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingBpmRef = useRef<number | null>(null);

  const flushBpm = useCallback(() => {
    if (bpmTimerRef.current) {
      clearTimeout(bpmTimerRef.current);
      bpmTimerRef.current = null;
    }
    const pending = pendingBpmRef.current;
    pendingBpmRef.current = null;
    if (pending !== null) {
      void updateStudioProjectBpm(projectId, pending);
    }
  }, [projectId]);

  useEffect(() => {
    return () => flushBpm();
  }, [flushBpm]);

  const setBpm = useCallback(
    (bpm: number) => {
      setProject((prev) => (prev ? { ...prev, bpm } : prev));
      pendingBpmRef.current = bpm;
      if (bpmTimerRef.current) {
        clearTimeout(bpmTimerRef.current);
      }
      bpmTimerRef.current = setTimeout(flushBpm, 300);
    },
    [flushBpm],
  );

  return {
    project,
    loading,
    refresh,
    rename,
    importTake,
    patchTrack,
    deleteTrack,
    duplicate,
    setBpm,
  };
}
