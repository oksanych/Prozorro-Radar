export default function TenderDetailLoading() {
  return (
    <div className="space-y-5 animate-pulse">
      <div className="h-4 bg-slate-700 rounded w-24" />
      <div className="bg-slate-800 border border-slate-700 rounded-lg p-5 space-y-3">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2 flex-1">
            <div className="h-3 bg-slate-700 rounded w-32" />
            <div className="h-6 bg-slate-700 rounded w-3/4" />
          </div>
          <div className="h-8 bg-slate-700 rounded w-24 shrink-0" />
        </div>
        <div className="flex gap-4">
          <div className="h-4 bg-slate-700 rounded w-28" />
          <div className="h-4 bg-slate-700 rounded w-36" />
          <div className="h-4 bg-slate-700 rounded w-24" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-slate-800 border border-slate-700 rounded-lg p-4 space-y-2">
            <div className="h-3 bg-slate-700 rounded w-20" />
            <div className="h-5 bg-slate-700 rounded w-32" />
          </div>
        ))}
      </div>
      <div className="space-y-3">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="bg-slate-800 border border-slate-700 rounded-lg p-4 space-y-3">
            <div className="h-5 bg-slate-700 rounded w-40" />
            <div className="h-12 bg-slate-700 rounded w-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
