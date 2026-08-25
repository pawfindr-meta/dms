'use client';

import { useRouter } from 'next/navigation';

export default function Navbar({ user }) {
  const router = useRouter();

  const handleSignOut = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } finally {
      router.push('/login');
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full bg-black/95 backdrop-blur-md border-b border-white/10 shrink-0">
      <div className="w-full px-4 sm:px-6 lg:px-8 h-16 sm:h-20 grid grid-cols-12 items-center">
        {/* Logo / Brand */}
        <div className="col-span-8 sm:col-span-5 lg:col-span-4 h-full flex items-center gap-3 border-r border-white/10 pr-4">
          <div className="w-6 h-6 shrink-0 flex items-center justify-center text-white">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-full h-full">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <div className="flex flex-col truncate">
            <span className="text-white uppercase tracking-[0.25em] font-black text-xs sm:text-sm truncate">Dispatch Matrix</span>
            <span className="text-[9px] font-mono uppercase tracking-widest text-white/40 hidden sm:block">FiberOps Real-Time Core</span>
          </div>
        </div>

        {/* Tactical Status Beacon (Desktop only) */}
        <div className="hidden lg:flex col-span-4 h-full border-r border-white/10 items-center justify-center gap-3 px-4">
          <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.9)] animate-pulse"></span>
          <span className="text-[11px] uppercase tracking-[0.25em] font-black text-white/60 font-mono">
            Node Online // Valenzuela Grid
          </span>
        </div>

        {/* User Role Badge & Terminate */}
        <div className="col-span-4 sm:col-span-7 lg:col-span-4 h-full flex items-center justify-end gap-3 sm:gap-5 pl-2">
          <div className="text-right hidden sm:block truncate">
            <div className="text-xs font-black uppercase tracking-wider text-white truncate">{user?.name || user?.role}</div>
            <div className="text-[10px] font-mono uppercase tracking-widest text-emerald-400 font-bold">{user?.role}</div>
          </div>

          <button
            onClick={handleSignOut}
            className="px-3 sm:px-4 py-1.5 sm:py-2 text-[10px] sm:text-xs uppercase tracking-[0.2em] font-black text-white border border-white/20 hover:bg-white hover:text-black transition-all duration-300 cursor-pointer shrink-0"
          >
            Terminate
          </button>
        </div>
      </div>
    </header>
  );
}