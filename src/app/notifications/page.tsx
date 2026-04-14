'use client';

import { useNotifications } from '@/store/NotificationContext';
import { useFinance } from '@/store/FinanceContext';
import { useAuth } from '@/store/AuthContext';
import { Bell, CheckCircle2, XCircle, Trash2, ShieldAlert, Clock, MessageSquare, CheckSquare, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

export default function NotificationsPage() {
  const { notifications, markAsRead, updateNotificationStatus } = useNotifications();
  const { acceptResetRequest, isAdmin } = useFinance();
  const { currentUser } = useAuth();

  const handleAcceptReset = async (notif: any) => {
    if (!notif.resetRequestId) return;
    const confirm = window.confirm("ARE YOU SURE? This will PERMANENTLY DELETE ALL transaction, salary, equity, and client data from the entire system.");
    if (confirm) {
      await acceptResetRequest(notif.resetRequestId, notif.id);
      alert("System Reset Executed.");
    }
  };

  const handleDeclineReset = async (notif: any) => {
    await updateNotificationStatus(notif.id, 'rejected');
  };

  return (
    <div className="space-y-6 pb-20 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Notifications</h1>
          <p className="text-zinc-400">Manage your alerts, work updates, and system approval requests.</p>
        </div>
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl px-4 py-2 flex items-center gap-2">
          <Bell className="w-4 h-4 text-emerald-500" />
          <span className="text-white font-bold">{notifications.length} Total</span>
        </div>
      </div>

      <div className="space-y-4">
        {notifications.length === 0 ? (
          <div className="py-20 text-center bg-zinc-900/20 border border-zinc-800 rounded-2xl">
            <Bell className="w-12 h-12 text-zinc-700 mx-auto mb-4 opacity-20" />
            <p className="text-zinc-500 font-medium">No notifications yet.</p>
          </div>
        ) : (
          notifications.map((notif) => (
            <div 
              key={notif.id}
              className={cn(
                "group relative p-5 rounded-2xl border transition-all",
                !notif.isRead 
                  ? "bg-emerald-500/5 border-emerald-500/20 shadow-[0_0_20px_rgba(16,185,129,0.05)]" 
                  : "bg-zinc-900/40 border-zinc-800 hover:border-zinc-700"
              )}
            >
              {!notif.isRead && (
                <div className="absolute left-0 top-6 bottom-6 w-1 bg-emerald-500 rounded-r-lg" />
              )}

              <div className="flex gap-5">
                {/* Icon */}
                <div className={cn(
                  "w-12 h-12 rounded-xl flex items-center justify-center shrink-0 shadow-inner",
                  notif.type === 'reset_request' ? "bg-red-500/10 text-red-400" :
                  notif.type === 'work' ? "bg-blue-500/10 text-blue-400" :
                  "bg-emerald-500/10 text-emerald-400"
                )}>
                  {notif.type === 'reset_request' ? <AlertTriangle className="w-6 h-6" /> :
                   notif.type === 'work' ? <CheckSquare className="w-6 h-6" /> :
                   <MessageSquare className="w-6 h-6" />}
                </div>

                {/* Content */}
                <div className="flex-1 space-y-3">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <p className={cn("text-sm leading-relaxed", !notif.isRead ? "text-white font-bold" : "text-zinc-300")}>
                        {notif.message}
                      </p>
                      <div className="flex items-center gap-3 text-[10px] text-zinc-500 font-medium uppercase tracking-wider">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {notif.createdAt?.seconds ? format(new Date(notif.createdAt.seconds * 1000), 'MMM dd, hh:mm a') : 'Just now'}
                        </span>
                        <span>•</span>
                        <span className={cn(
                          "px-2 py-0.5 rounded-md border",
                          notif.type === 'reset_request' ? "border-red-500/20 bg-red-500/5 text-red-400" :
                          notif.type === 'work' ? "border-blue-500/20 bg-blue-500/5 text-blue-400" :
                          "border-emerald-500/20 bg-emerald-500/5 text-emerald-400"
                        )}>{notif.type.replace('_', ' ')}</span>
                      </div>
                    </div>

                    {!notif.isRead && (
                      <button 
                        onClick={() => markAsRead(notif.id)}
                        className="text-[10px] font-bold text-emerald-500 hover:text-emerald-400 transition-colors uppercase tracking-widest"
                      >
                        [ Mark Read ]
                      </button>
                    )}
                  </div>

                  {/* Actions for Reset Requests */}
                  {notif.type === 'reset_request' && notif.status === 'pending' && (
                    <div className="flex items-center gap-3 pt-2">
                       <button 
                         onClick={() => handleAcceptReset(notif)}
                         className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg text-xs font-bold transition-all shadow-lg shadow-red-900/20"
                       >
                         <ShieldAlert className="w-4 h-4" />
                         Approve Reset
                       </button>
                       <button 
                         onClick={() => handleDeclineReset(notif)}
                         className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 rounded-lg text-xs font-bold transition-all"
                       >
                         Decline
                       </button>
                    </div>
                  )}

                  {notif.status && notif.status !== 'pending' && (
                    <div className={cn(
                      "inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border",
                      notif.status === 'approved' ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" : "bg-red-500/10 border-red-500/20 text-red-400"
                    )}>
                      {notif.status === 'approved' ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                      Request {notif.status}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
