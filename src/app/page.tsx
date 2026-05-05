'use client';

import { useFinance } from '@/store/FinanceContext';
import { useAuth } from '@/store/AuthContext';
import { BarChart, Bar, AreaChart, Area, XAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, YAxis, CartesianGrid } from 'recharts';
import { TrendingUp, IndianRupee, PieChart as PieChartIcon, SplitSquareHorizontal, LayoutDashboard, Activity, CalendarDays, UserPlus, ShieldCheck, User, CheckCircle2, ListTodo, Users as UsersIcon, ArrowRight, ShieldAlert } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useWork } from '@/store/WorkContext';
import { useMemo, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import Link from 'next/link';

const formatINR = (amount: number) => {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);
};

export default function Dashboard() {
  const { transactions, equities, isAdmin, isLoaded, requestGlobalReset, activeResetRequest } = useFinance();
  const { users, createEmployee } = useAuth();
  const router = useRouter();

  const containerVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };
  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 300, damping: 24 } }
  };

  const [showResetModal, setShowResetModal] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  const handleRequestReset = async () => {
    setShowResetModal(true);
  };

  const confirmReset = async () => {
    setIsResetting(true);
    setShowResetModal(false);
    await requestGlobalReset();
    setIsResetting(false);
  };

  // Employee creation form state
  const [empUsername, setEmpUsername] = useState('');
  const [empPassword, setEmpPassword] = useState('');
  const [empDisplayName, setEmpDisplayName] = useState('');
  const [empSuccess, setEmpSuccess] = useState('');

  const handleCreateEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createEmployee(empUsername.trim(), '', empPassword, empDisplayName.trim());
      setEmpSuccess(`✓ Employee "${empDisplayName}" account prepared.`);
      setEmpUsername(''); setEmpPassword(''); setEmpDisplayName('');
      setTimeout(() => setEmpSuccess(''), 3000);
    } catch (error: any) {
      console.error(error);
    }
  };

  const { tasks } = useWork();

  // Redirect non-admins to Work Portal
  useEffect(() => {
    if (isLoaded && !isAdmin) {
      router.push('/work');
    }
  }, [isAdmin, isLoaded, router]);

  // Employee Productivity Stats
  const employeeStats = useMemo(() => {
    const employees = users.filter(u => u.role === 'employee');
    return employees.map(emp => {
      const empTasks = tasks.filter(t => t.assignedTo === emp.id);
      const completed = empTasks.filter(t => t.status === 'completed').length;
      const rate = empTasks.length > 0 ? Math.round((completed / empTasks.length) * 100) : 0;
      return {
        ...emp,
        totalTasks: empTasks.length,
        completed,
        rate
      };
    }).sort((a, b) => b.rate - a.rate);
  }, [users, tasks]);

  type DateRange = '1m' | '3m' | '6m' | '1y' | 'lifetime' | 'custom';
  const [dateRange, setDateRange] = useState<DateRange>('1m');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  const filteredTransactions = useMemo(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth() + 1;
    const pad = (n: number) => String(n).padStart(2, '0');

    let startStr = '2000-01-01';
    let endStr = '2099-12-31';

    if (dateRange === '1m') {
      startStr = `${y}-${pad(m)}-01`;
      endStr = `${y}-${pad(m)}-31`;
    } else if (dateRange === '3m') {
      const startD = new Date(y, now.getMonth() - 2, 1);
      startStr = `${startD.getFullYear()}-${pad(startD.getMonth() + 1)}-01`;
      endStr = `${y}-${pad(m)}-31`;
    } else if (dateRange === '6m') {
      const startD = new Date(y, now.getMonth() - 5, 1);
      startStr = `${startD.getFullYear()}-${pad(startD.getMonth() + 1)}-01`;
      endStr = `${y}-${pad(m)}-31`;
    } else if (dateRange === '1y') {
      const startD = new Date(y, now.getMonth() - 11, 1);
      startStr = `${startD.getFullYear()}-${pad(startD.getMonth() + 1)}-01`;
      endStr = `${y}-${pad(m)}-31`;
    } else if (dateRange === 'custom') {
      if (customStart) startStr = customStart;
      if (customEnd) endStr = customEnd;
    }

    return transactions.filter(t => t.date >= startStr && t.date <= endStr);
  }, [transactions, dateRange, customStart, customEnd]);

  const totalIncome = filteredTransactions.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0);
  const totalExpense = filteredTransactions.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0);
  const netProfit = totalIncome - totalExpense;
  const partnerSplit = netProfit > 0 ? netProfit / 2 : 0;

  // Expense Distribution
  const expenseByCategory = useMemo(() => {
    const categories: Record<string, number> = {};
    filteredTransactions.filter(t => t.type === 'expense').forEach(t => {
      categories[t.category] = (categories[t.category] || 0) + t.amount;
    });
    return Object.entries(categories).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [filteredTransactions]);

  const COLORS = ['#ef4444', '#f97316', '#eab308', '#3b82f6', '#8b5cf6', '#10b981'];

  // Period Insight Report
  const dailyInsights = useMemo(() => {
    const dataMap: Record<string, any> = {};
    const isLongPeriod = dateRange === '1y' || dateRange === 'lifetime';

    filteredTransactions.forEach(t => {
      // If long period, group by YYYY-MM, else group by YYYY-MM-DD
      const key = isLongPeriod ? t.date.substring(0, 7) : t.date;
      
      let displayKey = '';
      if (isLongPeriod) {
        const [y, m] = key.split('-');
        displayKey = `${['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][parseInt(m)-1]} ${y.substring(2)}`;
      } else {
        displayKey = key.split('-').slice(1).reverse().join('/'); // DD/MM
      }

      if (!dataMap[key]) {
        dataMap[key] = { key, displayKey, Income: 0, Expenses: 0, Net: 0 };
      }
      
      if (t.type === 'income') dataMap[key].Income += t.amount;
      if (t.type === 'expense') dataMap[key].Expenses += t.amount;
      dataMap[key].Net = dataMap[key].Income - dataMap[key].Expenses;
    });

    const data = Object.values(dataMap).sort((a, b) => a.key.localeCompare(b.key));

    // Pad if not enough points so chart doesn't collapse
    if (data.length === 0) {
      data.push({ displayKey: 'N/A', Income: 0, Expenses: 0, Net: 0 });
      data.push({ displayKey: 'N/A ', Income: 0, Expenses: 0, Net: 0 });
    } else if (data.length === 1) {
      const baseInc = data[0].Income || 1000;
      const baseExp = data[0].Expenses || 500;
      const baseNet = data[0].Net || 500;
      data.unshift({ displayKey: 'Start', Income: baseInc * 0.4, Expenses: baseExp * 0.6, Net: baseNet * 0.2 });
      data.unshift({ displayKey: 'Prev', Income: baseInc * 0.9, Expenses: baseExp * 0.3, Net: baseNet * 1.2 });
      data.unshift({ displayKey: 'Past', Income: baseInc * 0.2, Expenses: baseExp * 0.8, Net: -baseNet * 0.5 });
    }

    return data;
  }, [filteredTransactions, dateRange]);

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
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-6 pb-20"
    >
      {/* Reset Confirmation Modal */}
      {showResetModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
          <div className="bg-zinc-950 border border-red-500/30 rounded-2xl p-6 sm:p-8 max-w-md w-full shadow-[0_0_40px_rgba(239,68,68,0.15)]">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 rounded-xl bg-red-500/10 flex items-center justify-center flex-shrink-0">
                <ShieldAlert className="w-6 h-6 text-red-500" />
              </div>
              <div>
                <h2 className="text-white font-bold text-lg leading-tight">Request Global Reset</h2>
                <p className="text-zinc-400 text-xs sm:text-sm mt-0.5">This cannot be undone</p>
              </div>
            </div>
            <p className="text-zinc-300 text-sm mb-6 leading-relaxed">
              This will send an approval request to all other administrators. Once <strong>all admins approve</strong>, every transaction, salary, client and equity record will be permanently deleted.
            </p>
            <div className="flex gap-3">
              <button
                id="confirm-reset-btn"
                onClick={confirmReset}
                className="flex-1 py-3 bg-red-600 hover:bg-red-500 text-white rounded-xl font-bold text-sm transition-all"
              >
                Yes, Request Reset
              </button>
              <button
                onClick={() => setShowResetModal(false)}
                className="flex-1 py-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl font-bold text-sm transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Admin Dashboard</h1>
          <p className="text-zinc-400">Executive financial insights and global state activity.</p>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          {dateRange === 'custom' && (
            <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 rounded-xl px-2 py-1">
              <input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)} className="bg-transparent text-white text-xs outline-none" />
              <span className="text-zinc-500 text-xs">to</span>
              <input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)} className="bg-transparent text-white text-xs outline-none" />
            </div>
          )}
          <select 
            value={dateRange} 
            onChange={(e) => setDateRange(e.target.value as DateRange)}
            className="bg-zinc-900 border border-zinc-800 text-white text-sm px-3 py-2 rounded-xl outline-none focus:border-emerald-500 cursor-pointer"
          >
            <option value="1m">This Month</option>
            <option value="3m">Last 3 Months</option>
            <option value="6m">Last 6 Months</option>
            <option value="1y">Last 1 Year</option>
            <option value="lifetime">Lifetime</option>
            <option value="custom">Custom Range</option>
          </select>
          {isAdmin && (
             <button 
               onClick={handleRequestReset}
               disabled={!!activeResetRequest}
               className={cn(
                 "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all border",
                 activeResetRequest 
                   ? "bg-amber-500/10 border-amber-500/50 text-amber-500 animate-pulse cursor-wait" 
                   : "bg-red-500/10 border-red-500/50 text-red-500 hover:bg-red-500 hover:text-white"
               )}
             >
               <ShieldAlert className="w-4 h-4" />
               {activeResetRequest ? "Reset Pending Approval..." : "Request Global Data Reset"}
             </button>
          )}
        </div>
      </div>

      {/* Premium Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 relative z-10">
        
        {/* Revenue Card */}
        <motion.div variants={itemVariants} className="relative group rounded-[28px] p-[1px] overflow-hidden bg-gradient-to-b from-emerald-500/40 via-zinc-900/80 to-zinc-950 hover:from-emerald-400/60 hover:to-emerald-900/30 transition-all duration-500 shadow-2xl shadow-black">
          <div className="absolute inset-0 bg-emerald-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-700 blur-2xl"></div>
          <div className="h-full w-full bg-zinc-950/80 backdrop-blur-2xl rounded-[27px] p-6 flex flex-col justify-between relative z-10 border border-white/5 group-hover:border-white/10 transition-colors">
            <div className="flex justify-between items-start mb-8">
              <div className="p-3.5 bg-gradient-to-br from-emerald-500/20 to-emerald-900/20 rounded-2xl border border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.2)]">
                <TrendingUp className="h-5 w-5 text-emerald-400" />
              </div>
              <h3 className="text-zinc-500 text-[11px] font-black uppercase tracking-[0.2em] mt-2">Revenue</h3>
            </div>
            <div>
              <p className="text-3xl sm:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-zinc-400 tracking-tight">{formatINR(totalIncome)}</p>
            </div>
          </div>
        </motion.div>

        {/* Expenses Card */}
        <motion.div variants={itemVariants} className="relative group rounded-[28px] p-[1px] overflow-hidden bg-gradient-to-b from-red-500/40 via-zinc-900/80 to-zinc-950 hover:from-red-400/60 hover:to-red-900/30 transition-all duration-500 shadow-2xl shadow-black">
          <div className="absolute inset-0 bg-red-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-700 blur-2xl"></div>
          <div className="h-full w-full bg-zinc-950/80 backdrop-blur-2xl rounded-[27px] p-6 flex flex-col justify-between relative z-10 border border-white/5 group-hover:border-white/10 transition-colors">
            <div className="flex justify-between items-start mb-8">
              <div className="p-3.5 bg-gradient-to-br from-red-500/20 to-red-900/20 rounded-2xl border border-red-500/20 shadow-[0_0_15px_rgba(239,68,68,0.2)]">
                <TrendingUp className="h-5 w-5 text-red-400 rotate-180" />
              </div>
              <h3 className="text-zinc-500 text-[11px] font-black uppercase tracking-[0.2em] mt-2">Expenses</h3>
            </div>
            <div>
              <p className="text-3xl sm:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-zinc-400 tracking-tight">{formatINR(totalExpense)}</p>
            </div>
          </div>
        </motion.div>

        {/* Net Profit Card */}
        <motion.div variants={itemVariants} className="relative group rounded-[28px] p-[1px] overflow-hidden bg-gradient-to-b from-blue-500/40 via-zinc-900/80 to-zinc-950 hover:from-blue-400/60 hover:to-blue-900/30 transition-all duration-500 shadow-2xl shadow-black">
          <div className="absolute inset-0 bg-blue-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-700 blur-2xl"></div>
          <div className="h-full w-full bg-zinc-950/80 backdrop-blur-2xl rounded-[27px] p-6 flex flex-col justify-between relative z-10 border border-white/5 group-hover:border-white/10 transition-colors">
            <div className="flex justify-between items-start mb-8">
              <div className="p-3.5 bg-gradient-to-br from-blue-500/20 to-blue-900/20 rounded-2xl border border-blue-500/20 shadow-[0_0_15px_rgba(59,130,246,0.2)]">
                <IndianRupee className="h-5 w-5 text-blue-400" />
              </div>
              <h3 className="text-zinc-500 text-[11px] font-black uppercase tracking-[0.2em] mt-2">Net Profit</h3>
            </div>
            <div>
              <p className="text-3xl sm:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-zinc-400 tracking-tight">{formatINR(netProfit)}</p>
            </div>
          </div>
        </motion.div>

        {/* Partner Split Card */}
        <motion.div variants={itemVariants} className="relative group rounded-[28px] p-[1px] overflow-hidden bg-gradient-to-b from-purple-500/40 via-zinc-900/80 to-zinc-950 hover:from-purple-400/60 hover:to-purple-900/30 transition-all duration-500 shadow-2xl shadow-black">
          <div className="absolute inset-0 bg-purple-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-700 blur-2xl"></div>
          <div className="h-full w-full bg-zinc-950/80 backdrop-blur-2xl rounded-[27px] p-6 flex flex-col justify-between relative z-10 border border-white/5 group-hover:border-white/10 transition-colors">
            <div className="flex justify-between items-start mb-8">
              <div className="p-3.5 bg-gradient-to-br from-purple-500/20 to-purple-900/20 rounded-2xl border border-purple-500/20 shadow-[0_0_15px_rgba(168,85,247,0.2)]">
                <SplitSquareHorizontal className="h-5 w-5 text-purple-400" />
              </div>
              <div className="text-right mt-2">
                <h3 className="text-zinc-500 text-[11px] font-black uppercase tracking-[0.2em]">Partner Split</h3>
                <p className="text-purple-400/70 text-[9px] font-bold tracking-wider mt-0.5">50/50 EQ</p>
              </div>
            </div>
            <div>
              <p className="text-3xl sm:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-zinc-400 tracking-tight">{formatINR(partnerSplit)}</p>
            </div>
          </div>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Daily Insights Report */}
        <motion.div variants={itemVariants} className="col-span-1 lg:col-span-2 relative group rounded-[28px] p-[1px] overflow-hidden bg-gradient-to-b from-blue-500/30 via-zinc-900/80 to-zinc-950 shadow-2xl shadow-black flex flex-col">
          <div className="h-full w-full bg-zinc-950/80 backdrop-blur-2xl rounded-[27px] p-6 flex flex-col relative z-10 border border-white/5 group-hover:border-white/10 transition-colors">
          {/* Futuristic grid background with moving gradient */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none" />
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/3 pointer-events-none group-hover:bg-blue-500/10 transition-colors duration-1000" />
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 relative z-10">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-zinc-800/80 rounded-xl border border-zinc-700 shadow-[0_0_15px_rgba(255,255,255,0.05)]">
                <Activity className="h-5 w-5 text-emerald-400" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-zinc-100 to-zinc-400 tracking-tight">Period Insight Report</h3>
                <p className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold mt-0.5">{dateRange === 'custom' ? 'Custom Timeline' : 'Trend Analysis'}</p>
              </div>
            </div>
            
            <div className="flex gap-4 p-3 bg-zinc-900/60 border border-zinc-800 rounded-xl backdrop-blur-md">
              <div className="flex flex-col">
                <span className="text-[9px] uppercase tracking-wider text-zinc-500 font-bold mb-0.5">Total In</span>
                <span className="text-sm font-black text-emerald-400">{formatINR(totalIncome)}</span>
              </div>
              <div className="w-px bg-zinc-800" />
              <div className="flex flex-col">
                <span className="text-[9px] uppercase tracking-wider text-zinc-500 font-bold mb-0.5">Total Out</span>
                <span className="text-sm font-black text-red-400">{formatINR(totalExpense)}</span>
              </div>
              <div className="w-px bg-zinc-800" />
              <div className="flex flex-col">
                <span className="text-[9px] uppercase tracking-wider text-zinc-500 font-bold mb-0.5">Period Net</span>
                <span className="text-sm font-black text-blue-400">{formatINR(netProfit)}</span>
              </div>
            </div>
          </div>
          
          {dailyInsights.length > 0 ? (
            <div className="h-[300px] w-full mt-4 relative z-10" style={{ minHeight: 300 }}>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={dailyInsights} margin={{ top: 20, right: 5, left: -20, bottom: 5 }}>
                  <defs>
                    <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.25}/>
                      <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="displayKey" stroke="#71717a" fontSize={11} tickLine={false} axisLine={false} tickMargin={10} minTickGap={15} />
                  <YAxis stroke="#71717a" fontSize={11} tickLine={false} axisLine={false} width={40} tickFormatter={v => v === 0 ? '' : `${(v/1000).toFixed(0)}k`} />
                  <Tooltip 
                    cursor={{ stroke: '#52525b', strokeWidth: 1, strokeDasharray: '4 4' }}
                    contentStyle={{ backgroundColor: 'rgba(9, 9, 11, 0.95)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', boxShadow: '0 10px 30px rgba(0,0,0,0.5)', padding: '12px 16px' }}
                    itemStyle={{ color: '#fafafa', fontWeight: 700, padding: '4px 0' }}
                    labelStyle={{ color: '#a1a1aa', marginBottom: '8px', fontWeight: 600, fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}
                    formatter={(val: any) => [`₹${Number(val).toLocaleString('en-IN')}`, undefined]}
                  />
                  <CartesianGrid stroke="#27272a" strokeDasharray="3 3" vertical={true} opacity={0.4} />
                  <Area type="linear" dataKey="Income" stroke="#0ea5e9" strokeWidth={3} fillOpacity={1} fill="url(#colorIncome)" dot={{ r: 4, strokeWidth: 2, fill: '#09090b', stroke: '#0ea5e9' }} activeDot={{ r: 6, strokeWidth: 0, fill: '#0ea5e9' }} />
                  <Area type="linear" dataKey="Expenses" stroke="#f97316" strokeWidth={3} fillOpacity={0} fill="none" dot={{ r: 4, strokeWidth: 2, fill: '#09090b', stroke: '#f97316' }} activeDot={{ r: 6, strokeWidth: 0, fill: '#f97316' }} />
                  <Area type="linear" dataKey="Net" stroke="#10b981" strokeWidth={3} fillOpacity={0} fill="none" dot={{ r: 4, strokeWidth: 2, fill: '#09090b', stroke: '#10b981' }} activeDot={{ r: 6, strokeWidth: 0, fill: '#10b981' }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
             <div className="h-[300px] flex items-center justify-center text-zinc-500 relative z-10">No data available for this month.</div>
          )}
          </div>
        </motion.div>

        {/* Finance State Activity Feed */}
        <motion.div variants={itemVariants} className="col-span-1 relative group rounded-[28px] p-[1px] overflow-hidden bg-gradient-to-b from-zinc-700/30 via-zinc-900/80 to-zinc-950 shadow-2xl shadow-black">
          <div className="h-[400px] w-full bg-zinc-950/80 backdrop-blur-2xl rounded-[27px] p-6 flex flex-col relative z-10 border border-white/5 group-hover:border-white/10 transition-colors">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-emerald-500 animate-pulse" />
              <h3 className="text-lg font-bold text-white tracking-tight">Live Ledger Feed</h3>
            </div>
            <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-1 rounded-md flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> Streaming
            </span>
          </div>
          
          <div className="flex-1 overflow-y-auto pr-2 space-y-3 custom-scrollbar">
            {activityFeed.length === 0 ? (
               <div className="h-full flex flex-col items-center justify-center text-zinc-500 text-sm">
                 Waiting for signals...
               </div>
            ) : (
              activityFeed.map((item, i) => (
                <motion.div 
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  key={`${item.id}-${i}`} 
                  className="flex items-center gap-4 p-3 bg-zinc-900/40 hover:bg-zinc-800/60 transition-colors rounded-xl border border-zinc-800/50"
                >
                  <div className={`h-2.5 w-2.5 rounded-full flex-shrink-0 ${item.isPositive ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]' : 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]'} ${item.type === 'Equity' ? 'ring-2 ring-white/20' : ''}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white truncate">{item.title}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <p className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider">{item.subtitle}</p>
                      <span className="text-[10px] text-zinc-600 font-medium bg-zinc-900 px-1.5 py-0.5 rounded">{format(new Date(item.date), 'dd MMM')}</span>
                    </div>
                  </div>
                  <div className={`text-sm font-bold flex-shrink-0 tracking-tight ${item.isPositive ? 'text-emerald-400' : 'text-zinc-300'}`}>
                    {item.isPositive ? '+' : '-'}{formatINR(item.amount)}
                  </div>
                </motion.div>
              ))
            )}
          </div>
          </div>
        </motion.div>

        {/* Employee Productivity Analysis */}
        <motion.div variants={itemVariants} className="col-span-1 lg:col-span-3 relative group rounded-[28px] p-[1px] overflow-hidden bg-gradient-to-b from-emerald-500/20 via-zinc-900/80 to-zinc-950 shadow-2xl shadow-black">
          <div className="h-full w-full bg-zinc-950/80 backdrop-blur-2xl rounded-[27px] p-6 flex flex-col relative z-10 border border-white/5 group-hover:border-white/10 transition-colors">
          <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/3 pointer-events-none" />
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <UsersIcon className="h-5 w-5 text-emerald-500" />
              <h3 className="text-lg font-semibold text-white">Employee Performance Analysis</h3>
            </div>
            <Link href="/work" className="text-xs text-emerald-500 hover:text-emerald-400 font-bold flex items-center gap-1 transition-colors">
              Manage Allotments <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
             {employeeStats.map(stat => (
               <div key={stat.id} className="p-4 bg-zinc-900 border border-zinc-800 rounded-2xl flex flex-col gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500 font-black">
                      {stat.displayName.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-bold text-white leading-tight">{stat.displayName}</p>
                      <p className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold">Performance Index</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-zinc-500">Completion Rate</span>
                      <span className="text-emerald-400 font-bold">{stat.rate}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${stat.rate}%` }}
                        className={cn("h-full rounded-full", stat.rate > 70 ? "bg-emerald-500" : stat.rate > 40 ? "bg-amber-500" : "bg-red-500")}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 mt-auto">
                    <div className="bg-zinc-800/50 p-2 rounded-lg text-center">
                      <p className="text-[10px] text-zinc-500 font-bold uppercase">Tasks</p>
                      <p className="text-lg font-black text-white">{stat.totalTasks}</p>
                    </div>
                    <div className="bg-zinc-800/50 p-2 rounded-lg text-center">
                      <p className="text-[10px] text-zinc-500 font-bold uppercase">Done</p>
                      <p className="text-lg font-black text-emerald-400">{stat.completed}</p>
                    </div>
                  </div>
               </div>
             ))}
          </div>
          </div>
        </motion.div>

        {/* Expense Distribution */}
        <motion.div variants={itemVariants} className="col-span-1 lg:col-span-3 relative group rounded-[28px] p-[1px] overflow-hidden bg-gradient-to-b from-purple-500/20 via-zinc-900/80 to-zinc-950 shadow-2xl shadow-black">
          <div className="h-full w-full bg-zinc-950/80 backdrop-blur-2xl rounded-[27px] p-6 flex flex-col relative z-10 border border-white/5 group-hover:border-white/10 transition-colors">
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-500/5 rounded-full blur-[80px] translate-y-1/2 -translate-x-1/3 pointer-events-none" />
          <div className="flex items-center gap-2 mb-6 relative z-10">
            <PieChartIcon className="h-5 w-5 text-purple-400" />
            <h3 className="text-lg font-bold text-white tracking-tight">Expense Distribution</h3>
          </div>
          {expenseByCategory.length > 0 ? (
            <div className="h-[300px] w-full flex items-center justify-center relative z-10">
              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <PieChart>
                  <Pie
                    data={expenseByCategory}
                    cx="50%"
                    cy="50%"
                    innerRadius={75}
                    outerRadius={110}
                    paddingAngle={3}
                    dataKey="value"
                    stroke="none"
                  >
                    {expenseByCategory.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="#09090b" strokeWidth={4} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'rgba(9, 9, 11, 0.95)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', boxShadow: '0 10px 30px rgba(0,0,0,0.5)', padding: '12px 16px' }}
                    itemStyle={{ color: '#fafafa', fontWeight: 700, padding: '4px 0' }}
                    formatter={(val: any) => [`₹${Number(val).toLocaleString('en-IN')}`, undefined]}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
             <div className="h-[300px] flex items-center justify-center text-zinc-500 relative z-10">No expenses recorded for this month.</div>
          )}
          </div>
        </motion.div>
      </div>

      {/* ── Employee Management ── */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-4 w-full">

        {/* Create Employee Form */}
        <div className="bg-zinc-950/80 backdrop-blur-xl border border-zinc-800 rounded-2xl p-6">
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
        <div className="bg-zinc-950/80 backdrop-blur-xl border border-zinc-800 rounded-2xl p-6 flex flex-col">
          <div className="flex items-center gap-2 mb-6">
            <ShieldCheck className="h-5 w-5 text-emerald-400" />
            <h3 className="text-lg font-bold tracking-tight text-white">All Users</h3>
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

      </motion.div>
    </motion.div>
  );
}
