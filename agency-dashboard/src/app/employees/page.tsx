'use client';

import { useState, useMemo } from 'react';
import { useAuth } from '@/store/AuthContext';
import { useFinance } from '@/store/FinanceContext';
import {
  Users, UserPlus, Copy, CheckCheck, Trash2,
  IndianRupee, ShieldCheck, BanknoteIcon, CalendarCheck,
} from 'lucide-react';
import { format } from 'date-fns';

const formatINR = (amount: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);

/** Auto-generate a unique Employee ID from the display name */
function generateEmpId(displayName: string): string {
  const base = displayName.toUpperCase().replace(/\s+/g, '').slice(0, 8);
  const suffix = Math.floor(1000 + Math.random() * 9000);
  return `EMP-${base}-${suffix}`;
}

export default function EmployeesPage() {
  const { users, createEmployee, isLoaded: authLoaded } = useAuth();
  const { salaryPayments, addSalaryPayment, deleteSalaryPayment, isLoaded: finLoaded, isAdmin } = useFinance();

  // ── Create Employee form ──
  const [empDisplayName, setEmpDisplayName] = useState('');
  const [empUsername, setEmpUsername] = useState('');   // auto-generated, but editable
  const [empEmail, setEmpEmail] = useState('');
  const [empPassword, setEmpPassword] = useState('');
  const [generatedId, setGeneratedId] = useState('');
  const [copied, setCopied] = useState(false);
  const [createSuccess, setCreateSuccess] = useState('');

  const handleGenerateId = () => {
    if (!empDisplayName.trim()) return;
    const id = generateEmpId(empDisplayName);
    setGeneratedId(id);
    setEmpUsername(id);
  };

  const handleCopyId = () => {
    navigator.clipboard.writeText(generatedId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCreateEmployee = (e: React.FormEvent) => {
    e.preventDefault();
    if (!empUsername || !empPassword || !empEmail) return;
    createEmployee(empUsername.trim(), empEmail.trim().toLowerCase(), empPassword, empDisplayName.trim());
    setCreateSuccess(`✓ Employee "${empDisplayName}" created with ID: ${empUsername}`);
    setEmpDisplayName(''); setEmpUsername(''); setEmpEmail(''); setEmpPassword(''); setGeneratedId('');
    setTimeout(() => setCreateSuccess(''), 4000);
  };

  // ── Salary Payment form ──
  const employeeUsers = users.filter(u => u.role === 'employee');
  const [salEmpId, setSalEmpId] = useState('');
  const [salAmount, setSalAmount] = useState('');
  const [salMonth, setSalMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [salDate, setSalDate] = useState(new Date().toISOString().split('T')[0]);
  const [salPaidBy, setSalPaidBy] = useState<'Pratik' | 'Pranav'>('Pratik');
  const [salMethod, setSalMethod] = useState<'cash' | 'online'>('online');
  const [salNote, setSalNote] = useState('');
  const [salSuccess, setSalSuccess] = useState('');

  const handleAddSalary = (e: React.FormEvent) => {
    e.preventDefault();
    const emp = users.find(u => u.username === salEmpId);
    if (!emp || !salAmount) return;
    addSalaryPayment({
      employeeUserId: emp.username,
      employeeName: emp.displayName,
      amount: Number(salAmount),
      month: salMonth,
      date: salDate,
      paidBy: salPaidBy,
      paymentMethod: salMethod,
      note: salNote,
    });
    setSalSuccess(`✓ Salary paid to ${emp.displayName}.`);
    setSalAmount(''); setSalNote('');
    setTimeout(() => setSalSuccess(''), 3000);
  };

  // ── Summary per employee ──
  const salarySummary = useMemo(() => {
    const map: Record<string, { name: string; total: number; count: number }> = {};
    salaryPayments.forEach(sp => {
      if (!map[sp.employeeUserId]) map[sp.employeeUserId] = { name: sp.employeeName, total: 0, count: 0 };
      map[sp.employeeUserId].total += sp.amount;
      map[sp.employeeUserId].count += 1;
    });
    return map;
  }, [salaryPayments]);

  if (!authLoaded || !finLoaded) return null;

  if (!isAdmin) {
    return (
      <div className="flex h-full items-center justify-center pt-32">
        <div className="bg-zinc-900/50 border border-red-500/20 p-8 rounded-2xl text-center max-w-sm">
          <Users className="w-12 h-12 text-red-500/50 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">Restricted Access</h2>
          <p className="text-zinc-400 text-sm">Only admins can manage employees.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-24 max-w-6xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Employee Management</h1>
        <p className="text-zinc-400">Create employee accounts, generate login IDs, and log salary payments.</p>
      </div>

      {/* ── Stat Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl p-6">
          <p className="text-zinc-400 text-sm mb-1">Total Employees</p>
          <p className="text-3xl font-bold text-white">{employeeUsers.length}</p>
        </div>
        <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl p-6">
          <p className="text-zinc-400 text-sm mb-1">Total Salary Paid</p>
          <p className="text-3xl font-bold text-emerald-400">
            {formatINR(salaryPayments.reduce((a, s) => a + s.amount, 0))}
          </p>
        </div>
        <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl p-6">
          <p className="text-zinc-400 text-sm mb-1">Payments This Month</p>
          <p className="text-3xl font-bold text-white">
            {salaryPayments.filter(s => s.month === salMonth).length}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

        {/* ── Create Employee ── */}
        <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl p-6 h-fit">
          <div className="flex items-center gap-2 mb-6">
            <UserPlus className="h-5 w-5 text-purple-400" />
            <h2 className="text-xl font-semibold text-white">Create Employee Account</h2>
          </div>
          <form onSubmit={handleCreateEmployee} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1">Display Name</label>
              <input required value={empDisplayName}
                onChange={e => { setEmpDisplayName(e.target.value); setGeneratedId(''); setEmpUsername(''); }}
                className="block w-full px-3 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-white focus:ring-2 focus:ring-purple-500 outline-none transition-all text-sm"
                placeholder="e.g. Priya Sharma" />
            </div>

            {/* Employee ID generator */}
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1">Employee ID (Login)</label>
              <div className="flex gap-2">
                <input value={empUsername} onChange={e => setEmpUsername(e.target.value)} required
                  className="flex-1 px-3 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-white font-mono text-sm focus:ring-2 focus:ring-purple-500 outline-none transition-all"
                  placeholder="Auto-generate or type manually" />
                <button type="button" onClick={handleGenerateId}
                  disabled={!empDisplayName.trim()}
                  className="px-3 py-2.5 bg-purple-700 hover:bg-purple-600 disabled:opacity-40 text-white rounded-xl text-xs font-semibold transition-all whitespace-nowrap">
                  Generate
                </button>
                {generatedId && (
                  <button type="button" onClick={handleCopyId}
                    className="px-3 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl transition-all" title="Copy ID">
                    {copied ? <CheckCheck className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                )}
              </div>
              {generatedId && (
                <p className="text-xs text-purple-400 mt-1.5">Generated: <span className="font-mono">{generatedId}</span> — share with employee</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1">Email</label>
              <input required type="email" value={empEmail} onChange={e => setEmpEmail(e.target.value)}
                className="block w-full px-3 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-white focus:ring-2 focus:ring-purple-500 outline-none transition-all text-sm"
                placeholder="employee@example.com" />
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1">Password</label>
              <input required type="password" value={empPassword} onChange={e => setEmpPassword(e.target.value)}
                className="block w-full px-3 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-white focus:ring-2 focus:ring-purple-500 outline-none transition-all text-sm"
                placeholder="Set a strong password" />
            </div>

            {createSuccess && (
              <div className="text-emerald-400 text-sm bg-emerald-500/10 border border-emerald-500/20 px-4 py-2.5 rounded-xl">{createSuccess}</div>
            )}
            <button type="submit"
              className="w-full flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-500 text-white py-2.5 rounded-xl font-semibold transition-all text-sm">
              <UserPlus className="w-4 h-4" /> Create Employee
            </button>
          </form>
        </div>

        {/* ── Employee List ── */}
        <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl p-6 flex flex-col">
          <div className="flex items-center gap-2 mb-6">
            <ShieldCheck className="h-5 w-5 text-zinc-400" />
            <h2 className="text-xl font-semibold text-white">All Employees</h2>
          </div>
          <div className="space-y-3 overflow-y-auto max-h-72 pr-1">
            {employeeUsers.length === 0 ? (
              <p className="text-zinc-500 text-sm text-center py-8">No employees yet.</p>
            ) : employeeUsers.map(u => (
              <div key={u.id} className="flex items-center justify-between p-4 bg-zinc-900/60 border border-zinc-800 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-xs font-bold">
                    {u.displayName.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">{u.displayName}</p>
                    <p className="text-xs text-zinc-500 font-mono">{u.username}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-zinc-500">Total Paid</p>
                  <p className="text-sm font-semibold text-emerald-400">
                    {formatINR(salarySummary[u.username]?.total ?? 0)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* ── Salary Payment ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

        <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl p-6 h-fit">
          <div className="flex items-center gap-2 mb-6">
            <BanknoteIcon className="h-5 w-5 text-emerald-400" />
            <h2 className="text-xl font-semibold text-white">Pay Salary</h2>
          </div>
          <form onSubmit={handleAddSalary} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1">Select Employee</label>
              <select required value={salEmpId} onChange={e => setSalEmpId(e.target.value)}
                className="block w-full px-3 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-white text-sm focus:ring-2 focus:ring-emerald-500 outline-none transition-all">
                <option value="">-- Choose Employee --</option>
                {employeeUsers.map(u => (
                  <option key={u.id} value={u.username}>{u.displayName} ({u.username})</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">Amount (₹)</label>
                <input type="number" required value={salAmount} onChange={e => setSalAmount(e.target.value)}
                  className="block w-full px-3 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-white text-sm focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                  placeholder="0" />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">For Month</label>
                <input type="month" required value={salMonth} onChange={e => setSalMonth(e.target.value)}
                  className="block w-full px-3 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-white text-sm focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                  style={{ colorScheme: 'dark' }} />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1">Payment Date (IST)</label>
              <input type="date" required value={salDate} onChange={e => setSalDate(e.target.value)}
                className="block w-full px-3 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-white text-sm focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                style={{ colorScheme: 'dark' }} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">Paid By</label>
                <select value={salPaidBy} onChange={(e: any) => setSalPaidBy(e.target.value)}
                  className="block w-full px-3 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-white text-sm focus:ring-2 focus:ring-emerald-500 outline-none transition-all">
                  <option value="Pratik">Pratik</option>
                  <option value="Pranav">Pranav</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">Method</label>
                <select value={salMethod} onChange={(e: any) => setSalMethod(e.target.value)}
                  className="block w-full px-3 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-white text-sm focus:ring-2 focus:ring-emerald-500 outline-none transition-all">
                  <option value="online">Online</option>
                  <option value="cash">Cash</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1">Note (optional)</label>
              <input value={salNote} onChange={e => setSalNote(e.target.value)}
                className="block w-full px-3 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-white text-sm focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                placeholder="e.g. April bonus, full month..." />
            </div>

            {salSuccess && (
              <div className="text-emerald-400 text-sm bg-emerald-500/10 border border-emerald-500/20 px-4 py-2.5 rounded-xl">{salSuccess}</div>
            )}
            <button type="submit"
              className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white py-2.5 rounded-xl font-semibold transition-all text-sm">
              <IndianRupee className="w-4 h-4" /> Mark as Paid
            </button>
          </form>
        </div>

        {/* ── Salary Ledger ── */}
        <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl p-6 flex flex-col h-[560px]">
          <div className="flex items-center gap-2 mb-6">
            <CalendarCheck className="h-5 w-5 text-zinc-400" />
            <h2 className="text-xl font-semibold text-white">Salary Payment Log</h2>
          </div>
          <div className="flex-1 overflow-y-auto pr-1 space-y-3">
            {salaryPayments.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-zinc-500">
                <IndianRupee className="h-10 w-10 mb-3 opacity-20" />
                <p className="text-sm">No salary payments yet.</p>
              </div>
            ) : salaryPayments.slice().reverse().map(sp => (
              <div key={sp.id} className="group flex items-center justify-between p-4 bg-zinc-900/50 border border-zinc-800 rounded-xl hover:bg-zinc-800/60 transition-all">
                <div className="flex flex-col">
                  <p className="text-sm font-semibold text-white">{sp.employeeName}</p>
                  <div className="flex flex-wrap gap-2 mt-1">
                    <span className="text-xs bg-zinc-800 text-zinc-300 px-2 py-0.5 rounded-md">Month: {sp.month}</span>
                    <span className="text-xs bg-zinc-800 text-zinc-300 px-2 py-0.5 rounded-md capitalize">{sp.paymentMethod}</span>
                    <span className="text-xs bg-zinc-800 text-zinc-300 px-2 py-0.5 rounded-md">By {sp.paidBy}</span>
                  </div>
                  {sp.note && <p className="text-xs text-zinc-500 mt-1">{sp.note}</p>}
                  <p className="text-xs text-zinc-600 mt-1">{format(new Date(sp.date), 'MMM dd, yyyy')}</p>
                </div>
                <div className="flex items-center gap-3">
                  <p className="text-lg font-bold text-emerald-400">{formatINR(sp.amount)}</p>
                  <button onClick={() => deleteSalaryPayment(sp.id)}
                    className="p-2 text-zinc-600 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all opacity-0 group-hover:opacity-100">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
