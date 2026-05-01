'use client';

import { useState } from 'react';
import { useAuth } from '@/store/AuthContext';
import { useFinance } from '@/store/FinanceContext';
import {
  Settings, ShieldCheck, Users, Trash2, RefreshCw,
  AlertTriangle, ChevronDown, ChevronUp, Lock, UserCog,
  Eye, EyeOff, Save, RotateCcw, Info, Crown, User, Palette, Sparkles, Zap
} from 'lucide-react';
import { db } from '@/lib/firebase';
import { doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { cn } from '@/lib/utils';

// ── Helper ──────────────────────────────────────────────────
const Badge = ({ children, color }: { children: React.ReactNode; color: 'purple' | 'emerald' | 'zinc' | 'red' }) => {
  const colors = {
    purple: 'bg-purple-500/15 text-purple-300 border-purple-500/30',
    emerald: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
    zinc: 'bg-zinc-800 text-zinc-400 border-zinc-700',
    red: 'bg-red-500/15 text-red-300 border-red-500/30',
  };
  return (
    <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold border', colors[color])}>
      {children}
    </span>
  );
};

const Section = ({ title, icon: Icon, children, defaultOpen = true }:
  { title: string; icon: any; children: React.ReactNode; defaultOpen?: boolean }) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between p-6 text-left hover:bg-zinc-800/30 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center">
            <Icon className="w-4 h-4 text-emerald-400" />
          </div>
          <h2 className="text-base font-semibold text-white">{title}</h2>
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-zinc-500" /> : <ChevronDown className="w-4 h-4 text-zinc-500" />}
      </button>
      {open && <div className="px-6 pb-6 border-t border-zinc-800/60">{children}</div>}
    </div>
  );
};

// ── Main Page ────────────────────────────────────────────────
export default function SettingsPage() {
  const { users, currentUser, updatePassword } = useAuth();
  const { isAdmin, requestGlobalReset } = useFinance();

  // Password change
  const [showPwForm, setShowPwForm] = useState(false);
  const [newPw, setNewPw] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [pwMsg, setPwMsg] = useState('');

  // Role change
  const [roleMsg, setRoleMsg] = useState('');
  const [roleLoading, setRoleLoading] = useState<string | null>(null);

  // Delete user
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [deleteMsg, setDeleteMsg] = useState('');

  if (!isAdmin) {
    return (
      <div className="flex h-full items-center justify-center pt-32">
        <div className="bg-zinc-900/50 border border-red-500/20 p-8 rounded-2xl text-center max-w-sm">
          <Lock className="w-12 h-12 text-red-500/50 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">Admin Only</h2>
          <p className="text-zinc-400 text-sm">Only administrators can access system settings.</p>
        </div>
      </div>
    );
  }

  // ── Handlers ──────────────────────────────────────────────
  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPw.length < 6) { setPwMsg('Password must be at least 6 characters.'); return; }
    try {
      await updatePassword(newPw);
      setPwMsg('✓ Password updated successfully.');
      setNewPw(''); setShowPwForm(false);
    } catch { setPwMsg('Failed to update password. Try again.'); }
    setTimeout(() => setPwMsg(''), 4000);
  };

  const handleRoleToggle = async (userId: string, currentRole: string) => {
    if (userId === currentUser?.id) {
      setRoleMsg('⚠ You cannot change your own role.'); setTimeout(() => setRoleMsg(''), 3000); return;
    }
    const newRole = currentRole === 'admin' ? 'employee' : 'admin';
    setRoleLoading(userId);
    try {
      await updateDoc(doc(db, 'users', userId), { role: newRole });
      setRoleMsg(`✓ Role updated to ${newRole}.`);
    } catch { setRoleMsg('Failed to update role. Check Firestore rules.'); }
    setRoleLoading(null);
    setTimeout(() => setRoleMsg(''), 3000);
  };

  const handleDeleteUser = async (userId: string) => {
    if (userId === currentUser?.id) {
      setDeleteMsg('⚠ You cannot delete your own account.'); setTimeout(() => setDeleteMsg(''), 3000); return;
    }
    try {
      await deleteDoc(doc(db, 'users', userId));
      setDeleteMsg('✓ User removed from the system.');
    } catch { setDeleteMsg('Failed to delete user. Check Firestore rules.'); }
    setDeleteConfirm(null);
    setTimeout(() => setDeleteMsg(''), 4000);
  };

  const admins = users.filter(u => u.role === 'admin');
  const employees = users.filter(u => u.role === 'employee');

  return (
    <div className="space-y-6 pb-24 max-w-4xl mx-auto">

      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white mb-2 flex items-center gap-3">
          <Settings className="w-7 h-7 text-emerald-400" />
          Admin Settings
        </h1>
        <p className="text-zinc-400 text-sm">Configure system rules, manage user roles, and control access permissions.</p>
      </div>

      {/* ── 1. Role Overview ───────────────────────────────────── */}
      <Section title="Role Overview" icon={ShieldCheck}>
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Admin Privileges */}
          <div className="rounded-xl border border-purple-500/20 bg-purple-500/5 p-5">
            <div className="flex items-center gap-2 mb-3">
              <Crown className="w-4 h-4 text-purple-400" />
              <h3 className="text-sm font-bold text-purple-300">Admin (Owner)</h3>
            </div>
            <ul className="space-y-1.5">
              {[
                'View all financial data & analytics',
                'Add / delete transactions',
                'Approve transaction requests',
                'Manage employees & salaries',
                'View partner equity',
                'Request & approve system reset',
                'Manage user roles (this page)',
              ].map(p => (
                <li key={p} className="flex items-start gap-2 text-xs text-zinc-300">
                  <span className="text-purple-400 mt-0.5">✓</span>{p}
                </li>
              ))}
            </ul>
          </div>

          {/* Employee Privileges */}
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-5">
            <div className="flex items-center gap-2 mb-3">
              <User className="w-4 h-4 text-emerald-400" />
              <h3 className="text-sm font-bold text-emerald-300">Employee</h3>
            </div>
            <ul className="space-y-1.5">
              {[
                'View & update assigned tasks',
                'View client list',
                'Submit transaction requests (admin approval needed)',
                'Receive salary payment notifications',
                'View own notifications',
              ].map(p => (
                <li key={p} className="flex items-start gap-2 text-xs text-zinc-300">
                  <span className="text-emerald-400 mt-0.5">✓</span>{p}
                </li>
              ))}
              {[
                'Cannot view financials or analytics',
                'Cannot approve any requests',
              ].map(p => (
                <li key={p} className="flex items-start gap-2 text-xs text-zinc-500">
                  <span className="text-red-500 mt-0.5">✗</span>{p}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Section>

      {/* ── 2. User Role Management ─────────────────────────────── */}
      <Section title="User Role Management" icon={UserCog}>
        {roleMsg && (
          <div className={cn(
            'mt-4 text-sm px-4 py-2.5 rounded-xl border',
            roleMsg.startsWith('✓') ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-yellow-500/10 text-yellow-300 border-yellow-500/20'
          )}>{roleMsg}</div>
        )}
        {deleteMsg && (
          <div className={cn(
            'mt-4 text-sm px-4 py-2.5 rounded-xl border',
            deleteMsg.startsWith('✓') ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-yellow-500/10 text-yellow-300 border-yellow-500/20'
          )}>{deleteMsg}</div>
        )}

        <div className="mt-5 space-y-3">
          {users.map(u => {
            const isMe = u.id === currentUser?.id;
            return (
              <div
                key={u.id}
                className="flex items-center justify-between gap-3 p-4 bg-zinc-900/60 border border-zinc-800 rounded-xl hover:bg-zinc-800/40 transition-all"
              >
                {/* Avatar + Info */}
                <div className="flex items-center gap-3 min-w-0">
                  <div className={cn(
                    'w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0',
                    u.role === 'admin' ? 'bg-purple-500/20 text-purple-400' : 'bg-emerald-500/20 text-emerald-400'
                  )}>
                    {u.displayName.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-white">{u.displayName}</p>
                      {isMe && <Badge color="zinc">You</Badge>}
                    </div>
                    <p className="text-xs text-zinc-500 font-mono truncate">{u.username}</p>
                  </div>
                </div>

                {/* Role Badge + Actions */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Badge color={u.role === 'admin' ? 'purple' : 'emerald'}>
                    {u.role === 'admin' ? <><Crown className="w-2.5 h-2.5" />Admin</> : <><User className="w-2.5 h-2.5" />Employee</>}
                  </Badge>

                  {!isMe && (
                    <>
                      {/* Toggle role */}
                      <button
                        onClick={() => handleRoleToggle(u.id, u.role)}
                        disabled={roleLoading === u.id}
                        title={u.role === 'admin' ? 'Demote to Employee' : 'Promote to Admin'}
                        className="p-1.5 rounded-lg text-zinc-500 hover:text-purple-400 hover:bg-purple-500/10 transition-all disabled:opacity-40"
                      >
                        {roleLoading === u.id
                          ? <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          : <ShieldCheck className="w-3.5 h-3.5" />}
                      </button>

                      {/* Delete */}
                      {deleteConfirm === u.id ? (
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] text-red-400">Confirm?</span>
                          <button
                            onClick={() => handleDeleteUser(u.id)}
                            className="px-2 py-1 text-[10px] font-bold bg-red-600 hover:bg-red-500 text-white rounded-md transition-all"
                          >Yes</button>
                          <button
                            onClick={() => setDeleteConfirm(null)}
                            className="px-2 py-1 text-[10px] font-bold bg-zinc-700 hover:bg-zinc-600 text-white rounded-md transition-all"
                          >No</button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setDeleteConfirm(u.id)}
                          title="Remove user"
                          className="p-1.5 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-all"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Summary */}
        <div className="mt-4 flex items-center gap-4 text-xs text-zinc-500 border-t border-zinc-800 pt-4">
          <span className="flex items-center gap-1"><Crown className="w-3 h-3 text-purple-400" />{admins.length} Admin{admins.length !== 1 ? 's' : ''}</span>
          <span className="flex items-center gap-1"><User className="w-3 h-3 text-emerald-400" />{employees.length} Employee{employees.length !== 1 ? 's' : ''}</span>
          <span className="flex items-center gap-1 ml-auto"><Info className="w-3 h-3" />Click the shield icon to toggle roles</span>
        </div>
      </Section>

      {/* ── 3. My Account Security ──────────────────────────────── */}
      <Section title="My Account Security" icon={Lock}>
        <div className="mt-4 space-y-4">
          <div className="flex items-center justify-between p-4 bg-zinc-900/60 border border-zinc-800 rounded-xl">
            <div>
              <p className="text-sm font-semibold text-white">Login Password</p>
              <p className="text-xs text-zinc-500 mt-0.5">Change your current login password</p>
            </div>
            <button
              onClick={() => setShowPwForm(f => !f)}
              className="flex items-center gap-2 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-300 hover:text-white text-xs font-semibold rounded-lg transition-all"
            >
              {showPwForm ? <RotateCcw className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
              {showPwForm ? 'Cancel' : 'Change'}
            </button>
          </div>

          {showPwForm && (
            <form onSubmit={handlePasswordChange} className="p-4 bg-zinc-900/40 border border-zinc-800 rounded-xl space-y-3">
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  value={newPw}
                  onChange={e => setNewPw(e.target.value)}
                  required minLength={6}
                  placeholder="Enter new password (min 6 chars)"
                  className="w-full pr-10 px-3 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-white text-sm focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                />
                <button type="button" onClick={() => setShowPw(s => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white transition-colors">
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {pwMsg && <p className={cn('text-xs', pwMsg.startsWith('✓') ? 'text-emerald-400' : 'text-red-400')}>{pwMsg}</p>}
              <button type="submit"
                className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white py-2.5 rounded-xl font-semibold transition-all text-sm">
                <Save className="w-4 h-4" /> Save New Password
              </button>
            </form>
          )}

          <div className="flex items-center gap-3 p-4 bg-zinc-900/30 border border-zinc-800/50 rounded-xl">
            <Info className="w-4 h-4 text-zinc-500 flex-shrink-0" />
            <p className="text-xs text-zinc-500">
              Logged in as <span className="font-bold text-white">{currentUser?.displayName}</span>
              {' '}(<span className="font-mono">{currentUser?.username}</span>).
              Your role: <span className="text-purple-400 font-bold capitalize">{currentUser?.role}</span>.
            </p>
          </div>
        </div>
      </Section>

      {/* ── 4. Visual Themes ───────────────────────────────────── */}
      <Section title="Interface Aesthetics (Themes)" icon={Palette}>
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { id: 'default',   name: 'Default Noir', color: 'bg-emerald-500', icon: Crown },
            { id: 'cyberpunk', name: 'Cyberpunk',    color: 'bg-purple-500',  icon: Zap },
            { id: 'matrix',    name: 'Matrix',       color: 'bg-green-500',   icon: Info },
            { id: 'sunset',    name: 'Sunset',       color: 'bg-orange-500',  icon: Sparkles },
          ].map(t => (
            <button
              key={t.id}
              onClick={() => {
                localStorage.setItem('agency-theme', t.id);
                window.location.reload(); // Quickest way to apply global filter class
              }}
              className={cn(
                "group relative p-4 rounded-2xl border transition-all duration-300 overflow-hidden",
                (typeof window !== 'undefined' && localStorage.getItem('agency-theme') === t.id) || (t.id === 'default' && typeof window !== 'undefined' && !localStorage.getItem('agency-theme'))
                  ? "bg-zinc-800 border-emerald-500/50 shadow-[0_0_20px_rgba(16,185,129,0.1)]"
                  : "bg-zinc-900/60 border-zinc-800 hover:border-zinc-700"
              )}
            >
              <div className={cn("w-10 h-10 rounded-xl mb-3 flex items-center justify-center mx-auto", t.color + "/20")}>
                <t.icon className={cn("w-5 h-5", t.color.replace('bg-', 'text-'))} />
              </div>
              <span className="text-xs font-bold text-zinc-300 group-hover:text-white">{t.name}</span>
            </button>
          ))}
        </div>
        <p className="text-[10px] text-zinc-500 mt-4 italic">Note: Themes use advanced CSS filters to re-skin the entire application instantly.</p>
      </Section>

      {/* ── 5. Danger Zone ──────────────────────────────────────── */}
      <Section title="Danger Zone" icon={AlertTriangle} defaultOpen={false}>
        <div className="mt-4 space-y-3">
          <div className="p-4 bg-red-500/5 border border-red-500/20 rounded-xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-bold text-red-300">Request Full System Reset</p>
                <p className="text-xs text-zinc-500 mt-1">
                  Permanently wipes ALL transactions, clients, equities, and salary data.
                  Requires approval from <strong className="text-zinc-300">all {admins.length} admins</strong>.
                </p>
              </div>
              <button
                onClick={async () => {
                  if (window.confirm('⚠ This will PERMANENTLY DELETE all data. This cannot be undone. Continue?')) {
                    await requestGlobalReset();
                  }
                }}
                className="flex-shrink-0 flex items-center gap-2 px-4 py-2 bg-red-600/20 hover:bg-red-600/30 border border-red-500/30 text-red-400 hover:text-red-300 text-xs font-bold rounded-xl transition-all"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Request Reset
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2 p-3 bg-yellow-500/5 border border-yellow-500/20 rounded-xl">
            <AlertTriangle className="w-4 h-4 text-yellow-400 flex-shrink-0" />
            <p className="text-xs text-yellow-300/80">
              All destructive actions are logged and require multi-admin approval. They cannot be reversed.
            </p>
          </div>
        </div>
      </Section>

    </div>
  );
}
