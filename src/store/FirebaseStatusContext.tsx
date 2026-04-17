'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { db, auth } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';

export type FirebaseStatus = 'connecting' | 'connected' | 'error' | 'offline';

type FirebaseError = {
  code: string;
  message: string;
  timestamp: string;
  raw: string;
};

type FirebaseStatusContextType = {
  status: FirebaseStatus;
  error: FirebaseError | null;
  clearError: () => void;
  lastChecked: Date | null;
};

const FirebaseStatusContext = createContext<FirebaseStatusContextType | undefined>(undefined);

const HEARTBEAT_DOC = '_heartbeat_';

export function FirebaseStatusProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<FirebaseStatus>('connecting');
  const [error, setError] = useState<FirebaseError | null>(null);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  const recordError = useCallback((err: unknown, source: string) => {
    const e = err as any;
    const message = e?.message || 'Unknown Firebase error';
    const code = e?.code || source;
    const timestamp = new Date().toISOString();
    setError({
      code,
      message,
      timestamp,
      raw: `[${timestamp}] ${source}: ${code} – ${message}`,
    });
    setStatus('error');
  }, []);

  const clearError = useCallback(() => {
    setError(null);
    setStatus('connected');
  }, []);

  // Monitor auth state — failure here means Firebase is unreachable
  useEffect(() => {
    let isMounted = true;
    let unsubAuth: (() => void) | null = null;

    try {
      unsubAuth = onAuthStateChanged(
        auth,
        () => {
          if (isMounted) {
            // Auth responded → Firebase Auth is alive
            setLastChecked(new Date());
          }
        },
        (err) => {
          if (isMounted) recordError(err, 'Auth');
        }
      );
    } catch (err) {
      if (isMounted) recordError(err, 'Auth:init');
    }

    return () => {
      isMounted = false;
      unsubAuth?.();
    };
  }, [recordError]);

  // Monitor Firestore with a lightweight snapshot on a well-known path.
  // We use the `_firebaseStatus` collection (auto-creates on first write).
  // If Firestore is unreachable, onSnapshot fires with an error.
  useEffect(() => {
    let isMounted = true;

    // Use the app config document as a "can-we-talk-to-Firestore" probe
    const statusDoc = doc(db, '_firebaseStatus', HEARTBEAT_DOC);

    const unsub = onSnapshot(
      statusDoc,
      { includeMetadataChanges: true },
      (snap) => {
        if (!isMounted) return;

        if (snap.metadata.fromCache) {
          // Data came from local cache; Firestore server not yet confirmed
          setStatus((prev) => (prev === 'error' ? 'error' : 'connecting'));
        } else {
          // Data from server → fully connected
          setStatus('connected');
          setLastChecked(new Date());
          // Clear any previous offline/error state now that we're back
          setError((prev) => {
            if (prev?.code?.includes('unavailable') || prev?.code?.includes('offline') || prev?.code?.includes('network')) {
              return null;
            }
            return prev;
          });
        }
      },
      (err) => {
        if (!isMounted) return;
        // Permission-denied is expected (we're using an uncreated doc).
        // That means Firestore *is* reachable — just blocked by rules.
        if (err.code === 'permission-denied') {
          setStatus('connected');
          setLastChecked(new Date());
        } else if (err.code === 'unavailable' || err.code === 'resource-exhausted') {
          setStatus('offline');
          recordError(err, 'Firestore');
        } else {
          recordError(err, 'Firestore');
        }
      }
    );

    return () => {
      isMounted = false;
      unsub();
    };
  }, [recordError]);

  // Offline / online browser events
  useEffect(() => {
    const handleOffline = () => setStatus('offline');
    const handleOnline = () => {
      setStatus('connecting');
      setLastChecked(null);
    };

    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);
    return () => {
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
    };
  }, []);

  return (
    <FirebaseStatusContext.Provider value={{ status, error, clearError, lastChecked }}>
      {children}
    </FirebaseStatusContext.Provider>
  );
}

export function useFirebaseStatus() {
  const ctx = useContext(FirebaseStatusContext);
  if (!ctx) throw new Error('useFirebaseStatus must be used within FirebaseStatusProvider');
  return ctx;
}
