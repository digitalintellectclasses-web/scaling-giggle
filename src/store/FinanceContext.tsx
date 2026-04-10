'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

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
  addTransaction: (tx: Omit<Transaction, 'id'>) => void;
  addClient: (client: Omit<Client, 'id'>) => void;
  addEquity: (equity: Omit<PartnerEquity, 'id'>) => void;
  addSalaryPayment: (sp: Omit<SalaryPayment, 'id'>) => void;
  deleteSalaryPayment: (id: string) => void;
  deleteTransaction: (id: string) => void;
  deleteClient: (id: string) => void;
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

  // Load from local storage
  useEffect(() => {
    const savedTransactions = localStorage.getItem('ag_transactions');
    const savedClients = localStorage.getItem('ag_clients');
    const savedEquities = localStorage.getItem('ag_equities');
    const savedSalaries = localStorage.getItem('ag_salaries');

    if (savedTransactions) setTransactions(JSON.parse(savedTransactions));
    if (savedClients) setClients(JSON.parse(savedClients));
    if (savedEquities) setEquities(JSON.parse(savedEquities));
    if (savedSalaries) setSalaryPayments(JSON.parse(savedSalaries));
    
    setIsLoaded(true);
  }, []);

  // Save to local storage
  useEffect(() => {
    if (!isLoaded) return;
    localStorage.setItem('ag_transactions', JSON.stringify(transactions));
    localStorage.setItem('ag_clients', JSON.stringify(clients));
    localStorage.setItem('ag_equities', JSON.stringify(equities));
    localStorage.setItem('ag_salaries', JSON.stringify(salaryPayments));
  }, [transactions, clients, equities, salaryPayments, isLoaded]);

  const addTransaction = (tx: Omit<Transaction, 'id'>) => {
    setTransactions((prev) => [...prev, { ...tx, id: crypto.randomUUID() }]);
  };

  const addClient = (client: Omit<Client, 'id'>) => {
    setClients((prev) => [...prev, { ...client, id: crypto.randomUUID() }]);
  };

  const addEquity = (equity: Omit<PartnerEquity, 'id'>) => {
    setEquities((prev) => [...prev, { ...equity, id: crypto.randomUUID() }]);
  };

  const addSalaryPayment = (sp: Omit<SalaryPayment, 'id'>) => {
    setSalaryPayments((prev) => [...prev, { ...sp, id: crypto.randomUUID() }]);
  };

  const deleteSalaryPayment = (id: string) => {
    setSalaryPayments((prev) => prev.filter(s => s.id !== id));
  };

  const deleteTransaction = (id: string) => {
    setTransactions((prev) => prev.filter(t => t.id !== id));
  };

  const deleteClient = (id: string) => {
    setClients((prev) => prev.filter(c => c.id !== id));
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
