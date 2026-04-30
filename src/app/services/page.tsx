'use client';

import { useState } from 'react';
import { useFinance } from '@/store/FinanceContext';
import { useQuote } from '@/store/QuoteContext';
import { Plus, Trash2, Edit2, Check, X, Component } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function ServicesPage() {
  const { isAdmin, isLoaded } = useFinance();
  const { services, addService, updateService, deleteService } = useQuote();
  const router = useRouter();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [rate, setRate] = useState('');
  const [unit, setUnit] = useState('per project');
  const [successMsg, setSuccessMsg] = useState('');

  if (!isLoaded) return <div className="h-full w-full flex items-center justify-center"><div className="animate-spin h-8 w-8 border-2 border-emerald-500 rounded-full border-t-transparent"></div></div>;

  if (!isAdmin) {
    router.push('/work');
    return null;
  }

  const handleAddService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !rate) return;
    try {
      await addService({
        name,
        description,
        rate: Number(rate),
        unit
      });
      setName('');
      setDescription('');
      setRate('');
      setSuccessMsg('Service added successfully!');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Services & Rates</h1>
          <p className="text-zinc-400">Configure standard services and pricing for quotations.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="col-span-1 lg:col-span-1 bg-zinc-900/40 border border-zinc-800 rounded-2xl p-6 h-fit">
          <div className="flex items-center gap-2 mb-6">
            <Component className="h-5 w-5 text-emerald-500" />
            <h2 className="text-xl font-semibold text-white">Add New Service</h2>
          </div>
          <form onSubmit={handleAddService} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1">Service Name</label>
              <input required value={name} onChange={e => setName(e.target.value)}
                className="block w-full px-3 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-white focus:ring-2 focus:ring-emerald-500 outline-none transition-all text-sm"
                placeholder="e.g. Logo Design" />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1">Description</label>
              <textarea value={description} onChange={e => setDescription(e.target.value)}
                className="block w-full px-3 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-white focus:ring-2 focus:ring-emerald-500 outline-none transition-all text-sm resize-none"
                placeholder="Brief description of the service..." rows={3} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">Rate (₹)</label>
                <input required type="number" value={rate} onChange={e => setRate(e.target.value)}
                  className="block w-full px-3 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-white focus:ring-2 focus:ring-emerald-500 outline-none transition-all text-sm"
                  placeholder="0.00" />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">Unit</label>
                <select value={unit} onChange={e => setUnit(e.target.value)}
                  className="block w-full px-3 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-white focus:ring-2 focus:ring-emerald-500 outline-none transition-all text-sm">
                  <option value="per project">Per Project</option>
                  <option value="per hour">Per Hour</option>
                  <option value="per month">Per Month</option>
                  <option value="per item">Per Item</option>
                </select>
              </div>
            </div>

            {successMsg && (
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-sm text-emerald-400 text-center">
                {successMsg}
              </div>
            )}

            <button type="submit"
              className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white py-2.5 rounded-lg font-medium transition-all shadow-lg shadow-emerald-900/20 mt-4">
              <Plus className="h-4 w-4" /> Save Service
            </button>
          </form>
        </div>

        <div className="col-span-1 lg:col-span-2 bg-zinc-900/40 border border-zinc-800 rounded-2xl p-6">
          <h2 className="text-xl font-semibold text-white mb-6">Service Catalog</h2>
          <div className="space-y-3">
            {services.length === 0 ? (
              <div className="p-8 text-center text-zinc-500 bg-zinc-900/50 rounded-xl border border-zinc-800 border-dashed">
                No services configured yet.
              </div>
            ) : (
              services.map(service => (
                <div key={service.id} className="p-4 bg-zinc-900/60 border border-zinc-800 rounded-xl flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-white">{service.name}</h3>
                    {service.description && <p className="text-xs text-zinc-400 mt-1">{service.description}</p>}
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="font-bold text-emerald-400">₹{service.rate.toLocaleString('en-IN')}</p>
                      <p className="text-[10px] text-zinc-500 uppercase">{service.unit}</p>
                    </div>
                    <button 
                      onClick={() => deleteService(service.id)}
                      className="p-2 hover:bg-red-500/10 text-zinc-500 hover:text-red-500 rounded-lg transition-colors"
                      title="Delete Service"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
