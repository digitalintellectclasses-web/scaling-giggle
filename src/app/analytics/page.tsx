'use client';

import { useState, useMemo } from 'react';
import { useFinance } from '@/store/FinanceContext';
import { useAuth } from '@/store/AuthContext';
import { useQuote } from '@/store/QuoteContext';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Legend } from 'recharts';
import { TrendingUp, BarChart2, Activity, PieChart, Lock } from 'lucide-react';
import { format, subMonths, addMonths, parseISO, startOfMonth, endOfMonth, isWithinInterval, differenceInMonths } from 'date-fns';

const formatINR = (amount: number) => {
  if (amount >= 100000) return `₹${(amount / 100000).toFixed(2)}L`;
  return `₹${amount.toLocaleString('en-IN')}`;
};

export default function AnalyticsPage() {
  const { transactions, clients, isAdmin, isLoaded } = useFinance();
  const { currentUser } = useAuth();
  const { quotations } = useQuote();

  const [forecastMonths, setForecastMonths] = useState(3);

  // ── Cash Flow & Trend Forecast ───────────────────────────────────────────
  const forecastData = useMemo(() => {
    if (!transactions.length) return [];

    // Group historical by month
    const monthlyData: Record<string, { in: number, out: number }> = {};
    const now = new Date();
    
    // Look back 6 months
    for (let i = 5; i >= 0; i--) {
      const d = subMonths(now, i);
      monthlyData[format(d, 'MMM yyyy')] = { in: 0, out: 0 };
    }

    transactions.forEach(tx => {
      const m = format(parseISO(tx.date), 'MMM yyyy');
      if (monthlyData[m]) {
        if (tx.type === 'income') monthlyData[m].in += tx.amount;
        else monthlyData[m].out += tx.amount;
      }
    });

    const historical = Object.entries(monthlyData).map(([name, data]) => ({ name, ...data }));
    
    // Simple Moving Average for trend predictions
    const avgIn = historical.reduce((acc, curr) => acc + curr.in, 0) / historical.length;
    const avgOut = historical.reduce((acc, curr) => acc + curr.out, 0) / historical.length;

    // Recurring income from clients
    const recurringMonthly = clients.reduce((acc, c) => acc + c.packageTier, 0);

    // Pending invoices (Unpaid Quotations)
    const pendingInvoicesTotal = quotations
      .filter(q => q.status === 'accepted' && q.paymentStatus !== 'paid')
      .reduce((acc, q) => acc + (q.total - (q.amountPaid || 0)), 0);

    const projected = [];
    let currentPendingToDistribute = pendingInvoicesTotal;

    for (let i = 1; i <= forecastMonths; i++) {
      const d = addMonths(now, i);
      // Base projected income = SMA + recurring
      let pIn = (avgIn * 0.3) + recurringMonthly; // Give recurring more weight
      
      // Distribute pending invoices over next 2 months
      if (currentPendingToDistribute > 0 && i <= 2) {
        const distributed = currentPendingToDistribute / 2;
        pIn += distributed;
        currentPendingToDistribute -= distributed;
      }

      projected.push({
        name: format(d, 'MMM yyyy') + ' (Est)',
        in: Math.round(pIn),
        out: Math.round(avgOut * 1.05) // Assume 5% MoM expense growth
      });
    }

    return [...historical, ...projected];
  }, [transactions, clients, quotations, forecastMonths]);

  // ── Project & Client Profitability ─────────────────────────────────────────
  const profitabilityData = useMemo(() => {
    return clients.map(client => {
      // Find all transactions linked to this client
      const clientTx = transactions.filter(tx => tx.clientId === client.id);
      
      let revenue = 0;
      let expenses = client.externalCosts || 0; // Base external costs

      clientTx.forEach(tx => {
        if (tx.type === 'income') revenue += tx.amount;
        if (tx.type === 'expense') expenses += tx.amount;
      });

      // Also add revenue from paid quotations linked to this client
      const clientQuotes = quotations.filter(q => q.clientId === client.id && q.status === 'accepted');
      clientQuotes.forEach(q => {
        revenue += (q.amountPaid || 0);
      });

      return {
        name: client.name,
        revenue,
        costs: expenses,
        margin: revenue > 0 ? Math.round(((revenue - expenses) / revenue) * 100) : 0
      };
    }).sort((a, b) => b.revenue - a.revenue);
  }, [clients, transactions, quotations]);

  // ── Revenue Run Rate (MRR/ARR) & Churn ──────────────────────────────────
  const runRateData = useMemo(() => {
    const activeClients = clients.filter(c => new Date(c.expiryDate) > new Date());
    const mrr = activeClients.reduce((acc, c) => acc + c.packageTier, 0);
    const arr = mrr * 12;

    // Basic Churn: clients expired in last 30 days
    const thirtyDaysAgo = subMonths(new Date(), 1);
    const churnedClients = clients.filter(c => {
      const exp = new Date(c.expiryDate);
      return exp > thirtyDaysAgo && exp <= new Date();
    });
    
    const churnMRR = churnedClients.reduce((acc, c) => acc + c.packageTier, 0);
    const churnRate = mrr > 0 ? ((churnMRR / (mrr + churnMRR)) * 100).toFixed(1) : '0';

    return { mrr, arr, churnRate, churnMRR };
  }, [clients]);


  if (!isLoaded) return null;

  if (!isAdmin) {
    return (
      <div className="flex h-full items-center justify-center pt-32">
        <div className="bg-zinc-900/50 border border-red-500/20 p-8 rounded-2xl text-center max-w-sm">
          <Lock className="w-12 h-12 text-red-500/50 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">Admin Only</h2>
          <p className="text-zinc-400 text-sm">Advanced analytics are restricted to partners.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20 max-w-7xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Advanced Analytics</h1>
        <p className="text-zinc-400">Financial projections, run rates, and project profitability analysis.</p>
      </div>

      {/* Top Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-emerald-500/10 rounded-lg"><TrendingUp className="w-4 h-4 text-emerald-400" /></div>
            <h3 className="text-sm font-medium text-zinc-400">Monthly Run Rate (MRR)</h3>
          </div>
          <p className="text-2xl font-black text-white">{formatINR(runRateData.mrr)}</p>
        </div>
        <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-500/10 rounded-lg"><Activity className="w-4 h-4 text-blue-400" /></div>
            <h3 className="text-sm font-medium text-zinc-400">Annual Run Rate (ARR)</h3>
          </div>
          <p className="text-2xl font-black text-white">{formatINR(runRateData.arr)}</p>
        </div>
        <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-red-500/10 rounded-lg"><PieChart className="w-4 h-4 text-red-400" /></div>
            <h3 className="text-sm font-medium text-zinc-400">Recent Churn Rate</h3>
          </div>
          <p className="text-2xl font-black text-white">{runRateData.churnRate}%</p>
          <p className="text-[10px] text-zinc-500 mt-1">Lost MRR: {formatINR(runRateData.churnMRR)}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Cash Flow Forecast */}
        <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-white">Cash Flow Forecast</h2>
            <select 
              value={forecastMonths} 
              onChange={e => setForecastMonths(Number(e.target.value))}
              className="bg-zinc-950 border border-zinc-800 text-zinc-300 text-xs rounded-lg px-3 py-1.5 outline-none"
            >
              <option value={3}>3 Months</option>
              <option value={6}>6 Months</option>
              <option value={12}>12 Months</option>
            </select>
          </div>
          
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={forecastData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                <XAxis dataKey="name" stroke="#52525b" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#52525b" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `₹${v/1000}k`} />
                <RechartsTooltip 
                  contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '12px' }}
                  itemStyle={{ fontSize: '14px', fontWeight: 'bold' }}
                  formatter={(value: number) => [`₹${value.toLocaleString()}`, '']}
                />
                <Legend iconType="circle" />
                <Line type="monotone" name="Income" dataKey="in" stroke="#34d399" strokeWidth={3} dot={{ r: 4, fill: '#34d399', strokeWidth: 0 }} />
                <Line type="monotone" name="Expenses" dataKey="out" stroke="#f87171" strokeWidth={3} dot={{ r: 4, fill: '#f87171', strokeWidth: 0 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <p className="text-xs text-zinc-500 mt-4 text-center">Projections based on Simple Moving Average, pending invoices, and active MRR.</p>
        </div>

        {/* Project Profitability */}
        <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl p-6">
          <h2 className="text-xl font-semibold text-white mb-6">Project Profitability</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-zinc-800 text-zinc-500 text-xs uppercase tracking-wider">
                  <th className="pb-3 pr-4 font-medium">Client / Project</th>
                  <th className="pb-3 px-4 font-medium text-right">Revenue</th>
                  <th className="pb-3 px-4 font-medium text-right">Costs</th>
                  <th className="pb-3 pl-4 font-medium text-right">Margin</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/50">
                {profitabilityData.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-zinc-500 text-sm">No project data available.</td>
                  </tr>
                ) : profitabilityData.map((data, i) => (
                  <tr key={i} className="hover:bg-zinc-800/20 transition-colors">
                    <td className="py-3 pr-4 font-medium text-sm text-zinc-300">{data.name}</td>
                    <td className="py-3 px-4 text-sm text-emerald-400 text-right font-bold">{formatINR(data.revenue)}</td>
                    <td className="py-3 px-4 text-sm text-red-400 text-right">{formatINR(data.costs)}</td>
                    <td className="py-3 pl-4 text-right">
                      <span className={`text-xs font-bold px-2 py-1 rounded-md ${data.margin > 40 ? 'bg-emerald-500/10 text-emerald-400' : data.margin > 15 ? 'bg-blue-500/10 text-blue-400' : 'bg-red-500/10 text-red-400'}`}>
                        {data.margin}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

    </div>
  );
}
