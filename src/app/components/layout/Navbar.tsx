'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';

const NAV_LINKS = [
  { href: '/', label: 'Dashboard' },
  { href: '/feed', label: 'Feed' },
  { href: '/cases', label: 'Cases' },
  { href: '/about', label: 'About' },
];

export default function Navbar({ authDisabled }: { authDisabled: boolean }) {
  const pathname = usePathname();

  if (pathname === '/login') return null;

  return (
    <nav className="bg-slate-800 border-b border-slate-700">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-14 sm:h-16">
          <Link href="/" className="flex items-center gap-2 flex-shrink-0">
            <span className="text-base sm:text-lg font-bold text-slate-100 font-mono hover:text-blue-400 transition-colors">
              👀 RADAR
            </span>
            <span className="text-xs text-slate-400 hidden md:block">
              Tender Risk Signals
            </span>
          </Link>
          <div className="flex items-center gap-0.5 sm:gap-1">
            {NAV_LINKS.map(({ href, label }) => {
              const isActive = href === '/' ? pathname === '/' : pathname.startsWith(href);
              return (
                <Link
                  key={href}
                  href={href}
                  className={`px-2 sm:px-3 py-1.5 sm:py-2 rounded text-xs sm:text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-blue-500/20 text-blue-400'
                      : 'text-slate-400 hover:text-slate-100 hover:bg-slate-700'
                  }`}
                >
                  {label}
                </Link>
              );
            })}
            {!authDisabled && (
              <button
                onClick={() => signOut({ callbackUrl: '/login' })}
                className="ml-2 px-2 py-1.5 text-xs text-slate-500 hover:text-slate-300 transition-colors"
              >
                Sign Out
              </button>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
