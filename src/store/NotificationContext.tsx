'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { db } from '@/lib/firebase';
import { useAuth } from './AuthContext';
import { useFirebaseStatus } from './FirebaseStatusContext';
import { Copy, Check, X, AlertTriangle } from 'lucide-react';
import { 
  collection, 
  onSnapshot, 
  query, 
  where, 
  orderBy, 
  limit, 
  addDoc, 
  Timestamp,
  doc,
  updateDoc,
  deleteDoc
} from 'firebase/firestore';

export type Notification = {
  id: string;
  type: 'transaction' | 'work' | 'system' | 'reset_request' | 'transaction_request';
  message: string;
  targetUserId: string;
  isRead: boolean;
  createdAt: any;
  relatedId?: string;
  resetRequestId?: string;
  transactionRequestId?: string;
  status?: 'pending' | 'approved' | 'rejected';
};

type NotificationContextType = {
  notifications: Notification[];
  unreadCount: number;
  toasts: string[];
  addNotification: (notif: Omit<Notification, 'id' | 'isRead' | 'createdAt'>) => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  updateNotificationStatus: (id: string, status: 'approved' | 'rejected') => Promise<void>;
  clearToast: (index: number) => void;
};

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

// Small internal component for a Firebase error toast
function FirebaseErrorToast({ onClose }: { onClose: () => void }) {
  const { error } = useFirebaseStatus();
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    if (!error) return;
    try {
      await navigator.clipboard.writeText(error.raw);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = error.raw;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [error]);

  if (!error) return null;

  return (
    <div className="bg-[#1a0f0f] border border-red-500/40 text-red-200 px-4 py-3 rounded-xl shadow-2xl shadow-red-900/30 text-sm animate-in slide-in-from-right-10 pointer-events-auto flex flex-col gap-2 min-w-[280px] max-w-[340px]">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
          <span className="font-bold text-red-300 text-xs">Firebase Error</span>
        </div>
        <button onClick={onClose} className="text-red-500 hover:text-red-300 transition-colors flex-shrink-0">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
      <p className="text-xs text-zinc-400 leading-relaxed font-mono truncate">{error.code}</p>
      <p className="text-xs text-zinc-300 leading-relaxed">{error.message}</p>
      <button
        onClick={handleCopy}
        className={`flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg text-[11px] font-bold transition-all border ${
          copied
            ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-300'
            : 'bg-zinc-800 border-zinc-700 text-zinc-300 hover:bg-zinc-700 hover:text-white'
        }`}
      >
        {copied ? <><Check className="w-3 h-3" /> Copied!</> : <><Copy className="w-3 h-3" /> Copy Error</>}
      </button>
    </div>
  );
}

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { currentUser } = useAuth();
  const { status: firebaseStatus, error: firebaseError, clearError } = useFirebaseStatus();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [toasts, setToasts] = useState<string[]>([]);
  const [showFirebaseErrorToast, setShowFirebaseErrorToast] = useState(false);

  // Show error toast when Firebase has an issue
  useEffect(() => {
    if (firebaseError && (firebaseStatus === 'error' || firebaseStatus === 'offline')) {
      setShowFirebaseErrorToast(true);
    } else {
      setShowFirebaseErrorToast(false);
    }
  }, [firebaseError, firebaseStatus]);

  useEffect(() => {
    if (!currentUser) {
      setNotifications(prev => prev.length > 0 ? [] : prev);
      return;
    }

    const q = query(
      collection(db, 'notifications'),
      where('targetUserId', '==', currentUser.id)
    );

    const unsub = onSnapshot(q, (snapshot) => {
      const newNotifs = snapshot.docs
        .map(d => ({ ...d.data(), id: d.id } as Notification))
        .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0))
        .slice(0, 20);
      
      setNotifications(prev => {
        const latestNotif = newNotifs[0];
        if (latestNotif && !latestNotif.isRead) {
          const existing = prev.find(n => n.id === latestNotif.id);
          if (!existing) {
            setToasts(t => [...t, latestNotif.message]);
            setTimeout(() => {
              setToasts(t => t.filter((_, i) => i !== 0));
            }, 5000);
          }
        }
        return newNotifs;
      });
    });

    return () => unsub();
  }, [currentUser]);

  const addNotification = async (notif: Omit<Notification, 'id' | 'isRead' | 'createdAt'>) => {
    await addDoc(collection(db, 'notifications'), {
      ...notif,
      isRead: false,
      createdAt: Timestamp.now(),
    });
  };

  const markAsRead = async (id: string) => {
    await updateDoc(doc(db, 'notifications', id), { isRead: true });
  };

  const updateNotificationStatus = async (id: string, status: 'approved' | 'rejected') => {
    await updateDoc(doc(db, 'notifications', id), { status, isRead: true });
  };

  const clearToast = (index: number) => {
    setToasts(prev => prev.filter((_, i) => i !== index));
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <NotificationContext.Provider value={{ 
      notifications, unreadCount, toasts, addNotification, markAsRead, updateNotificationStatus, clearToast 
    }}>
      {children}
      
      {/* Toast Overlay */}
      <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none">
        {/* Firebase error toast */}
        {showFirebaseErrorToast && (
          <FirebaseErrorToast onClose={() => { setShowFirebaseErrorToast(false); clearError(); }} />
        )}
        {toasts.map((toast, i) => (
          <div 
            key={i}
            className="bg-emerald-500 text-black px-4 py-3 rounded-xl shadow-2xl font-bold text-sm animate-in slide-in-from-right-10 pointer-events-auto flex items-center gap-3 border border-emerald-400"
          >
             <div className="w-2 h-2 bg-black rounded-full animate-pulse" />
             {toast}
          </div>
        ))}
      </div>
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotifications must be used within NotificationProvider');
  return ctx;
}
