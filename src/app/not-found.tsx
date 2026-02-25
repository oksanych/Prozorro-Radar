import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] text-center space-y-4">
      <div className="text-5xl font-bold text-slate-700">404</div>
      <h2 className="text-xl font-bold text-slate-100">Page not found</h2>
      <p className="text-sm text-slate-400 max-w-sm">
        The page you&apos;re looking for doesn&apos;t exist or has been moved.
      </p>
      <Link
        href="/"
        className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded transition-colors"
      >
        Go to Dashboard
      </Link>
    </div>
  );
}
