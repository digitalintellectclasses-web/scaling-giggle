'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth, db } from '@/lib/firebase';
import { 
  onAuthStateChanged, 
  signInAnonymously,
  signOut,
} from 'firebase/auth';
import { 
  collection, 
  onSnapshot, 
  doc, 
  setDoc, 
  query 
} from 'firebase/firestore';

export type UserRole = 'admin' | 'employee';

export type AppUser = {
  id: string;
  username: string;
  email?: string;
  password?: string;
  role: UserRole;
  displayName: string;
};

// Always-available fallback users — login works even before Firestore responds
const SEED_USERS: AppUser[] = [
  {
    id: 'usr_pratik',
    username: 'PRATIK',
    password: 'PratikIvory2026',
    role: 'admin',
    displayName: 'Pratik',
  },
  {
    id: 'usr_pranav',
    username: 'PRANAV',
    password: 'PranavIvory2026',
    role: 'admin',
    displayName: 'Pranav',
  },
  {
    id: 'usr_palak',
    username: 'PALAK',
    password: 'PalakIvory2026',
    role: 'employee',
    displayName: 'Palak',
  },
  {
    id: 'usr_vaishnav',
    username: 'VAISHNAV',
    password: 'VaishnavIvory2026',
    role: 'employee',
    displayName: 'Vaishnav',
  },
  {
    id: 'usr_priyanka',
    username: 'PRIYANKA',
    password: 'PriyankaIvory2026',
    role: 'employee',
    displayName: 'Priyanka',
  },
];

type AuthContextType = {
  users: AppUser[];
  currentUser: AppUser | null;
  login: (username: string, password: string) => Promise<boolean>;
  loginAsGuest: (info: { name: string; email: string; phone: string; company: string }) => void;
  logout: () => Promise<void>;
  createEmployee: (username: string, email: string, password: string, displayName: string) => Promise<void>;
  updatePassword: (newPassword: string) => Promise<void>;
  isAuthenticated: boolean;
  isLoaded: boolean;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [users, setUsers] = useState<AppUser[]>(SEED_USERS);
  const [currentUser, setCurrentUser] = useState<AppUser | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    // Restore app-level session immediately (prevents login flicker on refresh)
    const savedSession = localStorage.getItem('ag_session');
    if (savedSession) {
      try { setCurrentUser(JSON.parse(savedSession)); } 
      catch { localStorage.removeItem('ag_session'); }
    }

    let unsubUsers: (() => void) | undefined;

    const initAuth = async () => {
      // Master Auth Failsafe: If Firebase Auth takes > 3.5s, force load the app.
      // This prevents the "infinite spinner" if Auth is blocked or slow.
      const authFailsafe = setTimeout(() => {
        if (!isLoaded) {
          console.warn('⚠️ Auth initialization timeout - forcing app to load.');
          setIsLoaded(true);
        }
      }, 3500);

      try {
        // IMPORTANT: Wait for Firebase to finish restoring any persisted auth session.
        await auth.authStateReady();

        if (!auth.currentUser) {
          await signInAnonymously(auth);
        }
      } catch (err: any) {
        if (err.code === 'auth/admin-restricted-operation') {
          console.warn('Anonymous Auth is disabled in Firebase Console.');
        } else {
          console.error('Firebase Auth init failed:', err.code);
        }
      }

      // Cleanup failsafe and settle auth state
      clearTimeout(authFailsafe);
      setIsLoaded(true);

      unsubUsers = onSnapshot(
        query(collection(db, 'users')),
        (snapshot) => {
          const dbUsers: AppUser[] = snapshot.docs.map(d => d.data() as AppUser);
          
          // Merge SEED_USERS with db users to ensure admins are always available
          // Database users take priority if there's a conflict, but SEED_USERS
          // are added if their ID doesn't exist in the DB list.
          const merged = [...dbUsers];
          SEED_USERS.forEach(seed => {
            if (!merged.find(u => u.id === seed.id)) {
              merged.push(seed);
              // Background sync: If a seed user is missing in DB, attempt to add it
              setDoc(doc(db, 'users', seed.id), seed).catch(e => {
                if (e.code !== 'permission-denied') console.error('Seed sync fail:', e.code);
              });
            }
          });
          
          setUsers(merged);
        },
        (err) => console.error('Firestore Users Error:', err.code)
      );
    };

    initAuth();


    // Watch for auth state changes (handle session expiry etc.)
    const unsubAuth = onAuthStateChanged(auth, (fbUser) => {
      if (!fbUser && !localStorage.getItem('ag_session')) {
        setCurrentUser(null);
      }
    });

    return () => {
      unsubAuth();
      if (unsubUsers) unsubUsers();
    };
  }, []);

  const login = async (username: string, password: string): Promise<boolean> => {
    // Check both current sync state and SEED_USERS fallback to handle cloud delays
    const searchTarget = username.trim().toLowerCase();
    const user = users.find(u => u.username.toLowerCase() === searchTarget && u.password === password)
              || SEED_USERS.find(u => u.username.toLowerCase() === searchTarget && u.password === password);

    if (user) {
      setCurrentUser(user);
      localStorage.setItem('ag_session', JSON.stringify(user));
      if (user.role === 'admin') localStorage.setItem('ag_isAdmin', 'true');

      // Re-establish Firebase session if signOut() cleared it previously
      if (!auth.currentUser) {
        try { await signInAnonymously(auth); }
        catch (err: any) { console.error('Re-auth after login failed:', err.code); }
      }
      return true;
    }
    return false;
  };

  const loginAsGuest = (info: { name: string; email: string; phone: string; company: string }) => {
    const guestUser: AppUser = {
      id: 'guest',
      username: 'GUEST',
      role: 'admin', // Make them admin so they can see dashboard and equity
      displayName: info.name + ' (Guest)',
      email: info.email
    };
    // Save info to local storage for our records if needed
    localStorage.setItem('ag_guest_info', JSON.stringify(info));
    setCurrentUser(guestUser);
    localStorage.setItem('ag_session', JSON.stringify(guestUser));
    localStorage.setItem('ag_isAdmin', 'true');
  };

  const logout = async () => {
    setCurrentUser(null);
    localStorage.removeItem('ag_session');
    localStorage.setItem('ag_isAdmin', 'false');
    await signOut(auth);
  };

  const createEmployee = async (username: string, email: string, password: string, displayName: string) => {
    const newUser: AppUser = {
      id: `usr_${crypto.randomUUID()}`,
      username, email, password,
      role: 'employee',
      displayName,
    };
    await setDoc(doc(db, 'users', newUser.id), newUser);
  };
  
  const updatePassword = async (newPassword: string) => {
    if (!currentUser) return;
    const updatedUser = { ...currentUser, password: newPassword };
    await setDoc(doc(db, 'users', currentUser.id), updatedUser);
    setCurrentUser(updatedUser);
    localStorage.setItem('ag_session', JSON.stringify(updatedUser));
  };

  return (
    <AuthContext.Provider value={{
      users, currentUser, login, loginAsGuest, logout, createEmployee, updatePassword,
      isAuthenticated: currentUser !== null,
      isLoaded,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
