import { Skeleton } from '@/components/ui';
export function PublicRouteSkeleton() { return <main className="mx-auto max-w-3xl px-4 py-16"><Skeleton className="h-4 w-32"/><Skeleton className="mt-5 h-12 w-3/4"/><Skeleton className="mt-10 h-64"/></main>; }
export function OwnerRouteSkeleton() { return <main className="min-h-screen bg-canvas pt-16 md:pl-[228px]"><div className="mx-auto max-w-[1180px] px-4 py-10"><Skeleton className="h-10 w-64"/><div className="mt-8 space-y-3"><Skeleton className="h-24"/><Skeleton className="h-24"/><Skeleton className="h-24"/></div></div></main>; }
