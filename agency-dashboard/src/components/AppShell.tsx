'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/store/AuthContext';
import { useFinance } from '@/store/FinanceContext';
import { LoginPage } from '@/components/LoginPage';
import { Sidebar } from '@/components/Sidebar';

/**
 * AppShell is the root client wrapper that:
 * 1. Shows LoginPage if user is not authenticated (except on /setup check)
 * 2. Syncs auth role → FinanceContext.isAdmin
 * 3. Renders the full sidebar + main layout when authenticated
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, currentUser, isLoaded: authLoaded } = useAuth();
  const { setIsAdmin, isLoaded: financeLoaded } = useFinance();
  const pathname = usePathname();

  // Keep FinanceContext isAdmin in sync with the authenticated user's role
  useEffect(() => {
    if (authLoaded && financeLoaded) {
      setIsAdmin(currentUser?.role === 'admin');
    }
  }, [currentUser, authLoaded, financeLoaded, setIsAdmin]);

  // While hydrating, show a blank dark screen to prevent flash
  if (!authLoaded) {
    return (
      <div className="min-h-screen bg-[#09090b] flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-2 border-emerald-500 rounded-full border-t-transparent" />
      </div>
    );
  }

  // Bypass auth check entirely if on the /setup route
  if (!isAuthenticated && pathname === '/setup') {
    return <main className="min-h-screen w-full">{children}</main>;
  }

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 h-screen overflow-y-auto w-full p-8 md:p-10">
        {children}
      </main>
    </div>
  );
}
