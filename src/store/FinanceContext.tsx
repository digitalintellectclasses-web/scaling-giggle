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
  managedBy: string;
  paymentMethod: 'cash' | 'online';
  clientId?: string;
  partner?: string;
};

export type Client = {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  packageTier: number;
  activationDate: string;
  expiryDate: string;
  externalCosts: number;
};

export type PartnerEquity = {
  id: string;
  partnerId: string;
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
  paidBy: string;
  paymentMethod: 'cash' | 'online';
  note: string;
};

type FinanceContextType = {
  transactions: Transaction[];
  transactionRequests: any[];
  clients: Client[];
  equities: PartnerEquity[];
  salaryPayments: SalaryPayment[];
  isAdmin: boolean;
  addTransaction: (tx: Omit<Transaction, 'id'>) => Promise<void>;
  addClient: (client: Omit<Client, 'id'>) => Promise<void>;
  addEquity: (equity: Omit<PartnerEquity, 'id'>, autoCreateTx?: boolean) => Promise<void>;
  addSalaryPayment: (sp: Omit<SalaryPayment, 'id'>) => Promise<void>;
  deleteSalaryPayment: (id: string) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
  deleteClient: (id: string) => Promise<void>;
  setIsAdmin: (val: boolean) => void;
  isLoaded: boolean;
  requestGlobalReset: () => Promise<void>;
  acceptResetRequest: (requestId: string, notificationId: string) => Promise<void>;
  requestTransaction: (tx: Omit<Transaction, 'id'>) => Promise<void>;
  approveTransaction: (requestId: string, notificationId: string) => Promise<void>;
  rejectTransaction: (requestId: string, notificationId: string) => Promise<void>;
  resetGuestData: () => void;
  guestResetSuccess: boolean;
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
  const [transactionRequests, setTransactionRequests] = useState<any[]>([]);
  const [guestResetSuccess, setGuestResetSuccess] = useState(false);

  const loadedRef = useRef({ tx: false, clients: false, equities: false, salaries: false });
  // Track the active Firestore unsub functions so we can restart them if needed
  const unsubRef = useRef<(() => void) | null>(null);
  // Tracks whether the guest has explicitly reset — prevents startFirestoreListeners
  // from re-populating mock data after an intentional wipe.
  const guestResetDoneRef = useRef(false);

  const checkAllLoaded = () => {
    const r = loadedRef.current;
    if (r.tx && r.clients && r.equities && r.salaries) {
      setIsLoaded(true);
    }
  };

  // Synchronize internal admin state with our reliable currentUser role
  useEffect(() => {
    if (currentUser) {
      setIsAdmin(currentUser.role === 'admin');
    } else {
      setIsAdmin(false);
    }
  }, [currentUser]);

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

    if (currentUser?.id === 'guest') {
      // Only load demo data on first entry. After an explicit reset we leave arrays empty.
      if (!guestResetDoneRef.current) {
        const mockDate = new Date().toISOString().split('T')[0];
        setTransactions([
          { id: '1', type: 'income', amount: 50000, category: 'Web Development', description: 'Website build for Tech Corp', date: mockDate, managedBy: 'John Doe', paymentMethod: 'online' },
          { id: '2', type: 'income', amount: 12000, category: 'SEO', description: 'Monthly SEO', date: mockDate, managedBy: 'Jane Smith', paymentMethod: 'cash' },
          { id: '3', type: 'expense', amount: 5000, category: 'Software', description: 'Cloud Services', date: mockDate, managedBy: 'John Doe', paymentMethod: 'online' }
        ]);
        setClients([
          { id: 'c1', name: 'Tech Corp', email: 'hello@techcorp.com', phone: '9876543210', packageTier: 1, activationDate: mockDate, expiryDate: '2026-12-31', externalCosts: 0 }
        ]);
        setEquities([]);
        setSalaryPayments([]);
      }
      loadedRef.current = { tx: true, clients: true, equities: true, salaries: true };
      checkAllLoaded();
      unsubRef.current = () => clearTimeout(forceLoadTimeout);
      return;
    }


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

    const unsubRequests = onSnapshot(
      query(collection(db, 'transaction_requests'), where('status', '==', 'pending')),
      (snapshot) => {
        setTransactionRequests(snapshot.docs.map(d => ({ ...d.data(), id: d.id })));
      }
    );

    unsubRef.current = () => {
      clearTimeout(forceLoadTimeout);
      unsubTx();
      unsubClients();
      unsubEquities();
      unsubSalaries();
      unsubReset();
      unsubRequests();
    };
  };

  // Main effect: wait for Firebase Auth, then start Firestore listeners.
  // hasValidAuth tracks whether we've successfully started listeners WITH auth.
  useEffect(() => {
    // Reset the guest-reset guard whenever the logged-in user changes
    guestResetDoneRef.current = false;

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
  }, [currentUser]);

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

  const generateSafeId = () => {
    return typeof crypto !== 'undefined' && crypto.randomUUID 
      ? crypto.randomUUID() 
      : Date.now().toString(36) + Math.random().toString(36).substring(2);
  };

  const addTransaction = async (tx: Omit<Transaction, 'id'>) => {
    if (!auth.currentUser && currentUser?.id !== 'guest') return;
    const id = generateSafeId();

    if (currentUser?.id === 'guest') {
      setTransactions(prev => [{ ...tx, id } as Transaction, ...prev]);
      alert("Guest Mode: Transaction simulated.");
      return;
    }

    try {
      // Strip undefined values — Firestore rejects them with invalid-argument
      const txData = Object.fromEntries(
        Object.entries({ ...tx, id }).filter(([, v]) => v !== undefined)
      );
      await setDoc(doc(db, 'transactions', id), txData);

      // Notify ALL other admins immediately — no approval needed
      const otherAdmins = users.filter(u => u.role === 'admin' && u.id !== currentUser?.id);
      for (const admin of otherAdmins) {
        await addNotification({
          type: 'transaction',
          message: `💰 ${currentUser?.displayName} added a ${tx.type}: "${tx.description}" — ${tx.type === 'income' ? '+' : '-'}₹${tx.amount} (${tx.paymentMethod}, ${tx.managedBy})`,
          targetUserId: admin.id,
          relatedId: id
        });
      }
    }
    catch (err: any) { console.error('Transaction write failed:', err.code); }
  };

  const addClient = async (client: Omit<Client, 'id'>) => {
    const id = generateSafeId();
    
    if (currentUser?.id === 'guest') {
      setClients(prev => [{ ...client, id } as Client, ...prev]);
      alert("Guest Mode: Client simulated.");
      return;
    }

    await setDoc(doc(db, 'clients', id), { ...client, id });
    const otherAdmins = users.filter(u => u.role === 'admin' && u.id !== currentUser?.id);
    for (const admin of otherAdmins) {
      await addNotification({
        type: 'system',
        message: `🤝 ${currentUser?.displayName} added a new client: "${client.name}"`,
        targetUserId: admin.id,
        relatedId: id
      });
    }
  };

  const addEquity = async (equity: Omit<PartnerEquity, 'id'>, autoCreateTx: boolean = true) => {
    const id = generateSafeId();
    
    if (currentUser?.id === 'guest') {
      setEquities(prev => [{ ...equity, id } as PartnerEquity, ...prev]);
      if (autoCreateTx) {
        setTransactions(prev => [{
          id: generateSafeId(),
          type: equity.type === 'investment' ? 'income' : 'expense',
          amount: equity.amount,
          category: equity.type === 'investment' ? 'Partner Investment' : 'Partner Drawing',
          description: `${equity.type === 'investment' ? 'Equity investment' : 'Drawing'} by ${equity.partnerId}`,
          date: equity.date || new Date().toISOString().split('T')[0],
          managedBy: equity.partnerId,
          paymentMethod: 'online',
        } as Transaction, ...prev]);
      }
      alert("Guest Mode: Equity simulated.");
      return;
    }

    await setDoc(doc(db, 'equities', id), { ...equity, id });

    // Auto-create a linked financial transaction so equity appears in financials
    if (autoCreateTx) {
      const txId = generateSafeId();
      const txType = equity.type === 'investment' ? 'income' : 'expense';
      const txCategory = equity.type === 'investment' ? 'Partner Investment' : 'Partner Drawing';
      const txDate = equity.date || new Date().toISOString().split('T')[0];
      await setDoc(doc(db, 'transactions', txId), {
        id: txId,
        type: txType,
        amount: equity.amount,
        category: txCategory,
        description: `${equity.type === 'investment' ? 'Equity investment' : 'Drawing'} by ${equity.partnerId}`,
        date: txDate,
        managedBy: equity.partnerId,
        paymentMethod: 'online',
        partner: equity.partnerId,
      });
    }

    const otherAdmins = users.filter(u => u.role === 'admin' && u.id !== currentUser?.id);
    for (const admin of otherAdmins) {
      await addNotification({
        type: 'transaction',
        message: `📊 ${currentUser?.displayName} recorded a partner equity ${equity.type}: ₹${equity.amount} (${equity.partnerId})`,
        targetUserId: admin.id,
        relatedId: id
      });
    }
  };

  const addSalaryPayment = async (sp: Omit<SalaryPayment, 'id'>) => {
    const id = generateSafeId();
    
    if (currentUser?.id === 'guest') {
      setSalaryPayments(prev => [{ ...sp, id } as SalaryPayment, ...prev]);
      alert("Guest Mode: Salary simulated.");
      return;
    }

    await setDoc(doc(db, 'salaries', id), { ...sp, id });
    // Notify the employee
    await addNotification({
      type: 'transaction',
      message: `💸 Salary paid for ${sp.month}: ₹${sp.amount} by ${sp.paidBy} (${sp.paymentMethod})`,
      targetUserId: sp.employeeUserId,
      relatedId: id
    });
    // Notify other admins
    const otherAdmins = users.filter(u => u.role === 'admin' && u.id !== currentUser?.id);
    for (const admin of otherAdmins) {
      await addNotification({
        type: 'transaction',
        message: `💸 ${currentUser?.displayName} paid salary to ${sp.employeeName}: ₹${sp.amount} for ${sp.month}`,
        targetUserId: admin.id,
        relatedId: id
      });
    }
  };

  const deleteSalaryPayment = async (id: string) => {
    if (currentUser?.id === 'guest') {
      setSalaryPayments(prev => prev.filter(s => s.id !== id));
      alert("Guest Mode: Salary deletion simulated.");
      return;
    }
    await deleteDoc(doc(db, 'salaries', id));
  };

  const deleteTransaction = async (id: string) => {
    if (currentUser?.id === 'guest') {
      setTransactions(prev => prev.filter(t => t.id !== id));
      alert("Guest Mode: Transaction deletion simulated.");
      return;
    }
    const tx = transactions.find(t => t.id === id);
    await deleteDoc(doc(db, 'transactions', id));
    if (tx) {
      const otherAdmins = users.filter(u => u.role === 'admin' && u.id !== currentUser?.id);
      for (const admin of otherAdmins) {
        await addNotification({
          type: 'transaction',
          message: `🗑️ ${currentUser?.displayName} deleted transaction: "${tx.description}" (${tx.type === 'income' ? '+' : '-'}₹${tx.amount})`,
          targetUserId: admin.id,
          relatedId: id
        });
      }
    }
  };

  const deleteClient = async (id: string) => {
    if (currentUser?.id === 'guest') {
      setClients(prev => prev.filter(c => c.id !== id));
      alert("Guest Mode: Client deletion simulated.");
      return;
    }
    await deleteDoc(doc(db, 'clients', id));
  };

  const executeFullWipe = async () => {
    const { getDocs } = await import('firebase/firestore');

    // Query each collection directly from Firestore — never rely on state arrays
    // because the approving user may not have loaded them in their session.
    const [txSnap, clientSnap, equitySnap, salarySnap] = await Promise.all([
      getDocs(collection(db, 'transactions')),
      getDocs(collection(db, 'clients')),
      getDocs(collection(db, 'equities')),
      getDocs(collection(db, 'salaries')),
    ]);

    // Firestore batches are limited to 500 writes — split into chunks
    const allDocs = [...txSnap.docs, ...clientSnap.docs, ...equitySnap.docs, ...salarySnap.docs];
    
    const chunkSize = 490;
    for (let i = 0; i < allDocs.length; i += chunkSize) {
      const batch = writeBatch(db);
      allDocs.slice(i, i + chunkSize).forEach(d => batch.delete(d.ref));
      await batch.commit();
    }

    console.log(`🔥 SYSTEM WIPE COMPLETE — ${allDocs.length} documents deleted.`);
  };

  const requestGlobalReset = async () => {
    if (!currentUser || !isAdmin) return;

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

  const requestTransaction = async (tx: Omit<Transaction, 'id'>) => {
    if (!currentUser || !isAdmin) return;
    
    try {
      const requestId = crypto.randomUUID();
      await setDoc(doc(db, 'transaction_requests', requestId), {
        id: requestId,
        proposedTransaction: tx,
        requestedBy: currentUser.id,
        requestedByName: currentUser.displayName,
        status: 'pending',
        createdAt: Timestamp.now()
      });

      // Notify other admins
      const otherAdmins = users.filter(u => u.role === 'admin' && u.id !== currentUser.id);
      for (const admin of otherAdmins) {
        await addNotification({
          type: 'transaction_request',
          message: `${currentUser.displayName} is requesting to add a ${tx.type}: ${tx.description} (${tx.type === 'income' ? '+' : '-'}${tx.amount})`,
          targetUserId: admin.id,
          transactionRequestId: requestId,
          status: 'pending'
        });
      }
      alert("✅ Transaction request sent for approval.");
    } catch (err: any) {
      console.error("Transaction Request Failed:", err);
      alert("❌ Error: " + err.message);
    }
  };

  const approveTransaction = async (requestId: string, notificationId: string) => {
    if (!currentUser || !isAdmin) return;

    try {
      const reqRef = doc(db, 'transaction_requests', requestId);
      const snap = await getDoc(reqRef);
      if (!snap.exists()) return;

      const data = snap.data();
      if (data.status !== 'pending') {
        alert("This request has already been processed.");
        return;
      }

      // 1. Add the actual transaction
      const txId = crypto.randomUUID();
      await setDoc(doc(db, 'transactions', txId), { 
        ...data.proposedTransaction, 
        id: txId 
      });

      // 2. Update request status
      await updateDoc(reqRef, { status: 'approved' });

      // 3. Update notification status
      await updateDoc(doc(db, 'notifications', notificationId), { 
        status: 'approved', 
        isRead: true 
      });

      alert("✅ Transaction approved and added.");
    } catch (err: any) {
      console.error("Approval Failed:", err);
      alert("❌ Error: " + err.message);
    }
  };

  const rejectTransaction = async (requestId: string, notificationId: string) => {
    if (!currentUser || !isAdmin) return;

    try {
      await updateDoc(doc(db, 'transaction_requests', requestId), { status: 'rejected' });
      await updateDoc(doc(db, 'notifications', notificationId), { 
        status: 'rejected', 
        isRead: true 
      });
      alert("❌ Transaction request rejected.");
    } catch (err: any) {
      console.error("Rejection Failed:", err);
    }
  };

  const resetGuestData = () => {
    // Mark reset as done so startFirestoreListeners won't re-populate demo data
    guestResetDoneRef.current = true;

    // Wipe everything to zero — gives a completely blank slate for a fresh
    // trial calculation. The guest can now enter their own numbers from scratch.
    setTransactions([]);
    setClients([]);
    setEquities([]);
    setSalaryPayments([]);

    // Signal success via React state — window.alert/confirm are blocked in many
    // deployed / non-localhost environments and silently fail.
    setGuestResetSuccess(true);
    setTimeout(() => setGuestResetSuccess(false), 3000);
  };

  return (
    <FinanceContext.Provider value={{
      transactions, transactionRequests, clients, equities, salaryPayments, isAdmin,
      addTransaction, addClient, addEquity, addSalaryPayment, deleteSalaryPayment,
      deleteTransaction, deleteClient, setIsAdmin, isLoaded,
      requestGlobalReset, acceptResetRequest, activeResetRequest,
      requestTransaction, approveTransaction, rejectTransaction, resetGuestData, guestResetSuccess
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
