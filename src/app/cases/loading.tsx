export default function CasesLoading() {
  return (
    <div className="space-y-5 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="h-7 bg-slate-700 rounded w-24" />
        <div className="h-9 bg-slate-700 rounded w-28" />
      </div>
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="bg-slate-800 border border-slate-700 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="h-5 bg-slate-700 rounded w-48" />
              <div className="h-4 bg-slate-700 rounded w-16" />
            </div>
            <div className="flex gap-3">
              <div className="h-3 bg-slate-700 rounded w-24" />
              <div className="h-3 bg-slate-700 rounded w-20" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
