'use client';

import { useRouter } from 'next/navigation';

export default function Navbar({ user }) {
  const router = useRouter();

  const handleSignOut = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  };

  return (
    <header className="sticky top-0 z-50 w-full bg-black/95 backdrop-blur-md border-b border-white/10 shrink-0">
      <div className="w-full px-8 h-20 grid grid-cols-12 items-center">
        {/* Logo / Brand */}
        <div className="col-span-6 sm:col-span-4 h-full border-r border-white/10 flex items-center gap-4">
          <div className="w-7 h-7 flex items-center justify-center text-white">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-full h-full">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <div className="flex flex-col">
            <span className="text-white uppercase tracking-[0.35em] font-black text-sm md:text-base">Dispatch Matrix</span>
            <span className="text-[10px] font-mono uppercase tracking-[0.25em] text-white/40">FiberOps Real-Time Core</span>
          </div>
        </div>

        {/* Tactical Status Beacon */}
        <div className="hidden md:flex col-span-4 h-full border-r border-white/10 items-center justify-center gap-3 px-6">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.9)] animate-pulse"></span>
          <span className="text-xs uppercase tracking-[0.3em] font-black text-white/60 font-mono">
            Node Online // Valenzuela Grid
          </span>
        </div>

        {/* User Role & Sign Out */}
        <div className="col-span-6 sm:col-span-8 md:col-span-4 h-full flex items-center justify-end gap-6">
          <div className="text-right hidden sm:block">
            <div className="text-sm font-black uppercase tracking-wider text-white">{user?.name || user?.role}</div>
            <div className="text-[11px] font-mono uppercase tracking-widest text-emerald-400 font-bold">{user?.role}</div>
          </div>

          <button
            onClick={handleSignOut}
            className="px-5 py-2.5 text-xs uppercase tracking-[0.25em] font-black text-white border border-white/20 hover:bg-white hover:text-black transition-all duration-300 cursor-pointer"
          >
            Terminate Session
          </button>
        </div>
      </div>
    </header>
  );
}