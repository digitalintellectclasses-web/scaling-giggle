'use client';

import { useEffect, useState } from 'react';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Users, Mail, Phone, Building2, Calendar } from 'lucide-react';
import { useFinance } from '@/store/FinanceContext';
import { useRouter } from 'next/navigation';

type GuestLead = {
  id: string;
  name: string;
  email: string;
  phone: string;
  company: string;
  date: string;
};

export default function GuestLeadsPage() {
  const [leads, setLeads] = useState<GuestLead[]>([]);
  const { isAdmin } = useFinance();
  const router = useRouter();

  useEffect(() => {
    if (!isAdmin) {
      router.replace('/');
      return;
    }

    const q = query(collection(db, 'guestLeads'), orderBy('date', 'desc'));
    const unsub = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => doc.data() as GuestLead);
      setLeads(data);
    });

    return () => unsub();
  }, [isAdmin, router]);

  if (!isAdmin) return null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black text-white tracking-tight">Guest Leads</h1>
        <p className="text-sm text-zinc-400 mt-1">
          Prospective clients who tested the Finance Management Software.
        </p>
      </div>

      <div className="grid gap-4">
        {leads.length === 0 ? (
          <div className="text-center py-12 bg-zinc-900/40 rounded-2xl border border-zinc-800">
            <Users className="w-8 h-8 text-zinc-500 mx-auto mb-3" />
            <p className="text-zinc-400 font-medium">No guest leads yet</p>
          </div>
        ) : (
          leads.map((lead) => (
            <div key={lead.id} className="bg-zinc-900/60 border border-zinc-800 p-5 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
                  <span className="text-emerald-400 font-bold text-lg">{lead.name.charAt(0).toUpperCase()}</span>
                </div>
                <div>
                  <h3 className="text-white font-bold text-lg">{lead.name}</h3>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-sm text-zinc-400">
                    <span className="flex items-center gap-1.5"><Building2 className="w-3.5 h-3.5" /> {lead.company}</span>
                    <span className="flex items-center gap-1.5"><Mail className="w-3.5 h-3.5" /> <a href={`mailto:${lead.email}`} className="hover:text-emerald-400">{lead.email}</a></span>
                    <span className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5" /> <a href={`tel:${lead.phone}`} className="hover:text-emerald-400">{lead.phone}</a></span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs text-zinc-500 bg-zinc-950 px-3 py-1.5 rounded-full whitespace-nowrap self-start md:self-auto">
                <Calendar className="w-3 h-3" />
                {new Date(lead.date).toLocaleString()}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
