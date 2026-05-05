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
    const element = reportRef.current;
    if (!element) return;

    const html2pdf = (await import('html2pdf.js')).default;
    
    // Configure options
    const opt = {
      margin:       0.5,
      filename:     `Monthly_Report_${selectedMonth}.pdf`,
      image:        { type: 'jpeg' as 'jpeg', quality: 0.98 },
      html2canvas:  { scale: 2 },
      jsPDF:        { unit: 'in', format: 'letter', orientation: 'portrait' as 'portrait' }
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
        <div ref={reportRef} style={{ backgroundColor: '#ffffff', color: '#18181b', padding: '32px', minHeight: '800px' }}>
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid #e4e4e7', paddingBottom: '24px', marginBottom: '32px' }}>
            <div>
              <h2 style={{ fontSize: '30px', fontWeight: 'bold', color: '#047857', margin: 0 }}>Monthly Financial Report</h2>
              <p style={{ color: '#71717a', marginTop: '4px' }}>Agency Finance Management</p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <p style={{ fontWeight: 'bold', color: '#27272a', fontSize: '18px', margin: 0 }}>{format(new Date(y, m), 'MMMM yyyy')}</p>
              <p style={{ fontSize: '14px', color: '#71717a', margin: 0 }}>Generated on {format(new Date(), 'dd MMM, yyyy')}</p>
            </div>
          </div>

          {/* Summary Cards */}
          <div style={{ display: 'flex', gap: '24px', marginBottom: '40px' }}>
            <div style={{ padding: '24px', backgroundColor: '#fafafa', borderRadius: '12px', border: '1px solid #f4f4f5', flex: 1 }}>
              <p style={{ fontSize: '14px', color: '#71717a', fontWeight: 600, textTransform: 'uppercase', margin: 0 }}>Total Income</p>
              <p style={{ fontSize: '30px', fontWeight: 'bold', color: '#059669', marginTop: '8px', marginBottom: 0 }}>{formatINR(totalIncome)}</p>
            </div>
            <div style={{ padding: '24px', backgroundColor: '#fafafa', borderRadius: '12px', border: '1px solid #f4f4f5', flex: 1 }}>
              <p style={{ fontSize: '14px', color: '#71717a', fontWeight: 600, textTransform: 'uppercase', margin: 0 }}>Total Expenses</p>
              <p style={{ fontSize: '30px', fontWeight: 'bold', color: '#dc2626', marginTop: '8px', marginBottom: 0 }}>{formatINR(totalExpense)}</p>
            </div>
            <div style={{ padding: '24px', backgroundColor: '#fafafa', borderRadius: '12px', border: '1px solid #f4f4f5', flex: 1 }}>
              <p style={{ fontSize: '14px', color: '#71717a', fontWeight: 600, textTransform: 'uppercase', margin: 0 }}>Net Profit</p>
              <p style={{ fontSize: '30px', fontWeight: 'bold', color: '#2563eb', marginTop: '8px', marginBottom: 0 }}>{formatINR(netProfit)}</p>
            </div>
          </div>

          {/* Transactions List */}
          <h3 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '16px' }}>Transaction Ledger</h3>
          {monthlyTransactions.length === 0 ? (
            <p style={{ color: '#71717a', padding: '40px 0', textAlign: 'center', backgroundColor: '#fafafa', borderRadius: '8px', border: '1px dashed #e4e4e7' }}>
              No transactions recorded for {format(new Date(y, m), 'MMMM yyyy')}.
            </p>
          ) : (
            <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #e4e4e7', color: '#71717a', fontSize: '14px' }}>
                  <th style={{ padding: '12px 16px', fontWeight: 600, textTransform: 'uppercase' }}>Date</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600, textTransform: 'uppercase' }}>Description</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600, textTransform: 'uppercase' }}>Category</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600, textTransform: 'uppercase' }}>Method</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600, textTransform: 'uppercase', textAlign: 'right' }}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {monthlyTransactions.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()).map(t => (
                  <tr key={t.id} style={{ borderBottom: '1px solid #f4f4f5', fontSize: '14px' }}>
                    <td style={{ padding: '12px 16px', color: '#52525b', whiteSpace: 'nowrap' }}>{format(new Date(t.date), 'dd MMM yyyy')}</td>
                    <td style={{ padding: '12px 16px', fontWeight: 500, color: '#27272a' }}>{t.description}</td>
                    <td style={{ padding: '12px 16px', color: '#52525b' }}>{t.category}</td>
                    <td style={{ padding: '12px 16px', color: '#52525b', textTransform: 'uppercase', fontSize: '12px' }}>{t.paymentMethod}</td>
                    <td style={{ padding: '12px 16px', fontWeight: 'bold', textAlign: 'right', color: t.type === 'income' ? '#059669' : '#dc2626' }}>
                      {t.type === 'income' ? '+' : '-'}{formatINR(t.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          
          <div style={{ marginTop: '64px', paddingTop: '32px', borderTop: '1px solid #e4e4e7', textAlign: 'center', color: '#a1a1aa', fontSize: '12px' }}>
            <p>This is a system-generated financial report.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
