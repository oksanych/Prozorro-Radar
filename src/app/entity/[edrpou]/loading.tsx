import { SkeletonFeed } from '../../components/shared/LoadingSpinner';

export default function EntityLoading() {
  return (
    <div className="space-y-5 animate-pulse">
      <div className="h-4 bg-slate-700 rounded w-24" />
      <div className="bg-slate-800 border border-slate-700 rounded-lg p-5 space-y-3">
        <div className="h-3 bg-slate-700 rounded w-16" />
        <div className="h-7 bg-slate-700 rounded w-1/2" />
        <div className="h-3 bg-slate-700 rounded w-24" />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-slate-800 border border-slate-700 rounded-lg p-4 space-y-2">
            <div className="h-3 bg-slate-700 rounded w-20" />
            <div className="h-6 bg-slate-700 rounded w-12" />
          </div>
        ))}
      </div>
      <SkeletonFeed />
    </div>
  );
}
