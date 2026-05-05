'use client';

import { createContext, useContext, useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, doc, setDoc, updateDoc, deleteDoc, Timestamp } from 'firebase/firestore';
import { useAuth } from './AuthContext';
import { useNotifications } from './NotificationContext';

export interface Service {
  id: string;
  name: string;
  description: string;
  rate: number;
  unit: string;
}

export interface QuoteItem {
  serviceId: string;
  serviceName: string;
  description: string;
  quantity: number;
  rate: number;
  amount: number;
}

export interface Quotation {
  id: string;
  clientId: string;
  clientName: string;
  createdBy: string;
  createdByName: string;
  date: string;
  expiryDate: string;
  items: QuoteItem[];
  subtotal: number;
  tax: number;
  total: number;
  status: 'draft' | 'sent' | 'accepted' | 'rejected';
  notes?: string;
  paymentStatus?: 'unpaid' | 'partial' | 'paid';
  amountPaid?: number;
  dueDate?: string;
}

interface QuoteContextType {
  services: Service[];
  quotations: Quotation[];
  addService: (service: Omit<Service, 'id'>) => Promise<void>;
  updateService: (id: string, updates: Partial<Service>) => Promise<void>;
  deleteService: (id: string) => Promise<void>;
  addQuotation: (quotation: Omit<Quotation, 'id'>) => Promise<void>;
  updateQuotationStatus: (id: string, status: Quotation['status']) => Promise<void>;
  updateQuotationPayment: (id: string, updates: { paymentStatus: 'unpaid' | 'partial' | 'paid', amountPaid: number }) => Promise<void>;
  deleteQuotation: (id: string) => Promise<void>;
}

const QuoteContext = createContext<QuoteContextType | undefined>(undefined);

export function QuoteProvider({ children }: { children: React.ReactNode }) {
  const { currentUser, users } = useAuth();
  const { addNotification } = useNotifications();
  const [services, setServices] = useState<Service[]>([]);
  const [quotations, setQuotations] = useState<Quotation[]>([]);

  useEffect(() => {
    if (!currentUser) return;

    const unsubServices = onSnapshot(collection(db, 'services'), (snap) => {
      const s = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Service));
      setServices(s);
    });

    const unsubQuotations = onSnapshot(collection(db, 'quotations'), (snap) => {
      const q = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Quotation));
      setQuotations(q.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
    });

    return () => {
      unsubServices();
      unsubQuotations();
    };
  }, [currentUser]);

  const addService = async (service: Omit<Service, 'id'>) => {
    const id = crypto.randomUUID();
    await setDoc(doc(db, 'services', id), service);
  };

  const updateService = async (id: string, updates: Partial<Service>) => {
    await updateDoc(doc(db, 'services', id), updates);
  };

  const deleteService = async (id: string) => {
    await deleteDoc(doc(db, 'services', id));
  };

  const addQuotation = async (quotation: Omit<Quotation, 'id'>) => {
    const id = crypto.randomUUID();
    await setDoc(doc(db, 'quotations', id), quotation);

    if (currentUser) {
      const otherAdmins = users.filter(u => u.role === 'admin' && u.id !== currentUser.id);
      for (const admin of otherAdmins) {
        await addNotification({
          type: 'work',
          message: `📄 ${currentUser.displayName} created a quotation for ${quotation.clientName} (Total: ₹${quotation.total})`,
          targetUserId: admin.id,
          relatedId: id
        });
      }
    }
  };

  const updateQuotationStatus = async (id: string, status: Quotation['status']) => {
    await updateDoc(doc(db, 'quotations', id), { status });
  };

  const updateQuotationPayment = async (id: string, updates: { paymentStatus: 'unpaid' | 'partial' | 'paid', amountPaid: number }) => {
    await updateDoc(doc(db, 'quotations', id), updates);
  };

  const deleteQuotation = async (id: string) => {
    await deleteDoc(doc(db, 'quotations', id));
  };

  return (
    <QuoteContext.Provider value={{
      services, quotations,
      addService, updateService, deleteService,
      addQuotation, updateQuotationStatus, updateQuotationPayment, deleteQuotation
    }}>
      {children}
    </QuoteContext.Provider>
  );
}

export const useQuote = () => {
  const context = useContext(QuoteContext);
  if (!context) throw new Error('useQuote must be used within a QuoteProvider');
  return context;
};
