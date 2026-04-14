'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { db } from '@/lib/firebase';
import { useAuth } from './AuthContext';
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
  type: 'transaction' | 'work' | 'system';
  message: string;
  targetUserId: string;
  isRead: boolean;
  createdAt: any;
  relatedId?: string;
};

type NotificationContextType = {
  notifications: Notification[];
  toasts: string[];
  addNotification: (notif: Omit<Notification, 'id' | 'isRead' | 'createdAt'>) => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  clearToast: (index: number) => void;
};

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { currentUser } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [toasts, setToasts] = useState<string[]>([]);

  useEffect(() => {
    if (!currentUser) {
      setNotifications([]);
      return;
    }

    const q = query(
      collection(db, 'notifications'),
      where('targetUserId', '==', currentUser.id),
      orderBy('createdAt', 'desc'),
      limit(20)
    );

    const unsub = onSnapshot(q, (snapshot) => {
      const newNotifs = snapshot.docs.map(d => ({ ...d.data(), id: d.id } as Notification));
      
      // If a new notification arrives that wasn't there before, trigger a toast
      const latestNotif = newNotifs[0];
      if (latestNotif && !latestNotif.isRead) {
         // Check if it's actually new (not just refreshed)
         const existing = notifications.find(n => n.id === latestNotif.id);
         if (!existing) {
           setToasts(prev => [...prev, latestNotif.message]);
           setTimeout(() => {
             setToasts(prev => prev.filter((_, i) => i !== 0));
           }, 5000);
         }
      }

      setNotifications(newNotifs);
    });

    return () => unsub();
  }, [currentUser, notifications]);

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

  const clearToast = (index: number) => {
    setToasts(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <NotificationContext.Provider value={{ 
      notifications, toasts, addNotification, markAsRead, clearToast 
    }}>
      {children}
      
      {/* Toast Overlay */}
      <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none">
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
