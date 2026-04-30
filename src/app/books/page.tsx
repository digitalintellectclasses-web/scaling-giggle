'use client';

import { useState, useMemo, useRef } from 'react';
import { useFinance } from '@/store/FinanceContext';
import { useRouter } from 'next/navigation';
import { BookOpen, Download, Calendar, IndianRupee, TrendingUp } from 'lucide-react';
import { format } from 'date-fns';

const formatINR = (amount: number) => {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);
};

export default function BooksPage() {
  const { transactions, isAdmin, isLoaded } = useFinance();
  const router = useRouter();
  
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  const reportRef = useRef<HTMLDivElement>(null);

  if (!isLoaded) return <div className="h-full w-full flex items-center justify-center"><div className="animate-spin h-8 w-8 border-2 border-emerald-500 rounded-full border-t-transparent"></div></div>;

  if (!isAdmin) {
    router.push('/work');
    return null;
  }

  const [yStr, mStr] = selectedMonth.split('-');
  const y = parseInt(yStr, 10);
  const m = parseInt(mStr, 10) - 1;

  const monthlyTransactions = transactions.filter(t => {
    const [ty, tm] = t.date.split('-').map(Number);
    return (tm - 1) === m && ty === y;
  });

  const totalIncome = monthlyTransactions.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0);
  const totalExpense = monthlyTransactions.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0);
  const netProfit = totalIncome - totalExpense;

  const handleDownloadPdf = async () => {
    if (typeof window === 'undefined') return;
    const html2pdf = (await import('html2pdf.js')).default;
    const element = reportRef.current;
    
    // Configure options
    const opt = {
      margin:       0.5,
      filename:     `Monthly_Report_${selectedMonth}.pdf`,
      image:        { type: 'jpeg', quality: 0.98 },
      html2canvas:  { scale: 2 },
      jsPDF:        { unit: 'in', format: 'letter', orientation: 'portrait' }
    };

    html2pdf().set(opt).from(element).save();
  };

  return (
    <div className="space-y-6 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Books & Reports</h1>
          <p className="text-zinc-400">Generate and download monthly financial reports.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <input 
            type="month" 
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="bg-zinc-900 border border-zinc-800 text-white px-3 py-2 rounded-xl outline-none focus:border-emerald-500"
          />
          <button 
            onClick={handleDownloadPdf}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-xl font-medium transition-all"
          >
            <Download className="w-4 h-4" /> Download PDF
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-8 overflow-x-auto shadow-xl" style={{ minWidth: '800px' }}>
        {/* Printable Area */}
        <div ref={reportRef} className="bg-white text-zinc-900 p-8">
          {/* Header */}
          <div className="flex justify-between items-start border-b-2 border-zinc-200 pb-6 mb-8">
            <div>
              <h2 className="text-3xl font-bold text-emerald-700">Monthly Financial Report</h2>
              <p className="text-zinc-500 mt-1">Agency Finance Management</p>
            </div>
            <div className="text-right">
              <p className="font-bold text-zinc-800 text-lg">{format(new Date(y, m), 'MMMM yyyy')}</p>
              <p className="text-sm text-zinc-500">Generated on {format(new Date(), 'dd MMM, yyyy')}</p>
            </div>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-3 gap-6 mb-10">
            <div className="p-6 bg-zinc-50 rounded-xl border border-zinc-100">
              <p className="text-sm text-zinc-500 font-semibold uppercase">Total Income</p>
              <p className="text-3xl font-bold text-emerald-600 mt-2">{formatINR(totalIncome)}</p>
            </div>
            <div className="p-6 bg-zinc-50 rounded-xl border border-zinc-100">
              <p className="text-sm text-zinc-500 font-semibold uppercase">Total Expenses</p>
              <p className="text-3xl font-bold text-red-600 mt-2">{formatINR(totalExpense)}</p>
            </div>
            <div className="p-6 bg-zinc-50 rounded-xl border border-zinc-100">
              <p className="text-sm text-zinc-500 font-semibold uppercase">Net Profit</p>
              <p className="text-3xl font-bold text-blue-600 mt-2">{formatINR(netProfit)}</p>
            </div>
          </div>

          {/* Transactions List */}
          <h3 className="text-xl font-bold mb-4">Transaction Ledger</h3>
          {monthlyTransactions.length === 0 ? (
            <p className="text-zinc-500 py-10 text-center bg-zinc-50 rounded-lg border border-dashed border-zinc-200">
              No transactions recorded for {format(new Date(y, m), 'MMMM yyyy')}.
            </p>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b-2 border-zinc-200 text-zinc-500 text-sm">
                  <th className="py-3 px-4 font-semibold uppercase">Date</th>
                  <th className="py-3 px-4 font-semibold uppercase">Description</th>
                  <th className="py-3 px-4 font-semibold uppercase">Category</th>
                  <th className="py-3 px-4 font-semibold uppercase">Method</th>
                  <th className="py-3 px-4 font-semibold uppercase text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {monthlyTransactions.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()).map(t => (
                  <tr key={t.id} className="border-b border-zinc-100 text-sm hover:bg-zinc-50">
                    <td className="py-3 px-4 text-zinc-600 whitespace-nowrap">{format(new Date(t.date), 'dd MMM yyyy')}</td>
                    <td className="py-3 px-4 font-medium text-zinc-800">{t.description}</td>
                    <td className="py-3 px-4 text-zinc-600">{t.category}</td>
                    <td className="py-3 px-4 text-zinc-600 uppercase text-xs">{t.paymentMethod}</td>
                    <td className={`py-3 px-4 font-bold text-right ${t.type === 'income' ? 'text-emerald-600' : 'text-red-600'}`}>
                      {t.type === 'income' ? '+' : '-'}{formatINR(t.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          
          <div className="mt-16 pt-8 border-t border-zinc-200 text-center text-zinc-400 text-xs">
            <p>This is a system-generated financial report.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
