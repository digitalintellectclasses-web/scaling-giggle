'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { db } from '@/lib/firebase';
import { 
  collection, 
  onSnapshot, 
  doc, 
  setDoc, 
  deleteDoc, 
  query, 
  orderBy,
  writeBatch
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
  employeeUserId: string;   // username (e.g. "PRIYANKA")
  employeeName: string;     // display name
  amount: number;
  month: string;            // e.g. "2026-03"
  date: string;             // actual payment date
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
};

const FinanceContext = createContext<FinanceContextType | undefined>(undefined);

export function FinanceProvider({ children }: { children: React.ReactNode }) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [equities, setEquities] = useState<PartnerEquity[]>([]);
  const [salaryPayments, setSalaryPayments] = useState<SalaryPayment[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  // 1. Real-time Subscription to collections
  useEffect(() => {
    const unsubTx = onSnapshot(query(collection(db, 'transactions'), orderBy('date', 'desc')), 
      (snapshot) => {
        setTransactions(snapshot.docs.map(doc => ({ ...doc.data() as Transaction, id: doc.id })));
      },
      (err) => {
        console.error("Firestore Transactions Sync Error:", err);
      }
    );
  
    const unsubClients = onSnapshot(collection(db, 'clients'), 
      (snapshot) => {
        setClients(snapshot.docs.map(doc => ({ ...doc.data() as Client, id: doc.id })));
      },
      (err) => console.error("Firestore Clients Sync Error:", err)
    );
  
    const unsubEquities = onSnapshot(query(collection(db, 'equities'), orderBy('date', 'desc')), 
      (snapshot) => {
        setEquities(snapshot.docs.map(doc => ({ ...doc.data() as PartnerEquity, id: doc.id })));
      },
      (err) => console.error("Firestore Equities Sync Error:", err)
    );
  
    const unsubSalaries = onSnapshot(query(collection(db, 'salaries'), orderBy('date', 'desc')), 
      (snapshot) => {
        setSalaryPayments(snapshot.docs.map(doc => ({ ...doc.data() as SalaryPayment, id: doc.id })));
      },
      (err) => console.error("Firestore Salaries Sync Error:", err)
    );

    setIsLoaded(true);
    return () => {
      unsubTx();
      unsubClients();
      unsubEquities();
      unsubSalaries();
    };
  }, []);

  // 2. Migration Logic: First time load from LocalStorage and upload to Cloud
  useEffect(() => {
    const migrate = async () => {
      const localCheck = localStorage.getItem('ag_cloud_migrated');
      if (localCheck === 'true') return;

      const savedTx = localStorage.getItem('ag_transactions');
      const savedClients = localStorage.getItem('ag_clients');
      const savedEquities = localStorage.getItem('ag_equities');
      const savedSalaries = localStorage.getItem('ag_salaries');

      if (savedTx || savedClients || savedEquities || savedSalaries) {
        const batch = writeBatch(db);
        
        if (savedTx) JSON.parse(savedTx).forEach((t: Transaction) => batch.set(doc(db, 'transactions', t.id), t));
        if (savedClients) JSON.parse(savedClients).forEach((c: Client) => batch.set(doc(db, 'clients', c.id), c));
        if (savedEquities) JSON.parse(savedEquities).forEach((e: PartnerEquity) => batch.set(doc(db, 'equities', e.id), e));
        if (savedSalaries) JSON.parse(savedSalaries).forEach((s: SalaryPayment) => batch.set(doc(db, 'salaries', s.id), s));
        
        await batch.commit();
      }
      localStorage.setItem('ag_cloud_migrated', 'true');
    };
    
    migrate();
  }, []);

  const addTransaction = async (tx: Omit<Transaction, 'id'>) => {
    const id = crypto.randomUUID();
    try {
      await setDoc(doc(db, 'transactions', id), { ...tx, id });
    } catch (err: any) {
      console.error("Firestore Transaction Write Failed:", err);
    }
  };

  const addClient = async (client: Omit<Client, 'id'>) => {
    const id = crypto.randomUUID();
    await setDoc(doc(db, 'clients', id), { ...client, id });
  };

  const addEquity = async (equity: Omit<PartnerEquity, 'id'>) => {
    const id = crypto.randomUUID();
    await setDoc(doc(db, 'equities', id), { ...equity, id });
  };

  const addSalaryPayment = async (sp: Omit<SalaryPayment, 'id'>) => {
    const id = crypto.randomUUID();
    await setDoc(doc(db, 'salaries', id), { ...sp, id });
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

  return (
    <FinanceContext.Provider value={{ 
      transactions, clients, equities, salaryPayments, isAdmin,
      addTransaction, addClient, addEquity, addSalaryPayment, deleteSalaryPayment,
      deleteTransaction, deleteClient, setIsAdmin, isLoaded 
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

