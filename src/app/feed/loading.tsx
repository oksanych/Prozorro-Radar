import { SkeletonFeed } from '../components/shared/LoadingSpinner';

export default function FeedLoading() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="h-7 bg-slate-700 rounded w-28 animate-pulse" />
        <div className="h-8 bg-slate-700 rounded w-24 animate-pulse" />
      </div>
      <div className="bg-slate-800 border border-slate-700 rounded-lg p-4 animate-pulse">
        <div className="flex flex-wrap gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-9 bg-slate-700 rounded w-32" />
          ))}
        </div>
      </div>
      <div className="h-4 bg-slate-700 rounded w-48 animate-pulse" />
      <SkeletonFeed />
    </div>
  );
}
