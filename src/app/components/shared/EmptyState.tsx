import Link from 'next/link';

interface EmptyStateProps {
  icon?: string;
  title: string;
  description?: string;
  actionLabel?: string;
  actionHref?: string;
}

export default function EmptyState({ icon = '🔍', title, description, actionLabel, actionHref }: EmptyStateProps) {
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-lg p-12 text-center">
      <div className="text-4xl mb-3">{icon}</div>
      <div className="text-slate-300 font-medium mb-1">{title}</div>
      {description && <div className="text-sm text-slate-500 mb-4">{description}</div>}
      {actionLabel && actionHref && (
        <Link
          href={actionHref}
          className="inline-flex items-center gap-1 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded transition-colors"
        >
          {actionLabel}
        </Link>
      )}
    </div>
  );
}
