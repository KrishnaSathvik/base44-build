import { ChevronDown } from 'lucide-react';
import { cn } from '@/components/ui';
import type { Project } from '@/lib/types';

interface Props {
  projects: Project[];
  project?: Project;
  onChange: (projectId: string) => void;
  className?: string;
}

/** Compact project switcher for the owner sidebar. */
export function ProjectSwitcher({ projects, project, onChange, className }: Props) {
  if (!project) return null;

  if (projects.length <= 1) {
    return (
      <div className={cn('px-3 py-2', className)}>
        <p className="truncate text-sm font-medium text-ink">{project.name}</p>
        <p className="fi-mono mt-0.5 text-[9px] uppercase tracking-wider text-ink-faint">
          Active board
        </p>
      </div>
    );
  }

  return (
    <div className={cn('relative px-2', className)}>
      <label className="block">
        <span className="sr-only">Active project</span>
        <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-ink-faint">
          <ChevronDown className="h-4 w-4" aria-hidden />
        </span>
        <select
          aria-label="Active project"
          value={project.id}
          onChange={(event) => onChange(event.target.value)}
          className="h-11 w-full appearance-none truncate rounded-md border border-line bg-canvas py-2 pl-3 pr-9 text-sm font-medium text-ink outline-none transition-colors hover:border-ink/30 focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
        >
          {projects.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
      </label>
      <p className="fi-mono mt-1.5 px-1 text-[9px] uppercase tracking-wider text-ink-faint">
        Active board
      </p>
    </div>
  );
}
