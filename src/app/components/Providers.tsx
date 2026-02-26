'use client';

import { SessionProvider } from 'next-auth/react';

export default function Providers({ children, authDisabled }: { children: React.ReactNode; authDisabled: boolean }) {
  if (authDisabled) return <>{children}</>;
  return <SessionProvider>{children}</SessionProvider>;
}
