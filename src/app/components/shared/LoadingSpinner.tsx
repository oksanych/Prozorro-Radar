export default function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center py-12">
      <div className="w-8 h-8 border-2 border-slate-600 border-t-blue-400 rounded-full animate-spin" />
    </div>
  );
}

export function SkeletonCard() {
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-lg p-4 animate-pulse space-y-3">
      <div className="flex items-center justify-between">
        <div className="h-4 bg-slate-700 rounded w-1/3" />
        <div className="h-6 bg-slate-700 rounded w-20" />
      </div>
      <div className="h-5 bg-slate-700 rounded w-3/4" />
      <div className="flex gap-3">
        <div className="h-3 bg-slate-700 rounded w-24" />
        <div className="h-3 bg-slate-700 rounded w-32" />
        <div className="h-3 bg-slate-700 rounded w-20" />
      </div>
      <div className="flex gap-2">
        <div className="h-5 bg-slate-700 rounded w-28" />
        <div className="h-5 bg-slate-700 rounded w-24" />
      </div>
    </div>
  );
}

export function SkeletonStatCard() {
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-lg p-5 animate-pulse space-y-2">
      <div className="h-3 bg-slate-700 rounded w-24" />
      <div className="h-8 bg-slate-700 rounded w-16" />
      <div className="h-3 bg-slate-700 rounded w-32" />
    </div>
  );
}

export function SkeletonFeed() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}
