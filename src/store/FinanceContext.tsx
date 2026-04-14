'use client';

import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { useNotifications } from './NotificationContext';
import { useAuth } from './AuthContext';
import {
  collection,
  onSnapshot,
  doc,
  setDoc,
  updateDoc,
  getDoc,
  deleteDoc,
  query,
  orderBy,
  where,
  limit,
  writeBatch,
  enableNetwork,
  disableNetwork,
  Timestamp
} from 'firebase/firestore';

export type Transaction = {
  id: string;
  type: 'income' | 'expense';
  amount: number;
  category: string;
  description: string;
  date: string;
  managedBy: 'Pratik' | 'Pranav';
  paymentMethod: 'cash' | 'online';
};

export type Client = {
  id: string;
  name: string;
  packageTier: number;
  activationDate: string;
  expiryDate: string;
  externalCosts: number;
};

export type PartnerEquity = {
  id: string;
  partnerId: 'Pratik' | 'Pranav';
  type: 'investment' | 'drawing';
  amount: number;
  date: string;
};

export type SalaryPayment = {
  id: string;
  employeeUserId: string;
  employeeName: string;
  amount: number;
  month: string;
  date: string;
  paidBy: 'Pratik' | 'Pranav';
  paymentMethod: 'cash' | 'online';
  note: string;
};

type FinanceContextType = {
  transactions: Transaction[];
  clients: Client[];
  equities: PartnerEquity[];
  salaryPayments: SalaryPayment[];
  isAdmin: boolean;
  addTransaction: (tx: Omit<Transaction, 'id'>) => Promise<void>;
  addClient: (client: Omit<Client, 'id'>) => Promise<void>;
  addEquity: (equity: Omit<PartnerEquity, 'id'>) => Promise<void>;
  addSalaryPayment: (sp: Omit<SalaryPayment, 'id'>) => Promise<void>;
  deleteSalaryPayment: (id: string) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
  deleteClient: (id: string) => Promise<void>;
  setIsAdmin: (val: boolean) => void;
  isLoaded: boolean;
  requestGlobalReset: () => Promise<void>;
  acceptResetRequest: (requestId: string, notificationId: string) => Promise<void>;
  activeResetRequest: any;
};

const FinanceContext = createContext<FinanceContextType | undefined>(undefined);

export function FinanceProvider({ children }: { children: React.ReactNode }) {
  const { addNotification } = useNotifications();
  const { users, currentUser } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [equities, setEquities] = useState<PartnerEquity[]>([]);
  const [salaryPayments, setSalaryPayments] = useState<SalaryPayment[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [activeResetRequest, setActiveResetRequest] = useState<any>(null);

  const loadedRef = useRef({ tx: false, clients: false, equities: false, salaries: false });
  // Track the active Firestore unsub functions so we can restart them if needed
  const unsubRef = useRef<(() => void) | null>(null);

  const checkAllLoaded = () => {
    const r = loadedRef.current;
    if (r.tx && r.clients && r.equities && r.salaries) {
      setIsLoaded(true);
    }
  };

  const startFirestoreListeners = () => {
    if (unsubRef.current) {
      unsubRef.current();
      unsubRef.current = null;
    }
    loadedRef.current = { tx: false, clients: false, equities: false, salaries: false };

    // Master UI Failsafe: If Firestore takes > 3s, show the UI anyway
    const forceLoadTimeout = setTimeout(() => {
      if (!isLoaded) {
        console.warn('⚠️ Firestore slow response - forcing UI display.');
        setIsLoaded(true);
      }
    }, 3000);


    const unsubTx = onSnapshot(
      query(collection(db, 'transactions'), orderBy('date', 'desc')),
      (snapshot) => {
        setTransactions(snapshot.docs.map(d => ({ ...d.data() as Transaction, id: d.id })));
        loadedRef.current.tx = true;
        checkAllLoaded();
      },
      (err) => {
        console.error('Firestore Transactions Error:', err.code);
        loadedRef.current.tx = true;
        checkAllLoaded();
      }
    );

    const unsubClients = onSnapshot(
      collection(db, 'clients'),
      (snapshot) => {
        setClients(snapshot.docs.map(d => ({ ...d.data() as Client, id: d.id })));
        loadedRef.current.clients = true;
        checkAllLoaded();
      },
      (err) => {
        console.error('Firestore Clients Error:', err.code);
        loadedRef.current.clients = true;
        checkAllLoaded();
      }
    );

    const unsubEquities = onSnapshot(
      query(collection(db, 'equities'), orderBy('date', 'desc')),
      (snapshot) => {
        setEquities(snapshot.docs.map(d => ({ ...d.data() as PartnerEquity, id: d.id })));
        loadedRef.current.equities = true;
        checkAllLoaded();
      },
      (err) => {
        console.error('Firestore Equities Error:', err.code);
        loadedRef.current.equities = true;
        checkAllLoaded();
      }
    );

    const unsubSalaries = onSnapshot(
      query(collection(db, 'salaries'), orderBy('date', 'desc')),
      (snapshot) => {
        setSalaryPayments(snapshot.docs.map(d => ({ ...d.data() as SalaryPayment, id: d.id })));
        loadedRef.current.salaries = true;
        checkAllLoaded();
      },
      (err) => {
        console.error('Firestore Salaries Error:', err.code);
        loadedRef.current.salaries = true;
        checkAllLoaded();
      }
    );

    const unsubReset = onSnapshot(
      query(collection(db, 'reset_requests'), where('status', '==', 'pending'), limit(1)),
      (snapshot) => {
        if (!snapshot.empty) {
          setActiveResetRequest({ ...snapshot.docs[0].data(), id: snapshot.docs[0].id });
        } else {
          setActiveResetRequest(null);
        }
      }
    );

    unsubRef.current = () => {
      clearTimeout(forceLoadTimeout);
      unsubTx();
      unsubClients();
      unsubEquities();
      unsubSalaries();
      unsubReset();
    };
  };

  // Main effect: wait for Firebase Auth, then start Firestore listeners.
  // hasValidAuth tracks whether we've successfully started listeners WITH auth.
  useEffect(() => {
    let hasValidAuth = false;
    let authTimeoutId: ReturnType<typeof setTimeout>;

    const unsubAuth = onAuthStateChanged(auth, (user) => {
      if (user && !hasValidAuth) {
        hasValidAuth = true;
        clearTimeout(authTimeoutId);
        startFirestoreListeners();
      }
    });

    // Auth Failsafe: if Firebase Auth takes more than 2.5s start listeners anyway.
    authTimeoutId = setTimeout(() => {
      if (!hasValidAuth) {
        console.warn('Auth timeout — starting listeners.');
        startFirestoreListeners();
      }
    }, 2500);

    return () => {
      unsubAuth();
      clearTimeout(authTimeoutId);
      if (unsubRef.current) {
        unsubRef.current();
        unsubRef.current = null;
      }
    };
  }, []);

  // One-time migration from LocalStorage → Firestore
  useEffect(() => {
    const migrate = async () => {
      if (localStorage.getItem('ag_cloud_migrated') === 'true') return;
      const savedTx = localStorage.getItem('ag_transactions');
      const savedClients = localStorage.getItem('ag_clients');
      const savedEquities = localStorage.getItem('ag_equities');
      const savedSalaries = localStorage.getItem('ag_salaries');
      if (savedTx || savedClients || savedEquities || savedSalaries) {
        try {
          const batch = writeBatch(db);
          if (savedTx) JSON.parse(savedTx).forEach((t: Transaction) => batch.set(doc(db, 'transactions', t.id), t));
          if (savedClients) JSON.parse(savedClients).forEach((c: Client) => batch.set(doc(db, 'clients', c.id), c));
          if (savedEquities) JSON.parse(savedEquities).forEach((e: PartnerEquity) => batch.set(doc(db, 'equities', e.id), e));
          if (savedSalaries) JSON.parse(savedSalaries).forEach((s: SalaryPayment) => batch.set(doc(db, 'salaries', s.id), s));
          await batch.commit();
          console.log('✅ Migration to Firestore complete.');
        } catch (err) {
          console.error('❌ Migration failed:', err);
        }
      }
      localStorage.setItem('ag_cloud_migrated', 'true');
    };
    migrate();
  }, []);

  const addTransaction = async (tx: Omit<Transaction, 'id'>) => {
    if (!auth.currentUser) return;
    const id = crypto.randomUUID();
    try {
      await setDoc(doc(db, 'transactions', id), { ...tx, id });

      // Notify other owner(s)
      const otherAdmins = users.filter(u => u.role === 'admin' && u.id !== currentUser?.id);
      for (const admin of otherAdmins) {
        await addNotification({
          type: 'transaction',
          message: `${currentUser?.displayName} added transaction: ${tx.description} (${tx.type === 'income' ? '+' : '-'}${tx.amount})`,
          targetUserId: admin.id,
          relatedId: id
        });
      }
    }
    catch (err: any) { console.error('Transaction write failed:', err.code); }
  };

  const addClient = async (client: Omit<Client, 'id'>) => {
    const id = crypto.randomUUID();
    await setDoc(doc(db, 'clients', id), { ...client, id });
  };

  const addEquity = async (equity: Omit<PartnerEquity, 'id'>) => {
    const id = crypto.randomUUID();
    await setDoc(doc(db, 'equities', id), { ...equity, id });

    // Notify other owner
    const otherAdmins = users.filter(u => u.role === 'admin' && u.id !== currentUser?.id);
    for (const admin of otherAdmins) {
      await addNotification({
        type: 'transaction',
        message: `${currentUser?.displayName} updated Equity: ${equity.type} (${equity.amount})`,
        targetUserId: admin.id,
        relatedId: id
      });
    }
  };

  const addSalaryPayment = async (sp: Omit<SalaryPayment, 'id'>) => {
    const id = crypto.randomUUID();
    await setDoc(doc(db, 'salaries', id), { ...sp, id });

    // Notify employee
    await addNotification({
      type: 'transaction',
      message: `Salary payment received: ${sp.month} (${sp.amount})`,
      targetUserId: sp.employeeUserId,
      relatedId: id
    });
  };

  const deleteSalaryPayment = async (id: string) => {
    await deleteDoc(doc(db, 'salaries', id));
  };

  const deleteTransaction = async (id: string) => {
    await deleteDoc(doc(db, 'transactions', id));
  };

  const deleteClient = async (id: string) => {
    await deleteDoc(doc(db, 'clients', id));
  };

  const executeFullWipe = async () => {
    const batch = writeBatch(db);
    transactions.forEach(t => batch.delete(doc(db, 'transactions', t.id)));
    clients.forEach(c => batch.delete(doc(db, 'clients', c.id)));
    equities.forEach(e => batch.delete(doc(db, 'equities', e.id)));
    salaryPayments.forEach(s => batch.delete(doc(db, 'salaries', s.id)));
    await batch.commit();
    console.log('🔥 SYSTEM WIPE COMPLETE');
  };

  const requestGlobalReset = async () => {
    if (!currentUser || !isAdmin) return;
    const confirm = window.confirm("Executing this will notify ALL other admins. They must approve before the wipe happens. Proceed?");
    if (!confirm) return;

    try {
      const requestId = crypto.randomUUID();
      const adminCount = users.filter(u => u.role === 'admin').length;
      
      await setDoc(doc(db, 'reset_requests', requestId), {
        id: requestId,
        requestedBy: currentUser.id,
        requestedByName: currentUser.displayName,
        approvals: [currentUser.id],
        status: 'pending',
        createdAt: Timestamp.now(),
        requiredApprovals: adminCount
      });

      // Notify other admins
      const otherAdmins = users.filter(u => u.role === 'admin' && u.id !== currentUser.id);
      for (const admin of otherAdmins) {
        await addNotification({
          type: 'reset_request',
          message: `${currentUser.displayName} is requesting a FULL SYSTEM RESET. Approval required.`,
          targetUserId: admin.id,
          resetRequestId: requestId,
          status: 'pending'
        });
      }
      alert("✅ Reset request sent to all admins.");
    } catch (err: any) {
      console.error("Reset Request Failed:", err);
      if (err.code === 'permission-denied') {
        alert("❌ MISSION FAILED: Firestore Permission Denied. Your administrator must update the Firestore Security Rules.");
      } else {
        alert("❌ Error: " + err.message);
      }
    }
  };

  const acceptResetRequest = async (requestId: string, notificationId: string) => {
    if (!currentUser || !isAdmin) return;

    try {
      // 1. Get current request
      const reqRef = doc(db, 'reset_requests', requestId);
      const snap = await getDoc(reqRef);
      if (!snap.exists()) return;

      const data = snap.data();
      if (data.approvals.includes(currentUser.id)) {
        alert("You have already approved this request.");
        return;
      }

      const newApprovals = [...data.approvals, currentUser.id];
      const isFullyApproved = newApprovals.length >= data.requiredApprovals;

      await updateDoc(reqRef, {
        approvals: newApprovals,
        status: isFullyApproved ? 'approved' : 'pending'
      });

      // Mark current notification as approved
      await updateDoc(doc(db, 'notifications', notificationId), { 
        status: 'approved', 
        isRead: true 
      });

      if (isFullyApproved) {
        await executeFullWipe();
        await updateDoc(reqRef, { status: 'completed' });
        alert("🔥 SYSTEM DATA WIPE COMPLETE.");
      } else {
        alert("✅ Approval registered. More approvals needed.");
      }
    } catch (err: any) {
       console.error("Approval Failed:", err);
       if (err.code === 'permission-denied') {
         alert("❌ Permission Denied by Firestore Rules.");
       }
    }
  };

  return (
    <FinanceContext.Provider value={{
      transactions, clients, equities, salaryPayments, isAdmin,
      addTransaction, addClient, addEquity, addSalaryPayment, deleteSalaryPayment,
      deleteTransaction, deleteClient, setIsAdmin, isLoaded,
      requestGlobalReset, acceptResetRequest, activeResetRequest

    }}>
      {children}
    </FinanceContext.Provider>
  );
}

export function useFinance() {
  const context = useContext(FinanceContext);
  if (context === undefined) {
    throw new Error('useFinance must be used within a FinanceProvider');
  }
  return context;
}
