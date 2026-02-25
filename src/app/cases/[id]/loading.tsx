export default function CaseDetailLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-4 bg-slate-700 rounded w-20" />
      <div className="space-y-2">
        <div className="h-7 bg-slate-700 rounded w-56" />
        <div className="h-3 bg-slate-700 rounded w-40" />
      </div>
      <div className="bg-slate-800 border border-slate-700 rounded-lg p-4 space-y-2">
        <div className="h-3 bg-slate-700 rounded w-16" />
        <div className="h-16 bg-slate-700 rounded w-full" />
      </div>
      <div className="space-y-2">
        <div className="h-3 bg-slate-700 rounded w-20" />
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="bg-slate-800 border border-slate-700 rounded-lg p-3 flex items-center justify-between">
            <div className="space-y-1">
              <div className="h-4 bg-slate-700 rounded w-48" />
              <div className="h-3 bg-slate-700 rounded w-32" />
            </div>
            <div className="h-5 bg-slate-700 rounded w-16" />
          </div>
        ))}
      </div>
    </div>
  );
}
