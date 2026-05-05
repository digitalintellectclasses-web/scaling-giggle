'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { 
  LayoutDashboard, Wallet, Users, Settings, LogOut, ShieldCheck,
  Building2, Activity, BookOpen, FileText, Component, ClipboardList, PieChart, MessageSquare
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { useAuth } from '@/store/AuthContext';
import { useFinance } from '@/store/FinanceContext';
import { useNotifications } from '@/store/NotificationContext';
import { FirebaseIndicator } from '@/components/FirebaseIndicator';

const navigation = [
  { name: 'Dashboard',       href: '/',              icon: LayoutDashboard, adminOnly: true  },
  { name: 'Financials',      href: '/financials',    icon: Wallet,          adminOnly: true  },
  { name: 'Analytics',       href: '/analytics',     icon: PieChart,        adminOnly: true  },
  { name: 'Work',            href: '/work',          icon: ClipboardList,   adminOnly: false },
  { name: 'Team Chat',       href: '/chat',          icon: MessageSquare,   adminOnly: false },
  { name: 'Notifications',   href: '/notifications', icon: Activity,        adminOnly: false },
  { name: 'Books (Reports)', href: '/books',         icon: BookOpen,        adminOnly: true  },
  { name: 'Quotations',      href: '/quotations',    icon: FileText,        adminOnly: false },
  { name: 'Services',        href: '/services',      icon: Component,       adminOnly: true  },
  { name: 'Partner Equity',  href: '/equity',        icon: Building2,       adminOnly: true  },
  { name: 'Employees',       href: '/employees',     icon: Users,           adminOnly: true  },
  { name: 'Clients',         href: '/clients',       icon: Users,           adminOnly: false },
  { name: 'Settings',        href: '/settings',      icon: Settings,        adminOnly: true  },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { currentUser, logout, updatePassword } = useAuth();
  const { isAdmin } = useFinance();
  const { unreadCount } = useNotifications();

  const handleLogout = async () => {
    await logout();
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
              <span className="relative z-10 flex-1">{item.name}</span>
              {item.name === 'Notifications' && unreadCount > 0 && (
                <span className="relative z-10 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-black text-white shadow-lg shadow-red-900/20">
                  {unreadCount}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer: Firebase indicator + User card + Logout */}
      <div className="p-4 space-y-3 border-t border-zinc-800/50">
        {/* Firebase Status */}
        <FirebaseIndicator variant="sidebar" />
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

        <div className="flex flex-col gap-2 pt-2">
          <button
            onClick={async () => {
              const pass = prompt('Enter new password (min 6 characters):');
              if (pass && pass.length >= 6) {
                try {
                  await updatePassword(pass);
                  alert('✓ Password updated successfully.');
                } catch (err) {
                  alert('Failed to update password. Please try again.');
                }
              } else if (pass) {
                alert('Password must be at least 6 characters.');
              }
            }}
            className="flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-medium bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700 transition-all"
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            Update Password
          </button>

          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold bg-zinc-800 hover:bg-red-500/10 text-zinc-300 hover:text-red-400 border border-zinc-700 hover:border-red-500/30 transition-all"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}
