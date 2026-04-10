'use client';

import { useFinance } from '@/store/FinanceContext';
import { useAuth } from '@/store/AuthContext';
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { TrendingUp, IndianRupee, PieChart as PieChartIcon, SplitSquareHorizontal, LayoutDashboard, Activity, CalendarDays, UserPlus, ShieldCheck, User } from 'lucide-react';
import { useMemo, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';

const formatINR = (amount: number) => {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);
};

export default function Dashboard() {
  const { transactions, equities, isAdmin, isLoaded } = useFinance();
  const { users, createEmployee } = useAuth();
  const router = useRouter();

  // Employee creation form state
  const [empUsername, setEmpUsername] = useState('');
  const [empPassword, setEmpPassword] = useState('');
  const [empDisplayName, setEmpDisplayName] = useState('');
  const [empSuccess, setEmpSuccess] = useState('');

  const handleCreateEmployee = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      createEmployee(empUsername.trim(), '', empPassword, empDisplayName.trim());
      setEmpSuccess(`✓ Employee "${empDisplayName}" account prepared.`);
      setEmpUsername(''); setEmpPassword(''); setEmpDisplayName('');
      setTimeout(() => setEmpSuccess(''), 3000);
    } catch (error: any) {
      console.error(error);
    }
  };

  // Redirect non-admins to Employee Portal
  useEffect(() => {
    if (isLoaded && !isAdmin) {
      router.push('/clients');
    }
  }, [isAdmin, isLoaded, router]);

  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();

  const monthlyTransactions = useMemo(() => {
    return transactions.filter(t => {
      const d = new Date(t.date);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    });
  }, [transactions, currentMonth, currentYear]);

  const totalIncome = monthlyTransactions.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0);
  const totalExpense = monthlyTransactions.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0);
  const netProfit = totalIncome - totalExpense;
  const partnerSplit = netProfit > 0 ? netProfit / 2 : 0;

  // Expense Distribution
  const expenseByCategory = useMemo(() => {
    const categories: Record<string, number> = {};
    monthlyTransactions.filter(t => t.type === 'expense').forEach(t => {
      categories[t.category] = (categories[t.category] || 0) + t.amount;
    });
    return Object.entries(categories).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [monthlyTransactions]);

  const COLORS = ['#ef4444', '#f97316', '#eab308', '#3b82f6', '#8b5cf6', '#10b981'];

  // Daily Insight Report (Group income/expense by day for the current month up to today)
  const dailyInsights = useMemo(() => {
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const data = [];
    
    for (let day = 1; day <= daysInMonth; day++) {
      const dateString = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const dayTxs = monthlyTransactions.filter(t => t.date.startsWith(dateString));
      
      const income = dayTxs.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0);
      const expense = dayTxs.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0);
      const net = income - expense;
      
      // Stop charting after today to avoid flatlining future dates unless they have forecasted transactions
      if (day > new Date().getDate()) {
        if (income === 0 && expense === 0) continue;
      }
      
      data.push({
        date: dateString,
        day: String(day).padStart(2, '0'),
        Income: income,
        Expenses: expense,
        Net: net
      });
    }
    return data;
  }, [monthlyTransactions, currentMonth, currentYear]);

  // Finance State Activity (Combined Feed)
  const activityFeed = useMemo(() => {
    const combined: Array<{ id: string; date: string; type: string; title: string; subtitle: string; amount: number; isPositive: boolean }> = [
      ...transactions.map(t => ({
        id: t.id,
        date: t.date,
        type: 'Transaction',
        title: t.description,
        subtitle: `${t.type === 'income' ? 'Income' : 'Expense'} • By ${t.managedBy} (${t.paymentMethod})`,
        amount: t.amount,
        isPositive: t.type === 'income'
      })),
      ...equities.map(e => ({
        id: e.id,
        date: e.date,
        type: 'Equity',
        title: `Equity ${e.type === 'investment' ? 'Investment' : 'Drawing'}`,
        subtitle: `${e.partnerId}`,
        amount: e.amount,
        isPositive: e.type === 'investment'
      }))
    ];
    // Sort descending by date
    return combined.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 10);
  }, [transactions, equities]);

  if (!isLoaded) return <div className="h-full w-full flex items-center justify-center"><div className="animate-spin h-8 w-8 border-2 border-emerald-500 rounded-full border-t-transparent"></div></div>;

  if (!isAdmin) {
    return (
      <div className="flex h-full items-center justify-center pt-32">
        <div className="bg-zinc-900/50 border border-emerald-500/20 p-8 rounded-2xl text-center max-w-sm">
          <LayoutDashboard className="w-12 h-12 text-emerald-500/50 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">Redirecting to Portal</h2>
          <p className="text-zinc-400 text-sm">Transferring you to the Employee database view...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Admin Dashboard</h1>
        <p className="text-zinc-400">Executive financial insights and global state activity.</p>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl p-6 shadow-sm relative overflow-hidden group">
          <div className="flex justify-between items-start mb-4">
            <h3 className="text-zinc-400 text-sm font-medium">Monthly Revenue</h3>
            <div className="p-2 bg-emerald-500/10 rounded-lg"><TrendingUp className="h-4 w-4 text-emerald-500" /></div>
          </div>
          <p className="text-3xl font-bold text-white">{formatINR(totalIncome)}</p>
        </div>

        <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl p-6 shadow-sm relative overflow-hidden group">
          <div className="flex justify-between items-start mb-4">
            <h3 className="text-zinc-400 text-sm font-medium">Monthly Expenses</h3>
            <div className="p-2 bg-red-500/10 rounded-lg"><TrendingUp className="h-4 w-4 text-red-500 rotate-180" /></div>
          </div>
          <p className="text-3xl font-bold text-white">{formatINR(totalExpense)}</p>
        </div>

        <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl p-6 shadow-sm relative overflow-hidden group">
          <div className="flex justify-between items-start mb-4">
            <h3 className="text-zinc-400 text-sm font-medium">Net Profit</h3>
            <div className="p-2 bg-blue-500/10 rounded-lg"><IndianRupee className="h-4 w-4 text-blue-500" /></div>
          </div>
          <p className="text-3xl font-bold text-white">{formatINR(netProfit)}</p>
        </div>

        <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl p-6 shadow-sm relative overflow-hidden group">
          <div className="flex justify-between items-start mb-4">
            <h3 className="text-zinc-400 text-sm font-medium">Partner Split (50/50)</h3>
            <div className="p-2 bg-purple-500/10 rounded-lg"><SplitSquareHorizontal className="h-4 w-4 text-purple-500" /></div>
          </div>
          <p className="text-3xl font-bold text-emerald-400">{formatINR(partnerSplit)}</p>
          <p className="text-xs text-zinc-500 mt-2">Available per partner</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Daily Insights Report */}
        <div className="col-span-1 lg:col-span-2 bg-zinc-900/40 border border-zinc-800 rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-6">
            <CalendarDays className="h-5 w-5 text-zinc-400" />
            <h3 className="text-lg font-semibold text-white">Daily Insight Report</h3>
          </div>
          {dailyInsights.length > 0 ? (
            <div className="h-[300px] w-full mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={dailyInsights} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                  <XAxis dataKey="day" stroke="#52525b" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#09090b', border: '1px solid #27272a', borderRadius: '8px' }}
                    itemStyle={{ color: '#fafafa' }}
                  />
                  <Line type="monotone" dataKey="Net" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4, fill: '#09090b', strokeWidth: 2 }} activeDot={{ r: 6 }} />
                  <Line type="monotone" dataKey="Income" stroke="#10b981" strokeWidth={2} dot={false} strokeOpacity={0.3} />
                  <Line type="monotone" dataKey="Expenses" stroke="#ef4444" strokeWidth={2} dot={false} strokeOpacity={0.3} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
             <div className="h-[300px] flex items-center justify-center text-zinc-500">No data available for this month.</div>
          )}
        </div>

        {/* Finance State Activity Feed */}
        <div className="col-span-1 bg-zinc-900/40 border border-zinc-800 rounded-2xl p-6 flex flex-col h-[400px]">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-zinc-400" />
              <h3 className="text-lg font-semibold text-white">State Activity</h3>
            </div>
            <span className="text-xs text-zinc-500 bg-zinc-800 px-2 py-1 rounded-md">Live</span>
          </div>
          
          <div className="flex-1 overflow-y-auto pr-2 space-y-4">
            {activityFeed.length === 0 ? (
               <div className="h-full flex flex-col items-center justify-center text-zinc-500 text-sm">
                 No recent activity.
               </div>
            ) : (
              activityFeed.map((item, i) => (
                <div key={`${item.id}-${i}`} className="flex items-start gap-4 p-3 bg-zinc-900/50 rounded-xl border border-zinc-800/50">
                  <div className={`mt-1 h-2 w-2 rounded-full flex-shrink-0 ${item.isPositive ? 'bg-emerald-500' : 'bg-red-500'} ${item.type === 'Equity' ? 'shadow-[0_0_8px_rgba(255,255,255,0.5)]' : ''}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{item.title}</p>
                    <p className="text-xs text-zinc-400 mt-0.5">{item.subtitle}</p>
                    <p className="text-xs text-zinc-500 mt-1">{format(new Date(item.date), 'MMM dd')}</p>
                  </div>
                  <div className={`text-sm font-semibold flex-shrink-0 ${item.isPositive ? 'text-emerald-400' : 'text-zinc-100'}`}>
                    {item.isPositive ? '+' : '-'}{formatINR(item.amount)}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Expense Distribution */}
        <div className="col-span-1 lg:col-span-3 bg-zinc-900/40 border border-zinc-800 rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-6">
            <PieChartIcon className="h-5 w-5 text-zinc-400" />
            <h3 className="text-lg font-semibold text-white">Expense Distribution</h3>
          </div>
          {expenseByCategory.length > 0 ? (
            <div className="h-[300px] w-full flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={expenseByCategory}
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {expenseByCategory.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#09090b', border: '1px solid #27272a', borderRadius: '8px' }}
                    itemStyle={{ color: '#fafafa' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
             <div className="h-[300px] flex items-center justify-center text-zinc-500">No expenses recorded for this month.</div>
          )}
        </div>
      </div>

      {/* ── Employee Management ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-4">

        {/* Create Employee Form */}
        <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-6">
            <UserPlus className="h-5 w-5 text-purple-400" />
            <h3 className="text-lg font-semibold text-white">Create Employee Account</h3>
          </div>
          <form onSubmit={handleCreateEmployee} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1">Display Name</label>
              <input required value={empDisplayName} onChange={e => setEmpDisplayName(e.target.value)}
                className="block w-full px-3 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-white focus:ring-2 focus:ring-purple-500 outline-none transition-all text-sm"
                placeholder="e.g. Priya" />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1">User ID</label>
              <input required value={empUsername} onChange={e => setEmpUsername(e.target.value)}
                className="block w-full px-3 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-white focus:ring-2 focus:ring-purple-500 outline-none transition-all text-sm uppercase"
                placeholder="e.g. PRIYA" />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1">Password</label>
              <input required type="password" value={empPassword} onChange={e => setEmpPassword(e.target.value)}
                className="block w-full px-3 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-white focus:ring-2 focus:ring-purple-500 outline-none transition-all text-sm"
                placeholder="Strong password" />
            </div>
            {empSuccess && (
              <div className="text-emerald-400 text-sm bg-emerald-500/10 border border-emerald-500/20 px-4 py-2.5 rounded-xl">{empSuccess}</div>
            )}
            <button type="submit"
              className="w-full flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-500 text-white py-2.5 rounded-xl font-semibold transition-all text-sm">
              <UserPlus className="w-4 h-4" /> Create Employee
            </button>
          </form>
        </div>

        {/* Employee List */}
        <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl p-6 flex flex-col">
          <div className="flex items-center gap-2 mb-6">
            <ShieldCheck className="h-5 w-5 text-zinc-400" />
            <h3 className="text-lg font-semibold text-white">All Users</h3>
          </div>
          <div className="space-y-3 overflow-y-auto max-h-64 pr-1">
            {users.map(u => (
              <div key={u.id} className="flex items-center justify-between p-3 bg-zinc-900/60 border border-zinc-800 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold
                    ${u.role === 'admin' ? 'bg-purple-500/20 text-purple-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
                    {u.displayName.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">{u.displayName}</p>
                    <p className="text-xs text-zinc-500">@{u.username}</p>
                  </div>
                </div>
                <span className={`text-xs px-2 py-1 rounded-md font-medium
                  ${u.role === 'admin' ? 'bg-purple-500/10 text-purple-400' : 'bg-emerald-500/10 text-emerald-400'}`}>
                  {u.role === 'admin' ? 'Admin' : 'Employee'}
                </span>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
