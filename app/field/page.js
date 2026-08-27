'use client';

import { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';

export default function FieldPage() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Closeout Modal State
  const [closeoutTask, setCloseoutTask] = useState(null);
  const [resolutionDetails, setResolutionDetails] = useState('');
  const [materialsUsed, setMaterialsUsed] = useState({
    dropCableMeters: '',
    fastConnectors: '',
    patchCords: '',
  });

  // Reassignment Escalation Modal
  const [escalateTask, setEscalateTask] = useState(null);
  const [escalateReason, setEscalateReason] = useState('');

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

  const updateStatus = async (taskId, newStatus, payload = {}) => {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/tasks/${taskId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ new_status: newStatus, ...payload }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || `Status update failed (${res.status})`);
      
      setCloseoutTask(null);
      setEscalateTask(null);
      loadTasks();
    } catch (err) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCompleteTask = (e) => {
    e.preventDefault();
    if (!closeoutTask) return;
    updateStatus(closeoutTask.task_id, 'COMPLETED', {
      resolution_notes: resolutionDetails,
      materials: materialsUsed,
    });
  };

  const handleRequestEscalation = (e) => {
    e.preventDefault();
    if (!escalateTask) return;
    updateStatus(escalateTask.task_id, 'REASSIGNMENT_REQUESTED', {
      reassign_reason: escalateReason,
    });
  };

  return (
    <div className="h-[100dvh] w-screen bg-zinc-950 text-zinc-100 flex flex-col overflow-hidden font-sans select-none">
      <Navbar user={{ name: 'Field Operative', role: 'TECHNICIAN' }} />

      <main className="flex-1 min-h-0 w-full max-w-4xl mx-auto p-3 sm:p-5 flex flex-col gap-3 overflow-hidden">
        {/* HUD Header */}
        <div className="flex justify-between items-center border-b border-zinc-800 pb-3 shrink-0">
          <div>
            <span className="text-[10px] font-mono uppercase tracking-[0.25em] text-zinc-500">Operative HUD</span>
            <h1 className="text-base sm:text-lg font-bold uppercase tracking-tight text-zinc-100">
              Active Workload Queue ({tasks.length})
            </h1>
          </div>
          <button
            onClick={loadTasks}
            className="px-3 py-1.5 rounded-lg border border-zinc-700 bg-zinc-900 text-xs font-mono uppercase tracking-wider text-zinc-300 hover:bg-zinc-800 hover:text-white transition cursor-pointer"
          >
            Sync
          </button>
        </div>

        {/* Task Feed */}
        <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar space-y-3 pr-1">
          {loading ? (
            <div className="text-center py-20 text-zinc-600 font-mono text-xs uppercase tracking-widest">
              Synchronizing job assignments...
            </div>
          ) : tasks.length === 0 ? (
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-12 text-center space-y-2">
              <h3 className="text-sm font-bold uppercase text-zinc-300 tracking-tight">No Open Directives</h3>
              <p className="text-xs font-mono text-zinc-600 uppercase tracking-wider">Awaiting dispatch orders from control matrix.</p>
            </div>
          ) : (
            tasks.map((task) => (
              <div
                key={task.task_id}
                className="rounded-xl border border-zinc-800/80 bg-zinc-900/40 p-4 sm:p-5 space-y-3 hover:border-zinc-700 transition font-mono"
              >
                {/* Meta Header */}
                <div className="flex justify-between items-start gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs sm:text-sm font-bold text-emerald-400">{task.task_id}</span>
                    <span className="px-2 py-0.5 rounded bg-zinc-800 border border-zinc-700/60 text-[10px] uppercase font-bold text-zinc-300">
                      {task.task_type}
                    </span>
                    {task.is_unverified && (
                      <span className="px-2 py-0.5 rounded bg-amber-950/40 border border-amber-500/30 text-[10px] uppercase font-bold text-amber-400">
                        Unverified
                      </span>
                    )}
                  </div>
                  <span className={`px-2 py-0.5 rounded border text-[10px] font-bold uppercase tracking-wider shrink-0 ${
                    task.status === 'ASSIGNED' ? 'border-amber-500/30 text-amber-400 bg-amber-950/30' :
                    task.status === 'IN_PROGRESS' ? 'border-blue-500/30 text-blue-400 bg-blue-950/30' :
                    task.status === 'REASSIGNMENT_REQUESTED' ? 'border-red-500/40 text-red-400 bg-red-950/40' :
                    'border-emerald-500/30 text-emerald-400 bg-emerald-950/30'
                  }`}>
                    {task.status}
                  </span>
                </div>

                {/* Subscriber Profile */}
                <div className="space-y-1">
                  <h3 className="text-base sm:text-lg font-bold uppercase tracking-tight text-zinc-100">{task.client_name}</h3>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-zinc-400">
                    <a
                      href={`https://maps.google.com/?q=${encodeURIComponent(task.address)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-zinc-200 underline decoration-zinc-700 truncate"
                    >
                      📍 {task.address}
                    </a>
                    {task.contact_number && (
                      <a href={`tel:${task.contact_number}`} className="text-emerald-400 hover:text-emerald-300">
                        📞 {task.contact_number}
                      </a>
                    )}
                  </div>

                  {task.landmark && (
                    <p className="text-xs text-zinc-400">
                      <span className="text-zinc-500 font-bold uppercase">Landmark / NAP:</span> {task.landmark}
                    </p>
                  )}

                  {task.issue && (
                    <div className="p-2.5 rounded-lg border border-red-500/20 bg-red-950/20 text-red-300 text-xs mt-2">
                      <span className="font-bold text-red-400 uppercase">[Reported Trouble]</span> {task.issue}
                    </div>
                  )}
                </div>

                {/* Operations & Lifecycle Controls */}
                <div className="pt-2.5 border-t border-zinc-800/80 flex flex-wrap justify-end gap-2">
                  {task.status === 'ASSIGNED' && (
                    <>
                      <button
                        onClick={() => {
                          setEscalateTask(task);
                          setEscalateReason('');
                        }}
                        className="px-3 py-1.5 rounded-lg border border-zinc-700 bg-zinc-950 text-zinc-400 text-xs uppercase tracking-wider font-semibold hover:bg-zinc-800 hover:text-zinc-200 transition"
                      >
                        Escalate / Reassign
                      </button>
                      <button
                        onClick={() => updateStatus(task.task_id, 'IN_PROGRESS')}
                        disabled={submitting}
                        className="px-4 py-1.5 rounded-lg bg-zinc-100 text-zinc-950 text-xs font-bold uppercase tracking-wider hover:bg-zinc-200 transition cursor-pointer disabled:opacity-50"
                      >
                        Commence Job →
                      </button>
                    </>
                  )}

                  {task.status === 'IN_PROGRESS' && (
                    <>
                      <button
                        onClick={() => {
                          setEscalateTask(task);
                          setEscalateReason('');
                        }}
                        className="px-3 py-1.5 rounded-lg border border-red-500/30 bg-red-950/20 text-red-400 text-xs uppercase tracking-wider font-semibold hover:bg-red-500 hover:text-white transition"
                      >
                        Halt & Reassign
                      </button>
                      <button
                        onClick={() => {
                          setCloseoutTask(task);
                          setResolutionDetails('');
                          setMaterialsUsed({ dropCableMeters: '', fastConnectors: '', patchCords: '' });
                        }}
                        disabled={submitting}
                        className="px-4 py-1.5 rounded-lg border border-emerald-500/40 bg-emerald-950/40 text-emerald-300 text-xs font-bold uppercase tracking-wider hover:bg-emerald-500 hover:text-zinc-950 transition cursor-pointer disabled:opacity-50"
                      >
                        Resolve & Closeout ✓
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </main>

      {/* CLOSEOUT MODAL */}
      {closeoutTask && (
        <div
          onClick={(e) => e.target === e.currentTarget && setCloseoutTask(null)}
          className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-150"
        >
          <div className="max-w-md w-full rounded-xl border border-zinc-800 bg-zinc-900 p-5 space-y-4 shadow-2xl">
            <div>
              <span className="text-[10px] font-mono uppercase tracking-widest text-emerald-400">Job Completion Closeout</span>
              <h3 className="text-sm sm:text-base font-bold uppercase tracking-tight text-zinc-100">
                {closeoutTask.task_id} // {closeoutTask.client_name}
              </h3>
            </div>

            <form onSubmit={handleCompleteTask} className="space-y-3 font-mono">
              <div>
                <label className="block text-[10px] uppercase tracking-widest text-zinc-400 mb-1">Resolution Details *</label>
                <textarea
                  required
                  rows={2}
                  value={resolutionDetails}
                  onChange={(e) => setResolutionDetails(e.target.value)}
                  placeholder="Root cause, repaired port/LCP, splice readings..."
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-xs text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600 resize-none"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase tracking-widest text-zinc-400 mb-1.5">Materials Consumed</label>
                <div className="grid grid-cols-3 gap-2">
                  <input
                    type="number"
                    placeholder="Drop (m)"
                    value={materialsUsed.dropCableMeters}
                    onChange={(e) => setMaterialsUsed({ ...materialsUsed, dropCableMeters: e.target.value })}
                    className="w-full px-2.5 py-1.5 bg-zinc-950 border border-zinc-800 rounded text-xs text-zinc-100 focus:outline-none focus:border-zinc-600"
                  />
                  <input
                    type="number"
                    placeholder="Connectors"
                    value={materialsUsed.fastConnectors}
                    onChange={(e) => setMaterialsUsed({ ...materialsUsed, fastConnectors: e.target.value })}
                    className="w-full px-2.5 py-1.5 bg-zinc-950 border border-zinc-800 rounded text-xs text-zinc-100 focus:outline-none focus:border-zinc-600"
                  />
                  <input
                    type="number"
                    placeholder="Patch Cords"
                    value={materialsUsed.patchCords}
                    onChange={(e) => setMaterialsUsed({ ...materialsUsed, patchCords: e.target.value })}
                    className="w-full px-2.5 py-1.5 bg-zinc-950 border border-zinc-800 rounded text-xs text-zinc-100 focus:outline-none focus:border-zinc-600"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setCloseoutTask(null)}
                  className="px-4 py-2 rounded-lg border border-zinc-800 text-xs font-semibold uppercase tracking-wider text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-lg bg-emerald-500 text-zinc-950 text-xs font-bold uppercase tracking-wider hover:bg-emerald-400 transition cursor-pointer"
                >
                  {submitting ? 'Submitting...' : 'Submit Resolution'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ESCALATION MODAL */}
      {escalateTask && (
        <div
          onClick={(e) => e.target === e.currentTarget && setEscalateTask(null)}
          className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-150"
        >
          <div className="max-w-md w-full rounded-xl border border-red-500/30 bg-zinc-900 p-5 space-y-4 shadow-2xl">
            <div>
              <span className="text-[10px] font-mono uppercase tracking-widest text-red-400 font-bold">Field Roadblock Escalation</span>
              <h3 className="text-sm sm:text-base font-bold uppercase tracking-tight text-zinc-100">
                {escalateTask.task_id} // {escalateTask.client_name}
              </h3>
            </div>

            <form onSubmit={handleRequestEscalation} className="space-y-3 font-mono">
              <div>
                <label className="block text-[10px] uppercase tracking-widest text-zinc-400 mb-1">Reason for Reassignment *</label>
                <textarea
                  required
                  rows={3}
                  value={escalateReason}
                  onChange={(e) => setEscalateReason(e.target.value)}
                  placeholder="e.g. Backbone break detected, outside service zone, unreachable client..."
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-xs text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600 resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setEscalateTask(null)}
                  className="px-4 py-2 rounded-lg border border-zinc-800 text-xs font-semibold uppercase tracking-wider text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-lg bg-red-500 text-zinc-950 text-xs font-bold uppercase tracking-wider hover:bg-red-400 transition cursor-pointer"
                >
                  {submitting ? 'Transmitting...' : 'Transmit Escalation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}