'use client';

import { useState } from 'react';
import { useAuth } from '@/store/AuthContext';
import { Lock, Eye, EyeOff, Loader2 } from 'lucide-react';

export function LoginPage() {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const success = await login(username.trim(), password);
      if (!success) throw new Error('Invalid username or password.');
    } catch (err: any) {
      setError(err.message || 'Invalid credentials. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#09090b] flex items-center justify-center p-4">
      {/* Background glow effects */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] rounded-full blur-3xl" style={{ background: 'radial-gradient(circle, rgba(0,180,216,0.07) 0%, transparent 70%)' }} />
          <div className="absolute top-2/3 left-1/3 w-[300px] h-[300px] rounded-full blur-3xl" style={{ background: 'radial-gradient(circle, rgba(0,119,182,0.06) 0%, transparent 70%)' }} />
        </div>

      <div className="relative w-full max-w-md">
        {/* Logo / Brand */}
        <div className="text-center mb-10">
          {/* Elephant logo ring */}
          <div className="inline-flex items-center justify-center mb-5 relative">
            <div className="w-20 h-20 rounded-2xl flex items-center justify-center shadow-2xl" style={{ background: 'linear-gradient(135deg, #00b4d8 0%, #0077b6 60%, #03045e 100%)' }}>
              <span className="text-white font-black text-2xl tracking-tighter">ITS</span>
            </div>
            <div className="absolute -inset-1 rounded-2xl opacity-30 blur-md" style={{ background: 'linear-gradient(135deg, #00b4d8, #0077b6)' }} />
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">Ivory Tech Solutions</h1>
          <p className="text-[11px] font-semibold tracking-[0.2em] uppercase mt-0.5" style={{ color: '#00b4d8' }}>Finance Management Tool</p>
          <p className="text-zinc-500 mt-3 text-sm">Sign in to access your portal</p>
        </div>

        {/* Card */}
        <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-8 backdrop-blur-sm shadow-2xl">
          <form onSubmit={handleSubmit} className="space-y-5">
            
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-1.5">
                Username
              </label>
              <input
                type="text"
                required
                autoComplete="username"
                value={username}
                onChange={e => setUsername(e.target.value)}
              className="block w-full px-4 py-3 bg-zinc-950 border border-zinc-800 rounded-xl text-white placeholder:text-zinc-600 outline-none transition-all uppercase"
              style={{ '--tw-ring-color': '#00b4d8' } as React.CSSProperties}
              onFocus={e => e.target.style.borderColor = '#00b4d8'}
              onBlur={e => e.target.style.borderColor = ''}
                placeholder="e.g. PPSOLAR"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="block w-full pl-4 pr-12 py-3 bg-zinc-950 border border-zinc-800 rounded-xl text-white placeholder:text-zinc-600 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(p => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 p-1 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 text-red-400 text-sm py-3 px-4 rounded-xl">
                <Lock className="w-4 h-4 flex-shrink-0" />
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 text-white py-3 rounded-xl font-semibold transition-all shadow-lg mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ background: loading ? 'rgba(0,119,182,0.4)' : 'linear-gradient(135deg, #00b4d8, #0077b6)', boxShadow: '0 4px 20px rgba(0,180,216,0.25)' }}
            >
              {loading ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Signing in...</>
              ) : (
                <>Sign In</>
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-zinc-600 text-xs mt-6">
          Access is restricted to authorized personnel only.
          <br />Contact your admin for credentials.
        </p>
      </div>
    </div>
  );
}
