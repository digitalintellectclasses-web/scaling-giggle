'use client';

import { useState } from 'react';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';

const ACCOUNTS = [
  {
    email: 'ppsolar@ivory.agency',
    password: 'IvoryPP@2024',
    username: 'PPSOLAR',
    displayName: 'PP Solar Admin',
    role: 'admin',
  },
  {
    email: 'priyanka@ivory.agency',
    password: 'IvoryPriya@2024',
    username: 'PRIYANKA',
    displayName: 'Priyanka',
    role: 'employee',
  },
];

export default function SetupPage() {
  const [status, setStatus] = useState('');
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSetup = async () => {
    setLoading(true);
    setStatus('');
    try {
      for (const account of ACCOUNTS) {
        setStatus(`Creating ${account.username}...`);
        const cred = await createUserWithEmailAndPassword(auth, account.email, account.password);
        await setDoc(doc(db, 'users', cred.user.uid), {
          username: account.username,
          displayName: account.displayName,
          role: account.role,
          email: account.email,
          createdAt: serverTimestamp(),
        });
      }
      setStatus('✅ All accounts created!');
      setDone(true);
    } catch (err: any) {
      setStatus(`❌ ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl p-8 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-white">One-Time Setup</h1>
          <p className="text-zinc-400 text-sm mt-1">Click below to create PPSOLAR and PRIYANKA accounts in Firebase. Run once only.</p>
        </div>

        <div className="space-y-3">
          {ACCOUNTS.map(a => (
            <div key={a.username} className="bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-sm">
              <p className="text-white font-semibold">{a.username} <span className="text-xs text-zinc-500 font-normal ml-1">({a.role})</span></p>
              <p className="text-zinc-400 font-mono text-xs mt-0.5">{a.email}</p>
            </div>
          ))}
        </div>

        {status && (
          <div className={`text-sm px-4 py-2.5 rounded-xl border ${status.startsWith('❌') ? 'bg-red-500/10 border-red-500/30 text-red-400' : done ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-blue-500/10 border-blue-500/30 text-blue-400'}`}>
            {status}
          </div>
        )}

        {done ? (
          <a href="/" className="block text-center w-full bg-emerald-600 hover:bg-emerald-500 text-white py-2.5 rounded-xl font-semibold transition-all text-sm">
            Go to Login →
          </a>
        ) : (
          <button
            onClick={handleSetup}
            disabled={loading}
            className="w-full bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white py-2.5 rounded-xl font-semibold transition-all text-sm"
          >
            {loading ? 'Creating...' : 'Create Accounts'}
          </button>
        )}
      </div>
    </div>
  );
}
