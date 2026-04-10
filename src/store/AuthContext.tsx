'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

export type UserRole = 'admin' | 'employee';

export type AppUser = {
  id: string;
  username: string;
  email?: string; // stored in plain-text in localStorage (no backend)
  password: string; // stored in plain-text in localStorage (no backend)
  role: UserRole;
  displayName: string;
};

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
  login: (username: string, password: string) => boolean;
  logout: () => void;
  createEmployee: (username: string, email: string, password: string, displayName: string) => void;
  isAuthenticated: boolean;
  isLoaded: boolean;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [users, setUsers] = useState<AppUser[]>(SEED_USERS);
  const [currentUser, setCurrentUser] = useState<AppUser | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    // Load any extra users created by admin (seed users always included)
    const savedExtraUsers = localStorage.getItem('ag_extra_users');
    const extraUsers: AppUser[] = savedExtraUsers ? JSON.parse(savedExtraUsers) : [];

    // Merge seed + extra, seed takes precedence by id
    const seedIds = new Set(SEED_USERS.map(u => u.id));
    const merged = [...SEED_USERS, ...extraUsers.filter(u => !seedIds.has(u.id))];
    setUsers(merged);

    // Restore session
    const savedSession = localStorage.getItem('ag_session');
    if (savedSession) {
      const sessionUser = JSON.parse(savedSession) as AppUser;
      // Re-validate from merged list (password may have changed)
      const fresh = merged.find(u => u.id === sessionUser.id);
      if (fresh) setCurrentUser(fresh);
    }
    setIsLoaded(true);
  }, []);

  const login = (username: string, password: string): boolean => {
    const user = users.find(
      u => u.username.toLowerCase() === username.toLowerCase() && u.password === password
    );
    if (user) {
      setCurrentUser(user);
      localStorage.setItem('ag_session', JSON.stringify(user));
      return true;
    }
    return false;
  };

  const logout = () => {
    setCurrentUser(null);
    localStorage.removeItem('ag_session');
    // Also clear admin flag from FinanceContext
    localStorage.setItem('ag_isAdmin', 'false');
  };

  const createEmployee = (username: string, email: string, password: string, displayName: string) => {
    const newUser: AppUser = {
      id: `usr_${crypto.randomUUID()}`,
      username,
      email,
      password,
      role: 'employee',
      displayName,
    };
    setUsers(prev => {
      const updated = [...prev, newUser];
      // Persist only extra (non-seed) users
      const seedIds = new Set(SEED_USERS.map(u => u.id));
      localStorage.setItem('ag_extra_users', JSON.stringify(updated.filter(u => !seedIds.has(u.id))));
      return updated;
    });
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
