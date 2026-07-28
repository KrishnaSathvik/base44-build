import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { listMyProjects } from '@/lib/api';
import {
  readStoredActiveProjectId,
  resolveActiveProjectId,
  writeStoredActiveProjectId,
} from '@/lib/activeProject';
import type { Project } from '@/lib/types';

export function useActiveProject(options?: { enabled?: boolean }) {
  const enabled = options?.enabled ?? true;
  const projectsQuery = useQuery({
    queryKey: ['projects'],
    queryFn: listMyProjects,
    enabled,
  });
  const [preferredId, setPreferredId] = useState<string | null>(() => readStoredActiveProjectId());

  const activeId = useMemo(
    () => resolveActiveProjectId(projectsQuery.data ?? [], preferredId),
    [preferredId, projectsQuery.data],
  );

  const project = useMemo(
    () => (projectsQuery.data ?? []).find((item) => item.id === activeId) as Project | undefined,
    [activeId, projectsQuery.data],
  );

  useEffect(() => {
    if (!activeId || preferredId === activeId) return;
    setPreferredId(activeId);
    writeStoredActiveProjectId(activeId);
  }, [activeId, preferredId]);

  function setActiveProjectId(projectId: string) {
    setPreferredId(projectId);
    writeStoredActiveProjectId(projectId);
  }

  return {
    projects: projectsQuery.data ?? [],
    projectsQuery,
    project,
    activeProjectId: activeId,
    setActiveProjectId,
    isLoading: projectsQuery.isLoading,
  };
}
