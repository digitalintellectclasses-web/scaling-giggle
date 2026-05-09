'use client';

import { useState } from 'react';
import { useAuth } from '@/store/AuthContext';
import { Lock, Eye, EyeOff, Loader2 } from 'lucide-react';

export function LoginPage() {
  const { login, loginAsGuest } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Guest Form State
  const [showGuestForm, setShowGuestForm] = useState(false);
  const [guestInfo, setGuestInfo] = useState({ name: '', email: '', phone: '', company: '' });

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

  const handleGuestSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loginAsGuest(guestInfo);
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
          <div className="inline-flex flex-col items-center justify-center mb-2">
            <div className="relative">
              <div className="absolute -inset-3 rounded-full opacity-20 blur-xl" style={{ background: 'radial-gradient(circle, #00b4d8, #0077b6)' }} />
              <img src="/logo.png" alt="Ivory Tech Solutions" className="relative h-24 w-auto object-contain" />
            </div>
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight mt-1">Ivory Tech Solutions</h1>
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

          {!showGuestForm && (
            <div className="mt-6 pt-6 border-t border-zinc-800 text-center">
              <p className="text-sm text-zinc-400 mb-3">Want to try out the app?</p>
              <button 
                onClick={() => setShowGuestForm(true)}
                className="w-full py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl font-semibold transition-all text-sm"
              >
                Login as Guest
              </button>
            </div>
          )}
        </div>

        {/* Guest Modal */}
        {showGuestForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-8 w-full max-w-md shadow-2xl animate-in fade-in zoom-in duration-200">
              <h3 className="text-xl font-bold text-white mb-2">Guest Access</h3>
              <p className="text-sm text-zinc-400 mb-6">Please provide some basic info to start your test drive with dummy data.</p>
              
              <form onSubmit={handleGuestSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1">Name</label>
                  <input required value={guestInfo.name} onChange={e => setGuestInfo({...guestInfo, name: e.target.value})}
                    className="block w-full px-3 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-white outline-none focus:border-emerald-500 text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1">Company</label>
                  <input required value={guestInfo.company} onChange={e => setGuestInfo({...guestInfo, company: e.target.value})}
                    className="block w-full px-3 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-white outline-none focus:border-emerald-500 text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1">Email</label>
                  <input required type="email" value={guestInfo.email} onChange={e => setGuestInfo({...guestInfo, email: e.target.value})}
                    className="block w-full px-3 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-white outline-none focus:border-emerald-500 text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1">Phone</label>
                  <input required type="tel" value={guestInfo.phone} onChange={e => setGuestInfo({...guestInfo, phone: e.target.value})}
                    className="block w-full px-3 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-white outline-none focus:border-emerald-500 text-sm" />
                </div>
                
                <div className="flex gap-3 pt-4">
                  <button type="button" onClick={() => setShowGuestForm(false)}
                    className="flex-1 py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl font-bold text-sm transition-all">Cancel</button>
                  <button type="submit"
                    className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-sm transition-all">Start Session</button>
                </div>
              </form>
            </div>
          </div>
        )}

        <p className="text-center text-zinc-600 text-xs mt-6">
          Access is restricted to authorized personnel only.
          <br />Contact your admin for credentials.
        </p>
      </div>
    </div>
  );
}
