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
        body: JSON.stringify({ identifier, password }),
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
        router.push('/admin');
        break;
      case 'DISPATCHER':
        router.push('/dispatcher');
        break;
      case 'CSR':
        router.push('/csr');
        break;
      case 'TECHNICIAN':
      case 'OSP':
        router.push('/field');
        break;
      default:
        router.push('/login');
    }
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col justify-between p-6 md:p-12 relative overflow-hidden font-sans">
      {/* Background Matrix Grid */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-20"
        style={{
          backgroundImage: 'linear-gradient(to right, rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.08) 1px, transparent 1px)',
          backgroundSize: '40px 40px'
        }}
      />

      {/* Top Header Bar */}
      <div className="relative z-10 flex justify-between items-start border-b border-white/10 pb-6">
        <div>
          <span className="text-[10px] uppercase tracking-[0.3em] font-black text-white">System Access</span>
          <p className="text-[9px] font-mono text-white/40 tracking-widest uppercase mt-0.5">AUTH-PORT // 8080</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
          <span className="text-[9px] uppercase tracking-[0.2em] font-bold text-white/50">SECURE GATEWAY</span>
        </div>
      </div>

      {/* Central Login Container */}
      <div className="relative z-10 max-w-md w-full mx-auto my-12">
        <div className="border border-white/10 bg-black p-8 md:p-10 space-y-6">
          <div>
            <span className="text-[9px] uppercase tracking-[0.3em] font-bold text-white/40">Terminal Login</span>
            <h1 className="text-3xl font-black uppercase tracking-tighter text-white mt-1">
              Dispatch<br /><span className="text-white/30">Matrix</span>
            </h1>
          </div>

          {error && (
            <div className="p-3 border border-red-500/40 bg-red-950/20 text-red-300 text-xs font-mono uppercase tracking-wider">
              [Err] {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-[9px] uppercase tracking-[0.25em] font-black text-white/50 mb-2">
                Identifier // Tech ID
              </label>
              <input
                type="text"
                required
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="admin@dms.local or T-0001"
                className="w-full bg-white/[0.03] border border-white/10 px-4 py-3 text-xs text-white placeholder:text-white/20 focus:outline-none focus:border-white focus:bg-white/[0.06] transition-all font-mono"
              />
            </div>

            <div>
              <label className="block text-[9px] uppercase tracking-[0.25em] font-black text-white/50 mb-2">
                Access Security Key
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-white/[0.03] border border-white/10 px-4 py-3 text-xs text-white placeholder:text-white/20 focus:outline-none focus:border-white focus:bg-white/[0.06] transition-all font-mono"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-4 py-3.5 bg-white text-black font-black uppercase text-xs tracking-[0.3em] hover:bg-white/80 transition-all duration-300 cursor-pointer disabled:opacity-50"
            >
              {loading ? 'Authenticating...' : 'Establish Session →'}
            </button>
          </form>
        </div>
      </div>

      {/* Footer Info */}
      <div className="relative z-10 flex flex-col sm:flex-row justify-between items-center gap-4 border-t border-white/10 pt-6 text-[9px] font-mono text-white/30 uppercase tracking-widest">
        <span>© 2026 FiberOps Grid</span>
        <span>All authentication attempts are cryptographically audited</span>
      </div>

      {/* Mandatory Change Password Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="max-w-md w-full border border-white/20 bg-black p-8 space-y-6">
            <div>
              <span className="text-[9px] font-mono uppercase tracking-[0.3em] text-amber-400">Security Requirement</span>
              <h3 className="text-xl font-black uppercase tracking-tight text-white mt-1">Update Default PIN</h3>
              <p className="text-xs text-white/50 mt-1">Default credential <code className="text-white font-mono">00000000</code> must be replaced.</p>
            </div>

            {changeError && (
              <div className="p-3 border border-red-500/40 bg-red-950/20 text-red-300 text-xs font-mono uppercase">
                {changeError}
              </div>
            )}

            <form onSubmit={handleChangePassword} className="space-y-4">
              <input
                type="password"
                required
                placeholder="New Password (min 8 chars)"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full bg-white/[0.03] border border-white/10 px-4 py-3 text-xs text-white placeholder:text-white/20 focus:outline-none focus:border-white font-mono"
              />
              <input
                type="password"
                required
                placeholder="Confirm New Password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full bg-white/[0.03] border border-white/10 px-4 py-3 text-xs text-white placeholder:text-white/20 focus:outline-none focus:border-white font-mono"
              />
              <button
                type="submit"
                disabled={changeLoading}
                className="w-full py-3 bg-white text-black font-black uppercase text-xs tracking-[0.2em] hover:bg-white/80 transition-all cursor-pointer"
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