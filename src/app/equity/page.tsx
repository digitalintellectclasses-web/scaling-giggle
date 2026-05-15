'use client';

import { useState, useMemo } from 'react';
import { useFinance } from '@/store/FinanceContext';
import { useAuth } from '@/store/AuthContext';
import { db } from '@/lib/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { Landmark, ArrowUpRight, ArrowDownRight, Calendar, TrendingUp, TrendingDown, Scale, CheckCircle2, X, Info } from 'lucide-react';
import { format } from 'date-fns';

const fmt = (n: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);

export default function EquityLedger() {
  const { equities, transactions, addEquity, isAdmin, isLoaded } = useFinance();
  const { currentUser } = useAuth();
  const PARTNERS = currentUser?.id === 'guest' ? ['John Doe', 'Jane Smith'] : ['Pratik', 'Pranav'];

  // ── Form state ──
  const [partnerId, setPartnerId] = useState(PARTNERS[0]);
  const [type, setType] = useState<'investment' | 'drawing'>('investment');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [autoCreateTx, setAutoCreateTx] = useState(true);

  // ── Settle modal state ──
  const [showSettle, setShowSettle] = useState(false);
  const [settleNote, setSettleNote] = useState('');
  const [settleDate, setSettleDate] = useState(new Date().toISOString().split('T')[0]);
  const [settleLoading, setSettleLoading] = useState(false);

  // ── Explain modal state ──
  const [showExplain, setShowExplain] = useState(false);

  // ── Ledger tab ──
  const [activeTab, setActiveTab] = useState(PARTNERS[0]);

  // ── Core financials ──
  const firmIncome = useMemo(() =>
    transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0),
    [transactions]);

  const firmIncomeOnline = useMemo(() =>
    transactions.filter(t => t.type === 'income' && t.paymentMethod === 'online').reduce((s, t) => s + t.amount, 0),
    [transactions]);

  const firmIncomeCash = useMemo(() =>
    transactions.filter(t => t.type === 'income' && t.paymentMethod === 'cash').reduce((s, t) => s + t.amount, 0),
    [transactions]);

  const firmExpenses = useMemo(() =>
    transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0),
    [transactions]);

  const firmNet = firmIncome - firmExpenses; // positive = profit, negative = deficit
  const partnerShare = firmNet / 2; // each partner's 50% of firm P&L

  // ── Per-partner equity stats ──
  const getStats = (pid: string) => {
    const invested = equities
      .filter(e => e.partnerId === pid && e.type === 'investment')
      .reduce((s, e) => s + e.amount, 0);

    const drawn = equities
      .filter(e => e.partnerId === pid && e.type === 'drawing')
      .reduce((s, e) => s + e.amount, 0);

    // What they actually managed/paid in expenses (their sweat/cash in firm ops)
    const managed = transactions
      .filter(t => t.type === 'expense' && t.managedBy === pid)
      .reduce((s, t) => s + t.amount, 0);

    // Income they collected on behalf of the firm
    const collected = transactions
      .filter(t => t.type === 'income' && t.managedBy === pid)
      .reduce((s, t) => s + t.amount, 0);

    // Total put in = manual investments + expenses they managed
    const totalIn = invested + managed;
    // Total gained = drawings + income collected
    const totalGain = drawn + collected;

    // Net position: positive = firm owes them, negative = they owe firm
    // Formula: (Contributions - Withdrawals) + (50% share of P&L)
    const netPosition = (totalIn - totalGain) + partnerShare;

    return { invested, drawn, managed, collected, totalIn, totalGain, netPosition };
  };

  const statsPartner1 = getStats(PARTNERS[0]);
  const statsPartner2 = getStats(PARTNERS[1]);

  // Settlement: difference between partners' net positions
  // If Pratik's netPosition > Pranav's, Pranav owes Pratik half the difference
  const settlementAmount = Math.abs(statsPartner1.netPosition - statsPartner2.netPosition) / 2;
  const creditor = statsPartner1.netPosition > statsPartner2.netPosition ? PARTNERS[0] : PARTNERS[1];
  const debtor = creditor === PARTNERS[0] ? PARTNERS[1] : PARTNERS[0];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || isNaN(Number(amount))) return;
    await addEquity({ partnerId, type, amount: Number(amount), date }, autoCreateTx);
    setAmount('');
  };

  const handleSettle = async () => {
    if (settlementAmount < 1) return;
    setSettleLoading(true);
    try {
      // Debtor records a drawing (paying out), creditor records an investment (receiving)
      const id1 = crypto.randomUUID();
      const id2 = crypto.randomUUID();
      await setDoc(doc(db, 'equities', id1), {
        id: id1, partnerId: debtor, type: 'drawing',
        amount: settlementAmount, date: settleDate,
        note: settleNote || `Settlement payment to ${creditor}`
      });
      await setDoc(doc(db, 'equities', id2), {
        id: id2, partnerId: creditor, type: 'investment',
        amount: settlementAmount, date: settleDate,
        note: settleNote || `Settlement received from ${debtor}`
      });
      setShowSettle(false);
      setSettleNote('');
      alert(`✓ Settlement of ${fmt(settlementAmount)} recorded. ${debtor} → ${creditor}.`);
    } catch (err: any) {
      alert('Error: ' + err.message);
    } finally {
      setSettleLoading(false);
    }
  };

  if (!isLoaded) return null;

  if (!isAdmin) {
    return (
      <div className="flex h-full items-center justify-center pt-32">
        <div className="bg-zinc-900/50 border border-red-500/20 p-8 rounded-2xl text-center max-w-sm">
          <Landmark className="w-12 h-12 text-red-500/50 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">Restricted Access</h2>
          <p className="text-zinc-400 text-sm">Admin mode required to view Partner Equity.</p>
        </div>
      </div>
    );
  }

  const renderPartnerCard = (pid: string, stats: ReturnType<typeof getStats>, accent: string) => (
    <div className={`bg-zinc-900/40 border border-zinc-800 rounded-2xl p-6 space-y-4`}>
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-white">{pid}</h2>
        <span className={`px-3 py-1 rounded-lg text-sm font-bold ${accent === 'emerald' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-blue-500/10 text-blue-400'}`}>50%</span>
      </div>

      {/* Net Position */}
      <div className={`p-4 rounded-xl border ${stats.netPosition >= 0 ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-red-500/5 border-red-500/20'}`}>
        <p className="text-xs text-zinc-500 mb-1 uppercase tracking-wider font-semibold">Net Position</p>
        <p className={`text-2xl font-black ${stats.netPosition >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{fmt(Math.abs(stats.netPosition))}</p>
        <p className="text-xs text-zinc-500 mt-1">{stats.netPosition >= 0 ? '← Firm owes this partner' : '← Partner owes the firm'}</p>
      </div>

      {/* Investment vs Gain */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
          <div className="flex items-center gap-1.5 mb-2">
            <ArrowUpRight className="w-4 h-4 text-emerald-400" />
            <span className="text-xs text-zinc-500 font-semibold uppercase tracking-wide">Contributions</span>
          </div>
          <p className="text-emerald-400 font-bold text-lg">{fmt(stats.totalIn)}</p>
          <div className="mt-2 space-y-1 text-[10px] text-zinc-600">
            <div className="flex justify-between"><span>Manual investment</span><span>{fmt(stats.invested)}</span></div>
            <div className="flex justify-between"><span>Expenses managed</span><span>{fmt(stats.managed)}</span></div>
          </div>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
          <div className="flex items-center gap-1.5 mb-2">
            <ArrowDownRight className="w-4 h-4 text-blue-400" />
            <span className="text-xs text-zinc-500 font-semibold uppercase tracking-wide">Withdrawals</span>
          </div>
          <p className="text-blue-400 font-bold text-lg">{fmt(stats.totalGain)}</p>
          <div className="mt-2 space-y-1 text-[10px] text-zinc-600">
            <div className="flex justify-between"><span>Drawings</span><span>{fmt(stats.drawn)}</span></div>
            <div className="flex justify-between"><span>Income collected</span><span>{fmt(stats.collected)}</span></div>
          </div>
        </div>
      </div>
      
      {/* P&L Distribution */}
      <div className={`p-3 rounded-xl border flex items-center justify-between ${partnerShare >= 0 ? 'bg-blue-500/5 border-blue-500/20' : 'bg-amber-500/5 border-amber-500/20'}`}>
        <div>
          <p className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold">50% P&L Share</p>
          <p className={`text-sm font-black ${partnerShare >= 0 ? 'text-blue-400' : 'text-amber-400'}`}>
            {partnerShare >= 0 ? '+' : '-'}{fmt(Math.abs(partnerShare))}
          </p>
        </div>
        <div className={`text-[9px] px-2 py-0.5 rounded font-bold uppercase ${partnerShare >= 0 ? 'bg-blue-500/10 text-blue-400' : 'bg-amber-500/10 text-amber-400'}`}>
          {partnerShare >= 0 ? 'Profit' : 'Deficit'}
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6 pb-20 max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Partner Equity</h1>
          <p className="text-zinc-400 text-sm">Fair accounting — firm P&L distributes equally. Partner expenses are counted as contributions.</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => setShowExplain(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-500/10 border border-blue-500/30 text-blue-400 hover:bg-blue-500/20 rounded-xl text-sm font-bold transition-all">
            <Info className="w-4 h-4" /> How it works
          </button>
          {settlementAmount > 0.5 && (
            <button onClick={() => setShowSettle(true)}
              className="flex items-center gap-2 px-5 py-2.5 bg-amber-500/10 border border-amber-500/30 text-amber-400 hover:bg-amber-500/20 rounded-xl text-sm font-bold transition-all">
              <Scale className="w-4 h-4" /> Settle Balance
            </button>
          )}
        </div>
      </div>

      {/* Firm Health */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2 text-zinc-500">
            <TrendingUp className="w-4 h-4" /><span className="text-xs font-semibold uppercase tracking-wider">Firm Income</span>
          </div>
          <p className="text-xl font-black text-emerald-400">{fmt(Math.abs(firmIncome))}</p>
          <div className="mt-2 flex gap-3 text-[10px] text-zinc-500">
            <span>Online: <span className="text-emerald-400/80">{fmt(firmIncomeOnline)}</span></span>
            <span>Cash: <span className="text-emerald-400/80">{fmt(firmIncomeCash)}</span></span>
          </div>
        </div>

        <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2 text-zinc-500">
            <TrendingDown className="w-4 h-4" /><span className="text-xs font-semibold uppercase tracking-wider">Firm Expenses</span>
          </div>
          <p className="text-xl font-black text-red-400">{fmt(Math.abs(firmExpenses))}</p>
        </div>

        <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2 text-zinc-500">
            <Scale className="w-4 h-4" /><span className="text-xs font-semibold uppercase tracking-wider">Net P&L</span>
          </div>
          <p className={`text-xl font-black ${firmNet >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{fmt(Math.abs(firmNet))}</p>
          {firmNet < 0 && <p className="text-[10px] text-amber-400 mt-1">⚠ Deficit — partners covering the gap</p>}
        </div>

        <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2 text-zinc-500">
            <Landmark className="w-4 h-4" /><span className="text-xs font-semibold uppercase tracking-wider">Each Partner Share</span>
          </div>
          <p className={`text-xl font-black ${partnerShare >= 0 ? 'text-blue-400' : 'text-amber-400'}`}>{fmt(Math.abs(partnerShare))}</p>
        </div>
      </div>

      {/* Partner Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {renderPartnerCard(PARTNERS[0], statsPartner1, 'emerald')}
        {renderPartnerCard(PARTNERS[1], statsPartner2, 'blue')}
      </div>

      {/* Bottom: Form + Ledger */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-2">

        {/* Form */}
        <div className="border border-zinc-800 bg-zinc-900/40 rounded-2xl p-6 h-fit">
          <h2 className="text-lg font-semibold text-white mb-5">Record Equity Flow</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-2 p-1 bg-zinc-900 border border-zinc-800 rounded-lg">
              {PARTNERS.map(p => (
                <button key={p} type="button" onClick={() => setPartnerId(p)}
                  className={`py-2 text-sm font-medium rounded-md transition-all ${partnerId === p ? 'bg-zinc-700 text-white' : 'text-zinc-400 hover:text-white'}`}>{p}</button>
              ))}
            </div>
            <div>
              <label className="block text-sm text-zinc-400 mb-1">Type</label>
              <select value={type} onChange={(e: any) => setType(e.target.value)}
                className="block w-full px-3 py-2.5 bg-zinc-900 border border-zinc-800 rounded-lg text-white outline-none focus:ring-2 focus:ring-emerald-500">
                <option value="investment">Investment (Cash In)</option>
                <option value="drawing">Drawing (Cash Out)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-zinc-400 mb-1">Amount (INR)</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 text-sm">₹</span>
                <input type="number" required value={amount} onChange={e => setAmount(e.target.value)}
                  className="block w-full pl-8 py-2.5 bg-zinc-900 border border-zinc-800 rounded-lg text-white outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="0.00" />
              </div>
            </div>
            <div>
              <label className="block text-sm text-zinc-400 mb-1">Date</label>
              <input type="date" required value={date} onChange={e => setDate(e.target.value)}
                className="block w-full px-3 py-2.5 bg-zinc-900 border border-zinc-800 rounded-lg text-white outline-none focus:ring-2 focus:ring-emerald-500"
                style={{ colorScheme: 'dark' }} />
            </div>
            <label className="flex items-center gap-3 cursor-pointer py-1">
              <input type="checkbox" checked={autoCreateTx} onChange={e => setAutoCreateTx(e.target.checked)}
                className="w-4 h-4 rounded border-zinc-700 bg-zinc-900 text-emerald-500 focus:ring-emerald-500 focus:ring-offset-0" />
              <div>
                <p className="text-sm text-zinc-300">Create linked transaction</p>
                <p className="text-[10px] text-zinc-600">Auto-add to Financials ledger</p>
              </div>
            </label>
            <button type="submit" className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white py-2.5 rounded-lg font-medium transition-all">
              <Landmark className="h-5 w-5" /> Record
            </button>
          </form>
        </div>

        {/* Ledger */}
        <div className="lg:col-span-2 border border-zinc-800 bg-zinc-900/40 rounded-2xl p-6 flex flex-col" style={{ height: '520px' }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">Equity Log</h2>
            <div className="flex bg-zinc-900 border border-zinc-800 rounded-xl p-0.5">
              {PARTNERS.map(p => (
                <button key={p} onClick={() => setActiveTab(p)}
                  className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${activeTab === p ? 'bg-zinc-700 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}>{p}</button>
              ))}
            </div>
          </div>
          <div className="flex-1 overflow-y-auto pr-1 space-y-2">
            {equities.filter(e => e.partnerId === activeTab).length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-zinc-500">
                <Landmark className="h-10 w-10 mb-3 opacity-20" />
                <p className="text-sm">No equity records for {activeTab}.</p>
              </div>
            ) : (
              equities.filter(e => e.partnerId === activeTab).slice().reverse().map(eq => (
                <div key={eq.id} className="flex items-center justify-between p-4 bg-zinc-900/50 border border-zinc-800 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${eq.type === 'investment' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                      {eq.type === 'investment' ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
                    </div>
                    <div>
                      <p className="text-white text-sm font-medium">
                        {(eq as any).note || (eq.type === 'investment' ? 'Equity Investment' : 'Drawing')}
                      </p>
                      <p className="text-zinc-500 text-xs">{format(new Date(eq.date), 'dd MMM yyyy')} • {eq.type}</p>
                    </div>
                  </div>
                  <span className={`font-bold text-sm ${eq.type === 'investment' ? 'text-emerald-400' : 'text-red-400'}`}>
                    {eq.type === 'investment' ? '+' : '-'}{fmt(eq.amount)}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Settle Modal */}
      {showSettle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-6 w-full max-w-md shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="bg-amber-500/10 p-2 rounded-lg"><Scale className="w-5 h-5 text-amber-400" /></div>
                <h3 className="text-lg font-bold text-white">Settle Balance</h3>
              </div>
              <button onClick={() => setShowSettle(false)} className="text-zinc-500 hover:text-white transition-colors"><X className="w-5 h-5" /></button>
            </div>

            <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 mb-5 space-y-2 text-sm">
              <div className="flex justify-between text-zinc-400">
                <span>{PARTNERS[0]} net position</span><span className={statsPartner1.netPosition >= 0 ? 'text-emerald-400' : 'text-red-400'}>{fmt(statsPartner1.netPosition)}</span>
              </div>
              <div className="flex justify-between text-zinc-400">
                <span>{PARTNERS[1]} net position</span><span className={statsPartner2.netPosition >= 0 ? 'text-emerald-400' : 'text-red-400'}>{fmt(statsPartner2.netPosition)}</span>
              </div>
              <div className="border-t border-zinc-800 pt-2 mt-2 flex justify-between font-bold">
                <span className="text-amber-300">Settlement needed</span>
                <span className="text-amber-400">{fmt(settlementAmount)}</span>
              </div>
              <p className="text-[11px] text-zinc-500 pt-1">
                <span className="text-white font-semibold">{debtor}</span> should pay <span className="text-amber-400 font-bold">{fmt(settlementAmount)}</span> to <span className="text-white font-semibold">{creditor}</span> to equalise positions.
              </p>
            </div>

            <div className="space-y-3 mb-5">
              <div>
                <label className="block text-xs text-zinc-500 mb-1">Settlement Date</label>
                <input type="date" value={settleDate} onChange={e => setSettleDate(e.target.value)}
                  className="w-full px-3 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-white outline-none focus:border-amber-500 text-sm"
                  style={{ colorScheme: 'dark' }} />
              </div>
              <div>
                <label className="block text-xs text-zinc-500 mb-1">Note (optional)</label>
                <input type="text" value={settleNote} onChange={e => setSettleNote(e.target.value)}
                  placeholder="e.g. Monthly settlement — May 2026"
                  className="w-full px-3 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-white outline-none focus:border-amber-500 text-sm" />
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={() => setShowSettle(false)}
                className="flex-1 py-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl font-bold text-sm transition-all">Cancel</button>
              <button onClick={handleSettle} disabled={settleLoading}
                className="flex-1 py-3 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-black rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2">
                <CheckCircle2 className="w-4 h-4" /> {settleLoading ? 'Recording...' : 'Confirm Settle'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Explain Modal */}
      {showExplain && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-6 w-full max-w-2xl shadow-2xl animate-in fade-in zoom-in duration-200 overflow-y-auto max-h-[90vh]">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="bg-blue-500/10 p-2 rounded-lg"><Info className="w-5 h-5 text-blue-400" /></div>
                <h3 className="text-lg font-bold text-white">How Equity is Calculated</h3>
              </div>
              <button onClick={() => setShowExplain(false)} className="text-zinc-500 hover:text-white transition-colors"><X className="w-5 h-5" /></button>
            </div>
            
            <div className="space-y-6 text-sm text-zinc-300">
              <p>
                The Partner Equity ledger tracks every partner's net position with the firm, balancing what they put into the business against what they take out. It ensures fairness by equally distributing profits and accounting for personal expenses made on behalf of the firm.
              </p>

              <div className="space-y-3">
                <h4 className="text-white font-semibold flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-emerald-400" /> 1. Firm P&L and Profit Share
                </h4>
                <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4">
                  <p className="mb-2"><span className="text-zinc-400">Firm Income:</span> Total of all transactions marked as 'income'.</p>
                  <p className="mb-2"><span className="text-zinc-400">Firm Expenses:</span> Total of all transactions marked as 'expense'.</p>
                  <p className="mb-2"><span className="text-zinc-400">Net P&L:</span> Firm Income - Firm Expenses. ({fmt(firmIncome)} - {fmt(firmExpenses)} = <span className={firmNet >= 0 ? "text-emerald-400" : "text-red-400"}>{fmt(firmNet)}</span>)</p>
                  <p><span className="text-zinc-400">Partner Share (50%):</span> {fmt(firmNet)} / 2 = <span className="font-bold text-blue-400">{fmt(partnerShare)}</span></p>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="text-white font-semibold flex items-center gap-2">
                  <ArrowUpRight className="w-4 h-4 text-emerald-400" /> 2. Partner Contributions
                </h4>
                <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4">
                  <p className="mb-2">What a partner has given to the firm. This consists of:</p>
                  <ul className="list-disc pl-5 space-y-1 text-zinc-400">
                    <li><strong className="text-zinc-300">Manual Investments:</strong> Direct cash injections into the firm.</li>
                    <li><strong className="text-zinc-300">Expenses Managed:</strong> Firm expenses paid out of the partner's own pocket (tracked via "Managed By" in Financials).</li>
                  </ul>
                  <p className="mt-2 text-emerald-400 font-semibold">Formula: Manual Investments + Expenses Managed</p>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="text-white font-semibold flex items-center gap-2">
                  <ArrowDownRight className="w-4 h-4 text-blue-400" /> 3. Partner Withdrawals & Collections
                </h4>
                <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4">
                  <p className="mb-2">What a partner has received from or collected for the firm. This consists of:</p>
                  <ul className="list-disc pl-5 space-y-1 text-zinc-400">
                    <li><strong className="text-zinc-300">Drawings:</strong> Cash taken out by the partner for personal use.</li>
                    <li><strong className="text-zinc-300">Income Collected:</strong> Income received by this partner on behalf of the firm (this reduces what the firm owes them).</li>
                  </ul>
                  <p className="mt-2 text-blue-400 font-semibold">Formula: Drawings + Income Collected</p>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="text-white font-semibold flex items-center gap-2">
                  <Scale className="w-4 h-4 text-amber-400" /> 4. Net Position & Profit/Loss Share
                </h4>
                <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4">
                  <p className="mb-2">The net position combines cash flow with the firm's overall performance.</p>
                  <p className="mb-2"><strong className="text-white">Net Position Formula:</strong> (Contributions - Withdrawals) + <span className="text-blue-400">50% P&L Share</span></p>
                  <ul className="list-disc pl-5 space-y-1 text-zinc-400">
                    <li>If the firm is in <strong className="text-emerald-400">Profit</strong>: The 50% share increases the partner's equity.</li>
                    <li>If the firm is in <strong className="text-red-400">Deficit</strong>: The 50% share decreases the partner's equity.</li>
                  </ul>
                  <p className="mt-3 pt-3 border-t border-zinc-800">
                    <strong className="text-white">Settlement:</strong> To balance the books, the partner with the lower Net Position owes half the difference to the partner with the higher Net Position.
                  </p>
                </div>
              </div>

            </div>

            <div className="mt-6">
              <button onClick={() => setShowExplain(false)}
                className="w-full py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl font-bold text-sm transition-all">Understood</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
