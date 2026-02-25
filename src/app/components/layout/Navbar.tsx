'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV_LINKS = [
  { href: '/', label: 'Dashboard' },
  { href: '/feed', label: 'Feed' },
  { href: '/cases', label: 'Cases' },
  { href: '/about', label: 'About' },
];

export default function Navbar() {
  const pathname = usePathname();

  return (
    <nav className="bg-slate-800 border-b border-slate-700">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-lg font-bold text-slate-100 font-mono hover:text-blue-400 transition-colors">
              🔍 PROZORRO RADAR
            </span>
            <span className="text-xs text-slate-400 hidden sm:block">
              Tender Risk Signals
            </span>
          </Link>
          <div className="flex items-center gap-1">
            {NAV_LINKS.map(({ href, label }) => {
              const isActive = href === '/' ? pathname === '/' : pathname.startsWith(href);
              return (
                <Link
                  key={href}
                  href={href}
                  className={`px-3 py-2 rounded text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-blue-500/20 text-blue-400'
                      : 'text-slate-400 hover:text-slate-100 hover:bg-slate-700'
                  }`}
                >
                  {label}
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </nav>
  );
}
