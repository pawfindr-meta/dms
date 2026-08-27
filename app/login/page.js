'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Forced password modal state
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changeError, setChangeError] = useState('');
  const [changeLoading, setChangeLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: identifier.trim(), password }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Authentication denied');

      if (data.mustChangePassword) {
        setShowPasswordModal(true);
        setLoading(false);
        return;
      }

      routeToDashboard(data.role);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setChangeError('');

    if (newPassword.length < 8) {
      setChangeError('Password requires minimum 8 characters.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setChangeError('Key verification mismatch.');
      return;
    }

    setChangeLoading(true);
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ current_password: password, new_password: newPassword }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Password update failed');

      setShowPasswordModal(false);
      routeToDashboard('TECHNICIAN');
    } catch (err) {
      setChangeError(err.message);
      setChangeLoading(false);
    }
  };

  const routeToDashboard = (role) => {
    switch (role) {
      case 'MASTER_ADMIN':
        window.location.href = '/admin';
        break;
      case 'DISPATCHER':
        window.location.href = '/dispatcher';
        break;
      case 'CSR':
        window.location.href = '/csr';
        break;
      case 'TECHNICIAN':
      case 'OSP':
        window.location.href = '/field';
        break;
      default:
        window.location.href = '/login';
    }
  };

  return (
    <div className="h-[100dvh] w-screen bg-zinc-950 text-zinc-100 flex flex-col justify-between p-4 sm:p-6 md:p-8 relative overflow-hidden font-sans select-none">
      {/* Background Matrix Grid Pattern */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-25"
        style={{
          backgroundImage: 'linear-gradient(to right, rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.05) 1px, transparent 1px)',
          backgroundSize: '32px 32px'
        }}
      />

      {/* Top Header Bar */}
      <header className="relative z-10 flex justify-between items-center border-b border-zinc-800 pb-3 shrink-0">
        <div>
          <span className="text-[10px] uppercase tracking-[0.25em] font-bold text-zinc-300">System Access Node</span>
          <p className="text-[9px] font-mono text-zinc-500 tracking-widest uppercase">AUTH-PORT // 8080</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-[10px] uppercase tracking-[0.2em] font-mono font-bold text-zinc-400">SECURE GATEWAY</span>
        </div>
      </header>

      {/* Central Login Card */}
      <main className="relative z-10 max-w-sm w-full mx-auto my-auto py-4">
        <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/50 backdrop-blur-md p-6 sm:p-8 space-y-5 shadow-2xl">
          <div>
            <span className="text-[10px] font-mono uppercase tracking-[0.25em] text-emerald-400 font-bold">Terminal Login</span>
            <h1 className="text-2xl font-bold uppercase tracking-tight text-zinc-100 mt-1">
              Dispatch<span className="text-zinc-500">Matrix</span>
            </h1>
          </div>

          {error && (
            <div className="p-3 rounded-lg border border-red-500/30 bg-red-950/30 text-red-400 text-xs font-mono uppercase tracking-wider flex items-center justify-between">
              <span>[ERR] {error}</span>
              <button onClick={() => setError('')} className="text-zinc-400 hover:text-zinc-200">✕</button>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-3.5">
            <div>
              <label className="block text-[10px] uppercase tracking-widest font-bold text-zinc-400 mb-1.5 font-mono">
                Identifier // Operative ID
              </label>
              <input
                type="text"
                required
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="admin@dms.local or T-0001"
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3.5 py-2.5 text-xs text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-500 font-mono transition-colors"
              />
            </div>

            <div>
              <label className="block text-[10px] uppercase tracking-widest font-bold text-zinc-400 mb-1.5 font-mono">
                Access Security Key
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3.5 py-2.5 text-xs text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-500 font-mono transition-colors"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3 bg-zinc-100 text-zinc-950 font-bold uppercase text-xs tracking-[0.2em] rounded-lg hover:bg-zinc-200 transition-colors cursor-pointer disabled:opacity-50"
            >
              {loading ? 'Authenticating...' : 'Establish Session →'}
            </button>
          </form>
        </div>
      </main>

      {/* Footer Audit Notice */}
      <footer className="relative z-10 flex flex-col sm:flex-row justify-between items-center gap-2 border-t border-zinc-800 pt-3 text-[10px] font-mono text-zinc-500 uppercase tracking-wider shrink-0">
        <span>© 2026 FiberOps Grid</span>
        <span>Cryptographically Audited Environment</span>
      </footer>

      {/* Mandatory Change Password Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="max-w-md w-full rounded-xl border border-zinc-800 bg-zinc-900 p-6 space-y-4 shadow-2xl">
            <div>
              <span className="text-[10px] font-mono uppercase tracking-widest text-amber-400 font-bold">Security Requirement</span>
              <h3 className="text-base sm:text-lg font-bold uppercase tracking-tight text-zinc-100 mt-1">Update Default PIN</h3>
              <p className="text-xs text-zinc-400 mt-1 font-mono">
                Default credential <code className="text-emerald-400 font-bold">00000000</code> must be replaced before continuing.
              </p>
            </div>

            {changeError && (
              <div className="p-2.5 rounded-lg border border-red-500/30 bg-red-950/30 text-red-400 text-xs font-mono uppercase">
                {changeError}
              </div>
            )}

            <form onSubmit={handleChangePassword} className="space-y-3 font-mono">
              <input
                type="password"
                required
                minLength={8}
                placeholder="New Password (min 8 chars)"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3.5 py-2.5 text-xs text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-500"
              />
              <input
                type="password"
                required
                minLength={8}
                placeholder="Confirm New Password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3.5 py-2.5 text-xs text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-500"
              />
              <button
                type="submit"
                disabled={changeLoading}
                className="w-full py-2.5 bg-zinc-100 text-zinc-950 font-bold uppercase text-xs tracking-wider rounded-lg hover:bg-zinc-200 transition-colors cursor-pointer disabled:opacity-50"
              >
                {changeLoading ? 'Saving...' : 'Set Key & Proceed'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}