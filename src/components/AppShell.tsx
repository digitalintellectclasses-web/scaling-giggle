'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/store/AuthContext';
import { useFinance } from '@/store/FinanceContext';
import { LoginPage } from '@/components/LoginPage';
import { Sidebar } from '@/components/Sidebar';
import { MobileNav } from '@/components/MobileNav';
import { LogOut } from 'lucide-react';

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
    <div className="flex h-screen bg-[#09090b] overflow-hidden">
      {/* Desktop Sidebar */}
      <div className="hidden md:flex flex-shrink-0">
        <Sidebar />
      </div>

      <div className="flex flex-1 flex-col min-w-0">
        {/* Mobile Top Header (Minimal) */}
        <header className="flex h-14 items-center justify-between border-b border-zinc-800/50 bg-[#0f0f11]/50 px-4 md:hidden backdrop-blur-md sticky top-0 z-40">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded bg-emerald-500 flex items-center justify-center">
              <span className="text-black font-extrabold text-[10px]">AG</span>
            </div>
            <span className="text-sm font-bold tracking-tight text-white uppercase italic">Finance</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-[10px] font-bold text-zinc-400">
               {currentUser?.displayName.slice(0, 2).toUpperCase()}
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto overflow-x-hidden relative scroll-smooth">
          <div className="px-4 py-6 md:p-10 pb-28 md:pb-10">
            {children}
          </div>
        </main>
      </div>

      {/* Mobile Bottom Nav */}
      <MobileNav />
    </div>
  );
}
