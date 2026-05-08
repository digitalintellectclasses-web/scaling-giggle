'use client';

import { useState, useMemo } from 'react';
import { useFinance } from '@/store/FinanceContext';
import { useAuth } from '@/store/AuthContext';
import { useQuote } from '@/store/QuoteContext';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, BarChart2, Activity, PieChart as PieChartIcon, Lock, Calendar, ArrowUpRight, ArrowDownRight, Wallet, Users, FileText } from 'lucide-react';
import { format, subMonths, addMonths, parseISO, startOfMonth, endOfMonth, isWithinInterval, differenceInMonths, eachDayOfInterval, startOfWeek, endOfWeek } from 'date-fns';

const formatINR = (amount: number) => {
  if (amount >= 100000) return `₹${(amount / 100000).toFixed(2)}L`;
  return `₹${amount.toLocaleString('en-IN')}`;
};

export default function AnalyticsPage() {
  const { transactions, clients, isAdmin, isLoaded } = useFinance();
  const { currentUser } = useAuth();
  const { quotations } = useQuote();

  const [forecastMonths, setForecastMonths] = useState(3);
  const [reportPeriod, setReportPeriod] = useState<'month' | 'quarter' | 'year'>('month');
  const [reportMonth, setReportMonth] = useState(format(new Date(), 'yyyy-MM'));

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

  // ── Period Insight Report ───────────────────────────────────────────────
  const periodInsight = useMemo(() => {
    if (!transactions.length) return null;

    const selectedDate = parseISO(`${reportMonth}-01`);
    let periodStart: Date;
    let periodEnd: Date;

    switch (reportPeriod) {
      case 'quarter':
        periodStart = startOfMonth(selectedDate);
        periodEnd = endOfMonth(addMonths(selectedDate, 2));
        break;
      case 'year':
        periodStart = startOfMonth(selectedDate);
        periodEnd = endOfMonth(addMonths(selectedDate, 11));
        break;
      default:
        periodStart = startOfMonth(selectedDate);
        periodEnd = endOfMonth(selectedDate);
    }

    const periodTx = transactions.filter(tx => {
      const txDate = parseISO(tx.date);
      return txDate >= periodStart && txDate <= periodEnd;
    });

    const totalIncome = periodTx.filter(tx => tx.type === 'income').reduce((a, t) => a + t.amount, 0);
    const totalExpense = periodTx.filter(tx => tx.type === 'expense').reduce((a, t) => a + t.amount, 0);
    const netProfit = totalIncome - totalExpense;
    const profitMargin = totalIncome > 0 ? ((netProfit / totalIncome) * 100).toFixed(1) : '0';
    const txCount = periodTx.length;
    const avgTxSize = txCount > 0 ? Math.round((totalIncome + totalExpense) / txCount) : 0;

    const prevPeriodStart = reportPeriod === 'quarter' ? startOfMonth(subMonths(selectedDate, 3)) : reportPeriod === 'year' ? startOfMonth(subMonths(selectedDate, 12)) : startOfMonth(subMonths(selectedDate, 1));
    const prevPeriodEnd = new Date(periodStart.getTime() - 1);
    const prevTx = transactions.filter(tx => {
      const txDate = parseISO(tx.date);
      return txDate >= prevPeriodStart && txDate <= prevPeriodEnd;
    });
    const prevIncome = prevTx.filter(tx => tx.type === 'income').reduce((a, t) => a + t.amount, 0);
    const prevExpense = prevTx.filter(tx => tx.type === 'expense').reduce((a, t) => a + t.amount, 0);
    const prevNet = prevIncome - prevExpense;
    const incomeGrowth = prevIncome > 0 ? (((totalIncome - prevIncome) / prevIncome) * 100).toFixed(1) : '0';
    const expenseGrowth = prevExpense > 0 ? (((totalExpense - prevExpense) / prevExpense) * 100).toFixed(1) : '0';

    const incomeByCategory: Record<string, number> = {};
    const expenseByCategory: Record<string, number> = {};
    periodTx.forEach(tx => {
      if (tx.type === 'income') {
        incomeByCategory[tx.category] = (incomeByCategory[tx.category] || 0) + tx.amount;
      } else {
        expenseByCategory[tx.category] = (expenseByCategory[tx.category] || 0) + tx.amount;
      }
    });

    const incomeCategoryData = Object.entries(incomeByCategory).map(([name, value]) => ({ name, value }));
    const expenseCategoryData = Object.entries(expenseByCategory).map(([name, value]) => ({ name, value }));

    const clientRevenue: Record<string, number> = {};
    periodTx.filter(tx => tx.type === 'income' && tx.clientId).forEach(tx => {
      clientRevenue[tx.clientId!] = (clientRevenue[tx.clientId!] || 0) + tx.amount;
    });
    const topClients = Object.entries(clientRevenue)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([id, revenue]) => {
        const client = clients.find(c => c.id === id);
        return { name: client?.name || 'Unknown', revenue };
      });

    const dailyData = eachDayOfInterval({ start: periodStart, end: periodEnd }).map(date => {
      const dayStr = format(date, 'yyyy-MM-dd');
      const dayTx = periodTx.filter(tx => tx.date === dayStr);
      return {
        name: format(date, 'dd MMM'),
        income: dayTx.filter(tx => tx.type === 'income').reduce((a, t) => a + t.amount, 0),
        expense: dayTx.filter(tx => tx.type === 'expense').reduce((a, t) => a + t.amount, 0),
      };
    }).filter(d => d.income > 0 || d.expense > 0);

    const partnerSplit: Record<string, { in: number, out: number }> = {};
    periodTx.forEach(tx => {
      if (tx.partner) {
        if (!partnerSplit[tx.partner]) partnerSplit[tx.partner] = { in: 0, out: 0 };
        if (tx.type === 'income') partnerSplit[tx.partner].in += tx.amount;
        else partnerSplit[tx.partner].out += tx.amount;
      }
    });

    return {
      periodStart,
      periodEnd,
      totalIncome,
      totalExpense,
      netProfit,
      profitMargin,
      txCount,
      avgTxSize,
      prevIncome,
      prevExpense,
      prevNet,
      incomeGrowth,
      expenseGrowth,
      incomeCategoryData,
      expenseCategoryData,
      topClients,
      dailyData,
      partnerSplit,
      periodLabel: `${format(periodStart, 'dd MMM')} – ${format(periodEnd, 'dd MMM yyyy')}`,
    };
  }, [transactions, clients, reportPeriod, reportMonth]);

  const PIE_COLORS = ['#34d399', '#60a5fa', '#f472b6', '#fbbf24', '#a78bfa', '#fb923c', '#2dd4bf', '#f87171'];

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

      {/* Period Insight Report */}
      <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl p-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div className="flex items-center gap-3">
            <Calendar className="w-5 h-5 text-emerald-400" />
            <h2 className="text-xl font-semibold text-white">Period Insight Report</h2>
          </div>
          <div className="flex gap-2">
            <select 
              value={reportPeriod} 
              onChange={e => setReportPeriod(e.target.value as 'month' | 'quarter' | 'year')}
              className="bg-zinc-950 border border-zinc-800 text-zinc-300 text-xs rounded-lg px-3 py-1.5 outline-none"
            >
              <option value="month">Month</option>
              <option value="quarter">Quarter</option>
              <option value="year">Year</option>
            </select>
            <input 
              type="month" 
              value={reportMonth} 
              onChange={e => setReportMonth(e.target.value)}
              className="bg-zinc-950 border border-zinc-800 text-zinc-300 text-xs rounded-lg px-3 py-1.5 outline-none"
            />
          </div>
        </div>

        {periodInsight ? (
          <>
            <p className="text-sm text-zinc-500 mb-6">{periodInsight.periodLabel}</p>

            {/* Period KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-8">
              <div className="bg-zinc-950/50 border border-zinc-800/50 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-1">
                  <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-[10px] text-zinc-500 uppercase">Income</span>
                </div>
                <p className="text-lg font-bold text-emerald-400">{formatINR(periodInsight.totalIncome)}</p>
                <span className={`text-[10px] ${Number(periodInsight.incomeGrowth) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {periodInsight.incomeGrowth}% vs prev
                </span>
              </div>
              <div className="bg-zinc-950/50 border border-zinc-800/50 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-1">
                  <ArrowDownRight className="w-3.5 h-3.5 text-red-400" />
                  <span className="text-[10px] text-zinc-500 uppercase">Expenses</span>
                </div>
                <p className="text-lg font-bold text-red-400">{formatINR(periodInsight.totalExpense)}</p>
                <span className={`text-[10px] ${Number(periodInsight.expenseGrowth) <= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {periodInsight.expenseGrowth}% vs prev
                </span>
              </div>
              <div className="bg-zinc-950/50 border border-zinc-800/50 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Wallet className="w-3.5 h-3.5 text-blue-400" />
                  <span className="text-[10px] text-zinc-500 uppercase">Net Profit</span>
                </div>
                <p className={`text-lg font-bold ${periodInsight.netProfit >= 0 ? 'text-blue-400' : 'text-red-400'}`}>{formatINR(periodInsight.netProfit)}</p>
              </div>
              <div className="bg-zinc-950/50 border border-zinc-800/50 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Activity className="w-3.5 h-3.5 text-purple-400" />
                  <span className="text-[10px] text-zinc-500 uppercase">Margin</span>
                </div>
                <p className="text-lg font-bold text-purple-400">{periodInsight.profitMargin}%</p>
              </div>
              <div className="bg-zinc-950/50 border border-zinc-800/50 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-1">
                  <FileText className="w-3.5 h-3.5 text-zinc-400" />
                  <span className="text-[10px] text-zinc-500 uppercase">Transactions</span>
                </div>
                <p className="text-lg font-bold text-zinc-300">{periodInsight.txCount}</p>
                <p className="text-[10px] text-zinc-600">Avg: {formatINR(periodInsight.avgTxSize)}</p>
              </div>
              <div className="bg-zinc-950/50 border border-zinc-800/50 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Users className="w-3.5 h-3.5 text-amber-400" />
                  <span className="text-[10px] text-zinc-500 uppercase">Top Client</span>
                </div>
                <p className="text-sm font-bold text-amber-400 truncate">{periodInsight.topClients[0]?.name || '—'}</p>
                <p className="text-[10px] text-zinc-600">{periodInsight.topClients[0] ? formatINR(periodInsight.topClients[0].revenue) : ''}</p>
              </div>
            </div>

            {/* Daily Trend + Category Breakdown */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              {/* Daily Income vs Expense */}
              <div>
                <h3 className="text-sm font-medium text-zinc-400 mb-4">Daily Cash Flow</h3>
                {periodInsight.dailyData.length > 0 ? (
                  <div className="h-[250px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={periodInsight.dailyData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                        <XAxis dataKey="name" stroke="#52525b" fontSize={11} tickLine={false} axisLine={false} />
                        <YAxis stroke="#52525b" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `₹${v/1000}k`} />
                        <RechartsTooltip 
                          contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '12px' }}
                          itemStyle={{ fontSize: '13px', fontWeight: 'bold' }}
                          formatter={(value: number) => [`₹${value.toLocaleString()}`, '']}
                        />
                        <Legend iconType="rect" />
                        <Bar name="Income" dataKey="income" fill="#34d399" radius={[4, 4, 0, 0]} />
                        <Bar name="Expense" dataKey="expense" fill="#f87171" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="h-[250px] flex items-center justify-center text-zinc-600 text-sm">No daily transactions in this period.</div>
                )}
              </div>

              {/* Income & Expense Category Pie Charts */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="text-sm font-medium text-emerald-400 mb-4">Income by Category</h3>
                  {periodInsight.incomeCategoryData.length > 0 ? (
                    <div className="h-[250px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={periodInsight.incomeCategoryData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value">
                            {periodInsight.incomeCategoryData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                          </Pie>
                          <RechartsTooltip 
                            contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '12px' }}
                            itemStyle={{ fontSize: '13px', fontWeight: 'bold' }}
                            formatter={(value: number) => [`₹${value.toLocaleString()}`, '']}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="h-[250px] flex items-center justify-center text-zinc-600 text-sm">No income data.</div>
                  )}
                  <div className="mt-2 space-y-1">
                    {periodInsight.incomeCategoryData.map((item, i) => (
                      <div key={i} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                          <span className="text-zinc-400">{item.name}</span>
                        </div>
                        <span className="text-zinc-300 font-medium">{formatINR(item.value)}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-red-400 mb-4">Expenses by Category</h3>
                  {periodInsight.expenseCategoryData.length > 0 ? (
                    <div className="h-[250px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={periodInsight.expenseCategoryData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value">
                            {periodInsight.expenseCategoryData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                          </Pie>
                          <RechartsTooltip 
                            contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '12px' }}
                            itemStyle={{ fontSize: '13px', fontWeight: 'bold' }}
                            formatter={(value: number) => [`₹${value.toLocaleString()}`, '']}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="h-[250px] flex items-center justify-center text-zinc-600 text-sm">No expense data.</div>
                  )}
                  <div className="mt-2 space-y-1">
                    {periodInsight.expenseCategoryData.map((item, i) => (
                      <div key={i} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                          <span className="text-zinc-400">{item.name}</span>
                        </div>
                        <span className="text-zinc-300 font-medium">{formatINR(item.value)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Top Clients + Partner Split */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Top Clients */}
              <div>
                <h3 className="text-sm font-medium text-zinc-400 mb-4">Top Clients by Revenue</h3>
                {periodInsight.topClients.length > 0 ? (
                  <div className="space-y-3">
                    {periodInsight.topClients.map((client, i) => {
                      const maxRev = periodInsight.topClients[0]?.revenue || 1;
                      const pct = (client.revenue / maxRev) * 100;
                      return (
                        <div key={i}>
                          <div className="flex justify-between text-xs mb-1">
                            <span className="text-zinc-300">{client.name}</span>
                            <span className="text-emerald-400 font-bold">{formatINR(client.revenue)}</span>
                          </div>
                          <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                            <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-zinc-600 text-sm py-4 text-center">No client revenue in this period.</div>
                )}
              </div>

              {/* Partner Split */}
              <div>
                <h3 className="text-sm font-medium text-zinc-400 mb-4">Partner Activity</h3>
                {Object.keys(periodInsight.partnerSplit).length > 0 ? (
                  <div className="space-y-4">
                    {Object.entries(periodInsight.partnerSplit).map(([partner, data]) => (
                      <div key={partner} className="bg-zinc-950/50 border border-zinc-800/50 rounded-xl p-4">
                        <h4 className="text-sm font-medium text-white mb-3">{partner}</h4>
                        <div className="flex justify-between text-xs mb-2">
                          <span className="text-zinc-500">Income Managed</span>
                          <span className="text-emerald-400 font-bold">{formatINR(data.in)}</span>
                        </div>
                        <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden mb-3">
                          <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${data.in > 0 ? 70 : 0}%` }} />
                        </div>
                        <div className="flex justify-between text-xs mb-2">
                          <span className="text-zinc-500">Expenses Managed</span>
                          <span className="text-red-400 font-bold">{formatINR(data.out)}</span>
                        </div>
                        <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                          <div className="h-full bg-red-500 rounded-full" style={{ width: `${data.out > 0 ? 70 : 0}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-zinc-600 text-sm py-4 text-center">No partner-tagged transactions.</div>
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="text-zinc-600 text-sm py-12 text-center">No transactions available for the selected period.</div>
        )}
      </div>

    </div>
  );
}
