import { Navigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { listMyProjects } from '@/lib/api';
import { useCurrentUser } from '@/lib/useCurrentUser';
import { Spinner } from '@/components/ui';

/** `/app` entry: auth is handled by AppLayout; then board presence decides setup vs overview. */
export function AppIndexRedirect() {
  const { user, isLoading: userLoading } = useCurrentUser();
  const projects = useQuery({
    queryKey: ['projects'],
    queryFn: listMyProjects,
    enabled: !!user,
  });

  if (userLoading || (user && projects.isLoading)) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (!user) return null;
  if (!projects.data?.length) return <Navigate to="/app/setup" replace />;
  return <Navigate to="/app/overview" replace />;
}
