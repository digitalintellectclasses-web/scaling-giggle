'use client';

import { useState } from 'react';
import { useFinance } from '@/store/FinanceContext';
import { Plus, Trash2, IndianRupee, Wallet } from 'lucide-react';
import { format } from 'date-fns';

const formatINR = (amount: number) => {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);
};

export default function FinancialTracking() {
  const { transactions, addTransaction, deleteTransaction, isAdmin, isLoaded } = useFinance();
  
  const [type, setType] = useState<'income' | 'expense'>('income');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('Service Retainer');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  
  // New Admin Fields
  const [managedBy, setManagedBy] = useState<'Pratik' | 'Pranav'>('Pratik');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'online'>('online');

  const INCOME_CATEGORIES = ['Service Retainer', 'Project Fee', 'Consulting', 'Other'];
  const EXPENSE_CATEGORIES = ['Software & Tools', 'Ad Spend', 'Rent & Utilities', 'Freelance/Contractors', 'Payroll', 'Other'];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || isNaN(Number(amount))) return;
    
    await addTransaction({
      type,
      amount: Number(amount),
      category,
      description,
      date,
      managedBy,
      paymentMethod,
    });

    setAmount('');
    setDescription('');
  };

  if (!isLoaded) return null;

  if (!isAdmin) {
    return (
      <div className="flex h-full items-center justify-center pt-32">
        <div className="bg-zinc-900/50 border border-red-500/20 p-8 rounded-2xl text-center max-w-sm">
          <Wallet className="w-12 h-12 text-red-500/50 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">Restricted Access</h2>
          <p className="text-zinc-400 text-sm">You must be in Admin Mode to view and edit Financials.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20 max-w-6xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Financial Tracking</h1>
        <p className="text-zinc-400">Log new income or expenses and manage transaction pipelines handled by partners.</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
        
        {/* Entry Form */}
        <div className="col-span-1 xl:col-span-1 border border-zinc-800 bg-zinc-900/40 rounded-2xl p-6 h-fit">
          <h2 className="text-xl font-semibold text-white mb-6">New Entry</h2>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            
            <div className="grid grid-cols-2 gap-2 p-1 bg-zinc-900 border border-zinc-800 rounded-lg mb-4">
              <button
                type="button"
                className={`py-2 text-sm font-medium rounded-md transition-all ${type === 'income' ? 'bg-emerald-500/10 text-emerald-500' : 'text-zinc-400 hover:text-white'}`}
                onClick={() => { setType('income'); setCategory(INCOME_CATEGORIES[0]); }}
              >
                Income
              </button>
              <button
                type="button"
                className={`py-2 text-sm font-medium rounded-md transition-all ${type === 'expense' ? 'bg-red-500/10 text-red-500' : 'text-zinc-400 hover:text-white'}`}
                onClick={() => { setType('expense'); setCategory(EXPENSE_CATEGORIES[0]); }}
              >
                Expense
              </button>
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
              <label className="block text-sm font-medium text-zinc-400 mb-1">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="block w-full px-3 py-2.5 bg-zinc-900 border border-zinc-800 rounded-lg text-white focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
              >
                {(type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES).map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">Managed By</label>
                <select
                  value={managedBy}
                  onChange={(e: any) => setManagedBy(e.target.value)}
                  className="block w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-white text-sm focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                >
                  <option value="Pratik">Pratik</option>
                  <option value="Pranav">Pranav</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">Payment Method</label>
                <select
                  value={paymentMethod}
                  onChange={(e: any) => setPaymentMethod(e.target.value)}
                  className="block w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-white text-sm focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                >
                  <option value="online">Online</option>
                  <option value="cash">Cash</option>
                </select>
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

            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-1">Description</label>
              <input
                type="text"
                required
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="block w-full px-3 py-2.5 bg-zinc-900 border border-zinc-800 rounded-lg text-white focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                placeholder="Brief notes..."
              />
            </div>

            <button
              type="submit"
              className="w-full mt-6 flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white py-2.5 rounded-lg font-medium transition-all shadow-lg shadow-emerald-900/20"
            >
              <Plus className="h-5 w-5" /> Add Transaction
            </button>

          </form>
        </div>

        {/* Ledger */}
        <div className="col-span-1 xl:col-span-3 border border-zinc-800 bg-zinc-900/40 rounded-2xl p-6 overflow-hidden flex flex-col h-[700px]">
          <h2 className="text-xl font-semibold text-white mb-6">Recent Transactions</h2>
          
          <div className="flex-1 overflow-y-auto pr-2 space-y-3">
             {transactions.length === 0 ? (
               <div className="h-full flex flex-col items-center justify-center text-zinc-500">
                 <IndianRupee className="h-12 w-12 mb-4 opacity-20" />
                 <p>No transactions yet.</p>
               </div>
             ) : (
               transactions.slice().reverse().map((tx) => (
                 <div key={tx.id} className="group flex items-center justify-between p-4 bg-zinc-900/50 hover:bg-zinc-800/80 border border-zinc-800 rounded-xl transition-all">
                   <div className="flex flex-col">
                     <span className="text-white font-medium">{tx.description}</span>
                     <div className="text-xs text-zinc-400 flex gap-2 items-center mt-1">
                       <span>{tx.category}</span>
                       <span className="text-zinc-600">•</span>
                       <span>{format(new Date(tx.date), 'MMM dd, yyyy')}</span>
                       <span className="text-zinc-600">•</span>
                       <span className="px-2 py-0.5 rounded-md bg-zinc-800 text-zinc-300 font-medium">By {tx.managedBy}</span>
                       <span className="px-2 py-0.5 rounded-md bg-zinc-800 text-zinc-300 font-medium uppercase">{tx.paymentMethod}</span>
                     </div>
                   </div>
                   <div className="flex items-center gap-4">
                     <span className={`font-semibold text-lg ${tx.type === 'income' ? 'text-emerald-400' : 'text-zinc-100'}`}>
                       {tx.type === 'expense' ? '-' : '+'}{formatINR(tx.amount)}
                     </span>
                     <button 
                       onClick={() => deleteTransaction(tx.id)}
                       className="p-2 text-zinc-500 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all opacity-0 group-hover:opacity-100"
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
