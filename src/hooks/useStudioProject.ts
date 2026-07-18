import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useState } from 'react';

import {
  addTrackFromTake,
  getStudioProject,
  removeStudioTrack,
  renameStudioProject,
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
      patch: Partial<Pick<StudioTrack, 'muted' | 'solo' | 'volume'>>,
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

  return {
    project,
    loading,
    refresh,
    rename,
    importTake,
    patchTrack,
    deleteTrack,
  };
}
