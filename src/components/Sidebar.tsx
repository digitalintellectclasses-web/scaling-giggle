'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LayoutDashboard, Wallet, Users, Landmark, LogOut, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { useAuth } from '@/store/AuthContext';
import { useFinance } from '@/store/FinanceContext';

const navigation = [
  { name: 'Dashboard',     href: '/',            icon: LayoutDashboard, adminOnly: true  },
  { name: 'Financials',    href: '/financials',  icon: Wallet,          adminOnly: true  },
  { name: 'Partner Equity',href: '/equity',      icon: Landmark,        adminOnly: true  },
  { name: 'Employees',     href: '/employees',   icon: Users,           adminOnly: true  },
  { name: 'Clients',       href: '/clients',     icon: Users,           adminOnly: false },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { currentUser, logout } = useAuth();
  const { isAdmin } = useFinance();

  const handleLogout = () => {
    logout();
    router.replace('/');
  };

  const filteredNav = navigation.filter(item => !item.adminOnly || isAdmin);

  return (
    <div className="flex h-screen w-64 flex-shrink-0 flex-col bg-[#0f0f11] border-r border-[#27272a] shadow-2xl relative z-50">
      {/* Brand */}
      <div className="flex h-16 shrink-0 items-center px-6 border-b border-zinc-800/50">
        <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center">
            <span className="text-black font-extrabold text-sm">AG</span>
          </div>
          Finance
        </h1>
      </div>

      {/* Nav */}
      <nav className="flex flex-1 flex-col p-4 gap-1 overflow-y-auto">
        {filteredNav.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'group flex items-center gap-x-3 rounded-md p-2.5 text-sm leading-6 font-semibold relative transition-colors',
                isActive ? 'text-white' : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'
              )}
            >
              {isActive && (
                <motion.div
                  layoutId="sidebar-active"
                  className="absolute inset-0 rounded-md bg-emerald-500/10 border border-emerald-500/20"
                  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                />
              )}
              <item.icon
                className={cn('h-5 w-5 shrink-0 relative z-10', isActive ? 'text-emerald-500' : 'text-zinc-500')}
              />
              <span className="relative z-10">{item.name}</span>
            </Link>
          );
        })}
      </nav>

      {/* Footer: User card + Logout */}
      <div className="p-4 space-y-3 border-t border-zinc-800/50">
        {/* Logged-in user */}
        <div className="flex items-center gap-3 rounded-xl bg-zinc-900/60 border border-zinc-800 px-4 py-3">
          <div className={cn(
            'w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0',
            isAdmin ? 'bg-purple-500/20 text-purple-400' : 'bg-emerald-500/20 text-emerald-400'
          )}>
            {currentUser?.displayName.slice(0, 2).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-white truncate">{currentUser?.displayName}</p>
            <p className="text-xs text-zinc-500 flex items-center gap-1">
              {isAdmin
                ? <><ShieldCheck className="w-3 h-3 text-purple-400" /> Admin</>
                : 'Employee'}
            </p>
          </div>
        </div>

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold bg-zinc-800 hover:bg-red-500/10 text-zinc-300 hover:text-red-400 border border-zinc-700 hover:border-red-500/30 transition-all"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>
    </div>
  );
}
