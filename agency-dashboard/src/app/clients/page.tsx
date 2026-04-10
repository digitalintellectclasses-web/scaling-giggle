'use client';

import { useState } from 'react';
import { useFinance, Client } from '@/store/FinanceContext';
import { Users, AlertCircle, Plus, Trash2 } from 'lucide-react';
import { format, differenceInDays } from 'date-fns';

const formatINR = (amount: number) => {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);
};

export default function ClientManager() {
  const { clients, addClient, deleteClient, isLoaded } = useFinance();
  
  const [name, setName] = useState('');
  const [packageTier, setPackageTier] = useState('');
  const [externalCosts, setExternalCosts] = useState('');
  const [activationDate, setActivationDate] = useState(new Date().toISOString().split('T')[0]);
  const [expiryDate, setExpiryDate] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || isNaN(Number(packageTier))) return;
    
    await addClient({
      name,
      packageTier: Number(packageTier),
      externalCosts: Number(externalCosts) || 0,
      activationDate,
      expiryDate,
    });
    setName('');
    setPackageTier('');
    setExternalCosts('');
    setExpiryDate('');
  };

  const getExpiryStatus = (expiry: string) => {
    const today = new Date();
    // Assuming timezone IST logically since it's driven by local browser date matching IST requirement if deployed in India
    const expDate = new Date(expiry);
    const diff = differenceInDays(expDate, today);
    return diff;
  };

  if (!isLoaded) return null;

  return (
    <div className="space-y-6 pb-20 max-w-6xl mx-auto">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Client Manager</h1>
          <p className="text-zinc-400">Manage client subscriptions, track expiries, and calculate true margin.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        
        {/* Form */}
        <div className="col-span-1 border border-zinc-800 bg-zinc-900/40 rounded-2xl p-6 h-fit">
          <h2 className="text-xl font-semibold text-white mb-6">Add Client</h2>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-1">Company/Client Name</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="block w-full px-3 py-2.5 bg-zinc-900 border border-zinc-800 rounded-lg text-white focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                placeholder="Acme Corp"
              />
            </div>

            <div className="pt-2 border-t border-zinc-800/50">
              <label className="block text-sm font-medium text-zinc-400 mb-1">Package Tier (INR)</label>
              <input
                type="number"
                required
                value={packageTier}
                onChange={(e) => setPackageTier(e.target.value)}
                className="block w-full px-3 py-2.5 bg-zinc-900 border border-zinc-800 rounded-lg text-white focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                placeholder="50000"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-emerald-500 mb-1">External Costs (Ad Spend etc)</label>
              <input
                type="number"
                value={externalCosts}
                onChange={(e) => setExternalCosts(e.target.value)}
                className="block w-full px-3 py-2.5 bg-zinc-900 border border-emerald-900/50 rounded-lg text-white focus:ring-2 focus:ring-emerald-500 outline-none transition-all placeholder:text-zinc-600"
                placeholder="10000"
              />
              <p className="text-xs text-zinc-500 mt-1">Subtracted for "True Margin"</p>
            </div>

            <div className="pt-2 border-t border-zinc-800/50">
              <label className="block text-sm font-medium text-zinc-400 mb-1">Activation Date (IST)</label>
              <input
                type="date"
                required
                value={activationDate}
                onChange={(e) => setActivationDate(e.target.value)}
                className="block w-full px-3 py-2.5 bg-zinc-900 border border-zinc-800 rounded-lg text-white focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                style={{ colorScheme: 'dark' }}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-1">Expiry Date (IST)</label>
              <input
                type="date"
                required
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
                className="block w-full px-3 py-2.5 bg-zinc-900 border border-zinc-800 rounded-lg text-white focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                style={{ colorScheme: 'dark' }}
              />
            </div>

            <button
              type="submit"
              className="w-full mt-6 flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white py-2.5 rounded-lg font-medium transition-all shadow-lg shadow-emerald-900/20"
            >
              <Plus className="h-5 w-5" /> Add Client
            </button>
          </form>
        </div>

        {/* Clients Table */}
        <div className="col-span-1 lg:col-span-3 border border-zinc-800 bg-zinc-900/40 rounded-2xl overflow-hidden flex flex-col shadow-xl">
          <div className="p-6 border-b border-zinc-800 flex justify-between items-center bg-zinc-900/80">
            <h2 className="text-xl font-semibold text-white">Active Contracts</h2>
            <div className="flex gap-2">
              <span className="px-2 py-1 bg-red-500/10 text-red-500 text-xs rounded border border-red-500/20 font-medium">{"< 5 Days Expiry"}</span>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-zinc-900 text-zinc-400">
                <tr>
                  <th className="px-6 py-4 font-medium">Client Name</th>
                  <th className="px-6 py-4 font-medium">Package Tier</th>
                  <th className="px-6 py-4 font-medium">Ext. Costs</th>
                  <th className="px-6 py-4 font-medium text-emerald-400">True Margin</th>
                  <th className="px-6 py-4 font-medium text-right">Expiry Logic</th>
                  <th className="px-6 py-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/50">
                {clients.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-12 text-zinc-500">
                      <Users className="h-10 w-10 mx-auto mb-3 opacity-20" />
                      No clients found. Add one to get started.
                    </td>
                  </tr>
                ) : (
                  clients.map(client => {
                    const diffDays = getExpiryStatus(client.expiryDate);
                    const isExpiring = diffDays <= 5;
                    const trueMargin = client.packageTier - client.externalCosts;
                    
                    return (
                      <tr key={client.id} className={`transition-colors hover:bg-zinc-800/30 ${isExpiring ? 'bg-red-500/5 border-l-2 border-l-red-500' : 'border-l-2 border-l-transparent'}`}>
                        <td className="px-6 py-4">
                          <div className="font-semibold text-white">{client.name}</div>
                          <div className="text-xs text-zinc-500">Joined {format(new Date(client.activationDate), 'MM/dd')}</div>
                        </td>
                        <td className="px-6 py-4 text-zinc-300">{formatINR(client.packageTier)}</td>
                        <td className="px-6 py-4 text-zinc-400">{formatINR(client.externalCosts)}</td>
                        <td className="px-6 py-4 text-emerald-400 font-bold">{formatINR(trueMargin)}</td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {isExpiring && <AlertCircle className="w-4 h-4 text-red-500 animate-pulse" />}
                            <span className={`font-medium ${isExpiring ? 'text-red-400' : 'text-zinc-300'}`}>
                              {diffDays < 0 ? `Expired ${Math.abs(diffDays)}d ago` : diffDays === 0 ? 'Expires Today' : `${diffDays} Days Left`}
                            </span>
                          </div>
                          <div className="text-xs text-zinc-500 mt-1">{format(new Date(client.expiryDate), 'MMM dd, yyyy')}</div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button 
                             onClick={() => deleteClient(client.id)}
                             className="p-2 text-zinc-500 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
                           >
                             <Trash2 className="h-4 w-4" />
                           </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}
