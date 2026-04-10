'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth, db } from '@/lib/firebase';
import { 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  signOut,
  User as FirebaseUser 
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
  password?: string; // Only for legacy local users, eventually remove
  role: UserRole;
  displayName: string;
};

// Seed users for initial cloud sync if DB is empty
const SEED_USERS: AppUser[] = [
  {
    id: 'usr_admin',
    username: 'PPSOLAR',
    password: 'PPSOLAR2026',
    role: 'admin',
    displayName: 'Admin (PP Solar)',
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
  logout: () => Promise<void>;
  createEmployee: (username: string, email: string, password: string, displayName: string) => Promise<void>;
  isAuthenticated: boolean;
  isLoaded: boolean;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [currentUser, setCurrentUser] = useState<AppUser | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  // 1. Sync users list from Firestore
  useEffect(() => {
    const q = query(collection(db, 'users'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const usersList: AppUser[] = [];
      snapshot.forEach((doc) => {
        usersList.push(doc.data() as AppUser);
      });
      
      // If Firestore is empty, upload seed users
      if (usersList.length === 0) {
        SEED_USERS.forEach(async (u) => {
          await setDoc(doc(db, 'users', u.id), u);
        });
      } else {
        setUsers(usersList);
      }
    });

    return () => unsubscribe();
  }, []);

  // 2. Listen for Auth State changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (fbUser) => {
      if (fbUser) {
        // Find matching app user from our registry
        // Note: In a real app, you'd match by fbUser.uid
        const savedSession = localStorage.getItem('ag_session');
        if (savedSession) {
          setCurrentUser(JSON.parse(savedSession));
        } else {
          // Fallback if session local cleared but firebase active
          const found = users.find(u => u.username === fbUser.displayName);
          if (found) setCurrentUser(found);
        }
      } else {
        setCurrentUser(null);
      }
      setIsLoaded(true);
    });

    return () => unsubscribe();
  }, [users]);

  // Handle Login (Simplified for this transition: we still check our registry)
  const login = async (username: string, password: string): Promise<boolean> => {
    const user = users.find(
      u => u.username.toLowerCase() === username.toLowerCase() && u.password === password
    );
    
    if (user) {
      // For this specific app, we use a single Firebase "Technical" account 
      // or we just simulate the login since Firestore is already syncing.
      // REAL fix: You should create real firebase auth accounts for each user.
      setCurrentUser(user);
      localStorage.setItem('ag_session', JSON.stringify(user));
      if (user.role === 'admin') {
        localStorage.setItem('ag_isAdmin', 'true');
      }
      return true;
    }
    return false;
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
      username,
      email,
      password,
      role: 'employee',
      displayName,
    };
    
    // Save to Firestore (will automatically sync to all devices via onSnapshot)
    await setDoc(doc(db, 'users', newUser.id), newUser);
  };

  return (
    <AuthContext.Provider
      value={{
        users,
        currentUser,
        login,
        logout,
        createEmployee,
        isAuthenticated: currentUser !== null,
        isLoaded,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

