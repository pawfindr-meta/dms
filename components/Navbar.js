'use client';

import { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';

export default function Navbar({ user }) {
  const router = useRouter();
  const pathname = usePathname();
  const [loggingOut, setLoggingOut] = useState(false);

  const handleSignOut = async () => {
    setLoggingOut(true);
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      router.push('/login');
      router.refresh();
    }
  };

  const navLinks = [
    { href: '/csr', label: 'CSR', roles: ['MASTER_ADMIN', 'CSR'] },
    { href: '/dispatcher', label: 'Dispatch', roles: ['MASTER_ADMIN', 'DISPATCHER'] },
    { href: '/field', label: 'Field HUD', roles: ['MASTER_ADMIN', 'TECHNICIAN', 'OSP'] },
    { href: '/admin', label: 'Admin', roles: ['MASTER_ADMIN'] },
  ].filter((item) => !user?.role || item.roles.includes(user.role));

  return (
    <header className="sticky top-0 z-50 w-full h-14 bg-zinc-950/80 backdrop-blur-md border-b border-zinc-800 shrink-0 select-none">
      <div className="w-full h-full px-3 sm:px-5 flex items-center justify-between gap-3">
        
        {/* Logo / Brand Identity */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="w-7 h-7 rounded-lg bg-zinc-900 border border-zinc-700/60 flex items-center justify-center text-zinc-100 shadow-inner">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4 text-emerald-400">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <div className="flex flex-col">
            <span className="text-zinc-100 uppercase tracking-[0.2em] font-bold text-xs">
              Dispatch<span className="text-zinc-500">Matrix</span>
            </span>
            <span className="text-[9px] font-mono uppercase tracking-widest text-zinc-500 hidden sm:block">
              FiberOps Core
            </span>
          </div>
        </div>

        {/* Dynamic Role Navigation Links */}
        <nav className="hidden md:flex items-center gap-1 bg-zinc-900/60 border border-zinc-800/80 p-1 rounded-lg font-mono">
          {navLinks.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`px-3 py-1 rounded text-xs uppercase tracking-wider font-semibold transition-colors ${
                  isActive
                    ? 'bg-zinc-100 text-zinc-950 shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/50'
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* Telemetry Status + User Session & Terminate */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="hidden lg:flex items-center gap-2 px-2.5 py-1 rounded-lg border border-zinc-800 bg-zinc-900/40">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-400">
              Node Online
            </span>
          </div>

          <div className="text-right hidden sm:block truncate max-w-[160px]">
            <div className="text-xs font-bold uppercase tracking-tight text-zinc-200 truncate">
              {user?.name || user?.role || 'Operative'}
            </div>
            <div className="text-[10px] font-mono uppercase tracking-wider text-emerald-400 font-bold">
              {user?.role}
            </div>
          </div>

          <button
            onClick={handleSignOut}
            disabled={loggingOut}
            className="px-3 py-1.5 rounded-lg text-xs font-mono uppercase tracking-wider font-bold text-zinc-300 border border-zinc-700 bg-zinc-900 hover:bg-red-500 hover:text-white hover:border-red-500 transition-colors cursor-pointer disabled:opacity-50 shrink-0"
          >
            {loggingOut ? 'Ending...' : 'Terminate'}
          </button>
        </div>

      </div>
    </header>
  );
}