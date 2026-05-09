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

export interface PdfConfig {
  agencyName: string;
  address: string;
  contact: string;
  footerText: string;
  website: string;
}

interface QuoteContextType {
  services: Service[];
  quotations: Quotation[];
  pdfConfig: PdfConfig;
  addService: (service: Omit<Service, 'id'>) => Promise<void>;
  updateService: (id: string, updates: Partial<Service>) => Promise<void>;
  deleteService: (id: string) => Promise<void>;
  addQuotation: (quotation: Omit<Quotation, 'id'>) => Promise<void>;
  updateQuotationStatus: (id: string, status: Quotation['status']) => Promise<void>;
  updateQuotationPayment: (id: string, updates: { paymentStatus: 'unpaid' | 'partial' | 'paid', amountPaid: number }) => Promise<void>;
  deleteQuotation: (id: string) => Promise<void>;
  updatePdfConfig: (updates: Partial<PdfConfig>) => Promise<void>;
}

const QuoteContext = createContext<QuoteContextType | undefined>(undefined);

const DEFAULT_PDF_CONFIG: PdfConfig = {
  agencyName: 'PRIME CREATIVE',
  address: '123 Innovation Way, Suite 500\nTech District, Mumbai 400001',
  contact: '+91 98765 43210 | hello@primecreative.com',
  footerText: 'Thank you for choosing Prime Creative Agency.',
  website: 'www.primecreative.com'
};

export function QuoteProvider({ children }: { children: React.ReactNode }) {
  const { currentUser, users } = useAuth();
  const { addNotification } = useNotifications();
  const [services, setServices] = useState<Service[]>([]);
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [pdfConfig, setPdfConfig] = useState<PdfConfig>(DEFAULT_PDF_CONFIG);

  useEffect(() => {
    if (!currentUser) return;

    if (currentUser.id === 'guest') {
      setServices([
        { id: 's1', name: 'Web Development', description: 'Custom website build', rate: 50000, unit: 'project' },
        { id: 's2', name: 'SEO Retainer', description: 'Monthly SEO optimization', rate: 12000, unit: 'month' }
      ]);
      setQuotations([
        { id: 'q1', clientId: 'c1', clientName: 'Tech Corp', createdBy: 'guest', createdByName: 'Guest', date: new Date().toISOString(), expiryDate: new Date(Date.now() + 15*86400000).toISOString(), items: [{ serviceId: 's1', serviceName: 'Web Development', description: 'Custom website build', quantity: 1, rate: 50000, amount: 50000 }], subtotal: 50000, tax: 9000, total: 59000, status: 'sent', paymentStatus: 'unpaid', amountPaid: 0 }
      ]);
      setPdfConfig(DEFAULT_PDF_CONFIG);
      return;
    }

    const unsubServices = onSnapshot(collection(db, 'services'), (snap) => {
      const s = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Service));
      setServices(s);
    });

    const unsubQuotations = onSnapshot(collection(db, 'quotations'), (snap) => {
      const q = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Quotation));
      setQuotations(q.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
    });

    const unsubConfig = onSnapshot(doc(db, 'config', 'pdf'), (snap) => {
      if (snap.exists()) {
        setPdfConfig({ ...DEFAULT_PDF_CONFIG, ...snap.data() });
      }
    });

    return () => {
      unsubServices();
      unsubQuotations();
      unsubConfig();
    };
  }, [currentUser]);

  const addService = async (service: Omit<Service, 'id'>) => {
    const id = crypto.randomUUID();
    if (currentUser?.id === 'guest') {
      setServices(prev => [{ ...service, id } as Service, ...prev]);
      alert('Guest Mode: Service added.');
      return;
    }
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
    if (currentUser?.id === 'guest') {
      setQuotations(prev => [{ ...quotation, id } as Quotation, ...prev]);
      alert('Guest Mode: Quotation saved.');
      return;
    }
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
    if (currentUser?.id === 'guest') {
      setQuotations(prev => prev.map(q => q.id === id ? { ...q, status } : q));
      return;
    }
    await updateDoc(doc(db, 'quotations', id), { status });
  };

  const updateQuotationPayment = async (id: string, updates: { paymentStatus: 'unpaid' | 'partial' | 'paid', amountPaid: number }) => {
    if (currentUser?.id === 'guest') {
      setQuotations(prev => prev.map(q => q.id === id ? { ...q, ...updates } : q));
      return;
    }
    await updateDoc(doc(db, 'quotations', id), updates);
  };

  const deleteQuotation = async (id: string) => {
    if (currentUser?.id === 'guest') {
      setQuotations(prev => prev.filter(q => q.id !== id));
      return;
    }
    await deleteDoc(doc(db, 'quotations', id));
  };

  const updatePdfConfig = async (updates: Partial<PdfConfig>) => {
    if (currentUser?.id === 'guest') {
      setPdfConfig(prev => ({ ...prev, ...updates }));
      return;
    }
    await setDoc(doc(db, 'config', 'pdf'), updates, { merge: true });
  };

  return (
    <QuoteContext.Provider value={{
      services, quotations, pdfConfig,
      addService, updateService, deleteService,
      addQuotation, updateQuotationStatus, updateQuotationPayment, deleteQuotation,
      updatePdfConfig
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
