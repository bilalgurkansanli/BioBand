import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useState } from 'react';

import {
  createStudioProject,
  deleteStudioProject,
  loadStudioProjects,
  renameStudioProject,
} from '../storage/studioProjectsStorage';
import type { StudioProject } from '../types/studio';

export function useStudioProjects() {
  const [projects, setProjects] = useState<StudioProject[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setProjects(await loadStudioProjects());
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  const create = useCallback(
    async (title: string) => {
      const project = await createStudioProject(title);
      await refresh();
      return project;
    },
    [refresh],
  );

  const rename = useCallback(
    async (projectId: string, title: string) => {
      await renameStudioProject(projectId, title);
      await refresh();
    },
    [refresh],
  );

  const remove = useCallback(
    async (projectId: string) => {
      await deleteStudioProject(projectId);
      await refresh();
    },
    [refresh],
  );

  return { projects, loading, refresh, create, rename, remove };
}
