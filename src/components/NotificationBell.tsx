'use client';

import React, { useState } from 'react';
import { Bell, BellDot, X, CheckSquare, MessageSquare } from 'lucide-react';
import { useNotifications, Notification } from '@/store/NotificationContext';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

export function NotificationBell() {
  const { notifications, markAsRead } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <div className="relative">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700 transition-all"
      >
        {unreadCount > 0 ? (
          <>
            <BellDot className="w-5 h-5 text-emerald-500 animate-pulse" />
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-black rounded-full flex items-center justify-center">
               {unreadCount}
            </span>
          </>
        ) : (
          <Bell className="w-5 h-5" />
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <div 
              className="fixed inset-0 z-[100]" 
              onClick={() => setIsOpen(false)} 
            />
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              className="absolute right-0 mt-3 w-80 max-h-[400px] bg-[#121214] border border-zinc-800 rounded-2xl shadow-2xl z-[101] overflow-hidden flex flex-col"
            >
              <div className="p-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/50">
                <h3 className="font-bold text-white text-sm">Notifications</h3>
                <button 
                  onClick={() => setIsOpen(false)}
                  className="p-1 hover:bg-zinc-800 rounded-lg text-zinc-500 hover:text-white transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto divide-y divide-zinc-800/50">
                {notifications.length === 0 ? (
                  <div className="p-12 text-center text-zinc-500 text-xs">
                    <Bell className="w-8 h-8 mx-auto mb-2 opacity-20" />
                    No notifications yet.
                  </div>
                ) : (
                  notifications.map(notif => (
                    <div 
                      key={notif.id}
                      onClick={() => markAsRead(notif.id)}
                      className={cn(
                        "p-4 cursor-pointer hover:bg-zinc-800/30 transition-colors group relative",
                        !notif.isRead ? "bg-emerald-500/5" : ""
                      )}
                    >
                      {!notif.isRead && (
                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-emerald-500" />
                      )}
                      <div className="flex gap-3">
                        <div className={cn(
                          "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
                          notif.type === 'work' ? "bg-blue-500/10 text-blue-400" : "bg-emerald-500/10 text-emerald-400"
                        )}>
                           {notif.type === 'work' ? <CheckSquare className="w-4 h-4" /> : <MessageSquare className="w-4 h-4" />}
                        </div>
                        <div className="space-y-1">
                          <p className={cn("text-xs leading-relaxed", !notif.isRead ? "text-white font-semibold" : "text-zinc-400")}>
                            {notif.message}
                          </p>
                          <p className="text-[10px] text-zinc-600">
                             {new Date(notif.createdAt?.seconds * 1000).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {unreadCount > 0 && (
                <div className="p-3 bg-zinc-900/30 border-t border-zinc-800 text-center">
                   <p className="text-[10px] font-bold text-zinc-600">Click individual items to clear</p>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
