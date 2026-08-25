'use client';

import { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';

export default function FieldPage() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const loadTasks = async () => {
    try {
      const res = await fetch('/api/tasks');
      if (res.ok) setTasks(await res.json());
    } catch (err) {
      console.error('Failed to synchronize field tasks:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTasks();
    const interval = setInterval(loadTasks, 15000);
    return () => clearInterval(interval);
  }, []);

  const updateStatus = async (taskId, newStatus) => {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/tasks/${taskId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ new_status: newStatus }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || `Status update failed (${res.status})`);
      loadTasks();
    } catch (err) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="h-dvh w-screen bg-black text-white flex flex-col overflow-hidden font-sans">
      <Navbar user={{ name: 'Field Operative', role: 'TECHNICIAN' }} />

      <main className="flex-1 min-h-0 w-full max-w-5xl mx-auto p-4 sm:p-6 md:p-8 flex flex-col gap-4 sm:gap-6">
        <div className="flex justify-between items-center border-b border-white/10 pb-3 sm:pb-4 shrink-0">
          <div>
            <span className="text-[10px] sm:text-[11px] font-mono uppercase tracking-[0.3em] text-white/40">Operative HUD</span>
            <h1 className="text-lg sm:text-2xl font-black uppercase tracking-tight">Active Workload Matrix ({tasks.length})</h1>
          </div>
          <button
            onClick={loadTasks}
            className="px-3.5 sm:px-4 py-1.5 sm:py-2 border border-white/20 text-xs font-mono uppercase tracking-widest hover:bg-white hover:text-black transition cursor-pointer"
          >
            Refresh
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto space-y-3.5 sm:space-y-4 pr-1">
          {loading ? (
            <div className="text-center py-16 sm:py-20 text-white/40 font-mono text-xs sm:text-sm uppercase tracking-widest">
              Synchronizing job assignments...
            </div>
          ) : tasks.length === 0 ? (
            <div className="border border-white/10 bg-white/[0.01] p-10 sm:p-16 text-center space-y-2.5 sm:space-y-3">
              <h3 className="text-base sm:text-lg font-black uppercase text-white tracking-tight">No Open Directives</h3>
              <p className="text-xs font-mono text-white/40 uppercase tracking-widest">Awaiting dispatch orders from control center.</p>
            </div>
          ) : (
            tasks.map((task) => (
              <div
                key={task.task_id}
                className="border border-white/10 bg-black p-4 sm:p-6 space-y-3 sm:space-y-4 hover:border-white/40 transition font-mono"
              >
                <div className="flex justify-between items-start gap-2">
                  <div className="flex items-center gap-2.5 sm:gap-4 flex-wrap">
                    <span className="text-sm sm:text-base font-bold text-emerald-400">{task.task_id}</span>
                    <span className="px-2.5 sm:px-3 py-0.5 sm:py-1 border border-white/20 text-[10px] sm:text-xs uppercase font-bold text-white/80">
                      {task.task_type}
                    </span>
                  </div>
                  <span className={`px-2.5 sm:px-3 py-0.5 sm:py-1 border text-[10px] sm:text-xs font-black uppercase tracking-wider shrink-0 ${
                    task.status === 'ASSIGNED' ? 'border-amber-400/50 text-amber-400' :
                    task.status === 'IN_PROGRESS' ? 'border-blue-400/50 text-blue-400' :
                    'border-emerald-400/50 text-emerald-400'
                  }`}>
                    {task.status}
                  </span>
                </div>

                <div className="space-y-1.5 sm:space-y-2">
                  <h3 className="text-lg sm:text-xl font-black uppercase tracking-tight text-white">{task.client_name}</h3>
                  <p className="text-xs sm:text-sm text-white/70">{task.address}</p>
                  {task.landmark && (
                    <p className="text-xs text-white/50"><span className="text-white/80 font-bold">Landmark:</span> {task.landmark}</p>
                  )}
                  {task.issue && (
                    <div className="p-3 sm:p-3.5 border border-red-500/30 bg-red-950/10 text-red-300 text-xs sm:text-sm uppercase mt-2.5 sm:mt-3">
                      [Reported Trouble] {task.issue}
                    </div>
                  )}
                </div>

                <div className="pt-3 sm:pt-4 border-t border-white/10 flex justify-end gap-2.5 sm:gap-3">
                  {task.status === 'ASSIGNED' && (
                    <button
                      onClick={() => updateStatus(task.task_id, 'IN_PROGRESS')}
                      disabled={submitting}
                      className="px-5 sm:px-6 py-2 sm:py-2.5 bg-white text-black text-xs font-black uppercase tracking-[0.2em] hover:bg-white/80 transition cursor-pointer disabled:opacity-50"
                    >
                      Commence Task →
                    </button>
                  )}

                  {task.status === 'IN_PROGRESS' && (
                    <button
                      onClick={() => updateStatus(task.task_id, 'COMPLETED')}
                      disabled={submitting}
                      className="px-5 sm:px-6 py-2 sm:py-2.5 border border-emerald-400 bg-emerald-400/10 text-emerald-300 text-xs font-black uppercase tracking-[0.2em] hover:bg-emerald-400 hover:text-black transition cursor-pointer disabled:opacity-50"
                    >
                      Report Completed ✓
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </main>
    </div>
  );
}