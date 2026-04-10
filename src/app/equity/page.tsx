'use client';

import { useState } from 'react';
import { useFinance } from '@/store/FinanceContext';
import { Landmark, ArrowUpRight, ArrowDownRight, IndianRupee } from 'lucide-react';
import { format } from 'date-fns';

const formatINR = (amount: number) => {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);
};

export default function EquityLedger() {
  const { equities, addEquity, isAdmin, isLoaded } = useFinance();
  
  const [partnerId, setPartnerId] = useState<'Pratik' | 'Pranav'>('Pratik');
  const [type, setType] = useState<'investment' | 'drawing'>('investment');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || isNaN(Number(amount))) return;
    
    await addEquity({
      partnerId,
      type,
      amount: Number(amount),
      date,
    });
    setAmount('');
  };

  const getPartnerStats = (pid: 'Pratik' | 'Pranav') => {
    const partnerEquities = equities.filter(e => e.partnerId === pid);
    const totalInvestment = partnerEquities.filter(e => e.type === 'investment').reduce((acc, curr) => acc + curr.amount, 0);
    const totalDrawing = partnerEquities.filter(e => e.type === 'drawing').reduce((acc, curr) => acc + curr.amount, 0);
    const balance = totalInvestment - totalDrawing;
    const recoupPercentage = totalInvestment > 0 ? Math.min((totalDrawing / totalInvestment) * 100, 100) : 0;

    return { totalInvestment, totalDrawing, balance, recoupPercentage };
  };

  const statsPratik = getPartnerStats('Pratik');
  const statsPranav = getPartnerStats('Pranav');

  if (!isLoaded) return null;

  if (!isAdmin) {
    return (
      <div className="flex h-full items-center justify-center pt-32">
        <div className="bg-zinc-900/50 border border-red-500/20 p-8 rounded-2xl text-center max-w-sm">
          <Landmark className="w-12 h-12 text-red-500/50 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">Restricted Access</h2>
          <p className="text-zinc-400 text-sm">You must be in Admin Mode to view Partner Equity Ledgers.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20 max-w-6xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Partner Equity</h1>
        <p className="text-zinc-400">Track investments, drawings, and calculate real-time equity balances for Pratik and Pranav.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* Pratik Card */}
        <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl p-6 relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-white">Pratik</h2>
            <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-400 font-bold">50%</div>
          </div>
          
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-zinc-400 text-sm">Equity Balance</span>
              <span className="text-2xl font-bold text-white">{formatINR(statsPratik.balance)}</span>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                <span className="text-zinc-500 text-xs block mb-1">Total Investments</span>
                <span className="text-emerald-400 font-semibold">{formatINR(statsPratik.totalInvestment)}</span>
              </div>
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                <span className="text-zinc-500 text-xs block mb-1">Total Drawings</span>
                <span className="text-red-400 font-semibold">{formatINR(statsPratik.totalDrawing)}</span>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-zinc-800/50">
               <div className="flex justify-between text-xs mb-2">
                 <span className="text-zinc-400">Capital Recouped</span>
                 <span className="text-emerald-400 font-medium">{statsPratik.recoupPercentage.toFixed(1)}%</span>
               </div>
               <div className="w-full bg-zinc-900 rounded-full h-2.5 overflow-hidden border border-zinc-800">
                 <div className="bg-emerald-500 h-2.5 rounded-full transition-all duration-500" style={{ width: `${statsPratik.recoupPercentage}%` }}></div>
               </div>
            </div>
          </div>
        </div>

        {/* Pranav Card */}
        <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl p-6 relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-white">Pranav</h2>
            <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400 font-bold">50%</div>
          </div>
          
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-zinc-400 text-sm">Equity Balance</span>
              <span className="text-2xl font-bold text-white">{formatINR(statsPranav.balance)}</span>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                <span className="text-zinc-500 text-xs block mb-1">Total Investments</span>
                <span className="text-emerald-400 font-semibold">{formatINR(statsPranav.totalInvestment)}</span>
              </div>
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                <span className="text-zinc-500 text-xs block mb-1">Total Drawings</span>
                <span className="text-red-400 font-semibold">{formatINR(statsPranav.totalDrawing)}</span>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-zinc-800/50">
               <div className="flex justify-between text-xs mb-2">
                 <span className="text-zinc-400">Capital Recouped</span>
                 <span className="text-blue-400 font-medium">{statsPranav.recoupPercentage.toFixed(1)}%</span>
               </div>
               <div className="w-full bg-zinc-900 rounded-full h-2.5 overflow-hidden border border-zinc-800">
                 <div className="bg-blue-500 h-2.5 rounded-full transition-all duration-500" style={{ width: `${statsPranav.recoupPercentage}%` }}></div>
               </div>
            </div>
          </div>
        </div>

      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pt-8">
        
        {/* Form */}
        <div className="col-span-1 border border-zinc-800 bg-zinc-900/40 rounded-2xl p-6 h-fit">
          <h2 className="text-xl font-semibold text-white mb-6">Record Flow</h2>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-2 p-1 bg-zinc-900 border border-zinc-800 rounded-lg mb-6">
              <button
                type="button"
                className={`py-2 text-sm font-medium rounded-md transition-all ${partnerId === 'Pratik' ? 'bg-zinc-700 text-white' : 'text-zinc-400 hover:text-white'}`}
                onClick={() => setPartnerId('Pratik')}
              >
                Pratik
              </button>
              <button
                type="button"
                className={`py-2 text-sm font-medium rounded-md transition-all ${partnerId === 'Pranav' ? 'bg-zinc-700 text-white' : 'text-zinc-400 hover:text-white'}`}
                onClick={() => setPartnerId('Pranav')}
              >
                Pranav
              </button>
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-1">Type</label>
              <select
                value={type}
                onChange={(e: any) => setType(e.target.value)}
                className="block w-full px-3 py-2.5 bg-zinc-900 border border-zinc-800 rounded-lg text-white focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
              >
                <option value="investment">Investment (Cash In)</option>
                <option value="drawing">Drawing (Cash Out)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-1">Amount (INR)</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="text-zinc-500 sm:text-sm">₹</span>
                </div>
                <input
                  type="number"
                  required
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="block w-full pl-8 py-2.5 bg-zinc-900 border border-zinc-800 rounded-lg text-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
                  placeholder="0.00"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-1">Date</label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="block w-full px-3 py-2.5 bg-zinc-900 border border-zinc-800 rounded-lg text-white focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                style={{ colorScheme: 'dark' }}
              />
            </div>

            <button
              type="submit"
              className="w-full mt-6 flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white py-2.5 rounded-lg font-medium transition-all shadow-lg shadow-emerald-900/20"
            >
              <Landmark className="h-5 w-5" /> Record Equity
            </button>
          </form>
        </div>

        {/* Ledger */}
        <div className="col-span-1 lg:col-span-2 border border-zinc-800 bg-zinc-900/40 rounded-2xl p-6 overflow-hidden flex flex-col h-[500px]">
          <h2 className="text-xl font-semibold text-white mb-6">Equity Log</h2>
          
          <div className="flex-1 overflow-y-auto pr-2 space-y-3">
             {equities.length === 0 ? (
               <div className="h-full flex flex-col items-center justify-center text-zinc-500">
                 <Landmark className="h-12 w-12 mb-4 opacity-20" />
                 <p>No equity records yet.</p>
               </div>
             ) : (
               equities.slice().reverse().map((eq) => (
                 <div key={eq.id} className="flex items-center justify-between p-4 bg-zinc-900/50 border border-zinc-800 rounded-xl">
                   <div className="flex items-center gap-4">
                     <div className={`p-2 rounded-lg ${eq.type === 'investment' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                       {eq.type === 'investment' ? <ArrowUpRight className="h-5 w-5" /> : <ArrowDownRight className="h-5 w-5" />}
                     </div>
                     <div className="flex flex-col">
                       <span className="text-white font-medium">{eq.partnerId}</span>
                       <span className="text-zinc-400 text-sm">{eq.type === 'investment' ? 'Investment' : 'Drawing'} • {format(new Date(eq.date), 'MMM dd, yyyy')}</span>
                     </div>
                   </div>
                   <div className={`font-semibold text-lg ${eq.type === 'investment' ? 'text-emerald-400' : 'text-zinc-100'}`}>
                     {eq.type === 'investment' ? '+' : '-'}{formatINR(eq.amount)}
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
