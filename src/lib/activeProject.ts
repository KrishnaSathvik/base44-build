const STORAGE_KEY = 'vensaos.activeProjectId';

export function readStoredActiveProjectId(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

export function writeStoredActiveProjectId(projectId: string): void {
  try {
    localStorage.setItem(STORAGE_KEY, projectId);
  } catch {
    // Ignore quota / private-mode failures; in-memory selection still works.
  }
}

export function clearStoredActiveProjectId(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore private-mode failures.
  }
}

export function resolveActiveProjectId<T extends { id: string }>(
  projects: T[],
  preferredId: string | null,
): string | undefined {
  if (!projects.length) return undefined;
  if (preferredId && projects.some((project) => project.id === preferredId)) {
    return preferredId;
  }
  return projects[0]?.id;
}
