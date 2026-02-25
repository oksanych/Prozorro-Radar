import { SkeletonStatCard } from './components/shared/LoadingSpinner';

export default function DashboardLoading() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonStatCard key={i} />
        ))}
      </div>
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="bg-slate-800 border border-slate-700 rounded-lg p-4 animate-pulse space-y-3">
            <div className="flex items-center justify-between">
              <div className="h-4 bg-slate-700 rounded w-1/3" />
              <div className="h-6 bg-slate-700 rounded w-20" />
            </div>
            <div className="h-5 bg-slate-700 rounded w-3/4" />
          </div>
        ))}
      </div>
    </div>
  );
}
