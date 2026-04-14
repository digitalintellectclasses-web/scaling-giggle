'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Wallet, Users, Landmark, ClipboardList } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { useFinance } from '@/store/FinanceContext';

const navigation = [
  { name: 'Home',      href: '/',            icon: LayoutDashboard, adminOnly: true  },
  { name: 'Finance',   href: '/financials',  icon: Wallet,          adminOnly: true  },
  { name: 'Work',      href: '/work',        icon: ClipboardList,   adminOnly: false },
  { name: 'Equity',    href: '/equity',      icon: Landmark,        adminOnly: true  },
  { name: 'Team',      href: '/employees',   icon: Users,           adminOnly: true  },
];

export function MobileNav() {
  const pathname = usePathname();
  const { isAdmin } = useFinance();

  const filteredNav = navigation.filter(item => !item.adminOnly || isAdmin);

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden">
      {/* Glassmorphism background */}
      <div className="bg-[#0f0f11]/80 backdrop-blur-xl border-t border-zinc-800/50 pb-safe shadow-[0_-8px_30px_rgb(0,0,0,0.5)]">
        <nav className="flex items-center justify-around h-16 px-2">
          {filteredNav.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  'relative flex flex-col items-center justify-center flex-1 h-full gap-1 transition-all duration-300',
                  isActive ? 'text-emerald-400' : 'text-zinc-500 hover:text-zinc-300'
                )}
              >
                {isActive && (
                  <motion.div
                    layoutId="mobile-nav-active"
                    className="absolute -top-[1px] w-12 h-1 bg-emerald-500 rounded-full shadow-[0_0_15px_rgba(16,185,129,0.5)]"
                    transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                  />
                )}
                
                <item.icon className={cn('h-5 w-5', isActive ? 'animate-in zoom-in-50 duration-300' : '')} />
                <span className="text-[10px] font-bold uppercase tracking-wider">{item.name}</span>
                
                {isActive && (
                  <div className="absolute inset-0 bg-emerald-500/5 blur-xl -z-10 rounded-full" />
                )}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
