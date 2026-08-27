'use client';

import { useState, useEffect, useMemo } from 'react';
import Navbar from '@/components/Navbar';

export default function DispatcherPage() {
  const [tasks, setTasks] = useState([]);
  const [teams, setTeams] = useState([]);
  const [techs, setTechs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Assignment Modal
  const [selectedTask, setSelectedTask] = useState(null);
  const [assignTeamId, setAssignTeamId] = useState('');
  const [isAssigning, setIsAssigning] = useState(false);

  // Reassignment Modal
  const [reassignTask, setReassignTask] = useState(null);
  const [reassignAction, setReassignAction] = useState('APPROVED');
  const [reassignResolution, setReassignResolution] = useState('REASSIGNED');
  const [newTeamId, setNewTeamId] = useState('');
  const [reassignRemarks, setReassignRemarks] = useState('');

  // Roster Modal
  const [rosterModalOpen, setRosterModalOpen] = useState(false);
  const [editingTeam, setEditingTeam] = useState(null);
  const [selectedTechs, setSelectedTechs] = useState([]);
  const [savingRoster, setSavingRoster] = useState(false);

  const loadData = async () => {
    try {
      const [tasksRes, teamsRes, techsRes] = await Promise.all([
        fetch('/api/tasks'),
        fetch('/api/teams'),
        fetch('/api/technicians'),
      ]);
      if (tasksRes.ok) setTasks(await tasksRes.json());
      if (teamsRes.ok) setTeams(await teamsRes.json());
      if (techsRes.ok) setTechs(await techsRes.json());
    } catch (err) {
      console.error('Failed to synchronize dispatch telemetry:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 10000);
    return () => clearInterval(interval);
  }, []);

  // Filter tasks dynamically
  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      const matchesSearch =
        t.task_id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.client_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.address?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.team_name?.toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchesSearch) return false;

      if (statusFilter === 'UNASSIGNED') return ['NEW', 'RELEASED'].includes(t.status);
      if (statusFilter === 'IN_FIELD') return ['ASSIGNED', 'IN_PROGRESS', 'ON_SITE', 'EN_ROUTE'].includes(t.status);
      if (statusFilter === 'COMPLETED') return t.status === 'COMPLETED';
      if (statusFilter === 'ESCALATED') return t.status === 'REASSIGNMENT_REQUESTED';
      return true;
    });
  }, [tasks, searchQuery, statusFilter]);

  const handleAssignTeam = async (e) => {
    e.preventDefault();
    if (!selectedTask || !assignTeamId) return;
    setIsAssigning(true);
    try {
      const res = await fetch(`/api/tasks/${selectedTask.task_id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          new_status: 'ASSIGNED',
          assigned_team_id: parseInt(assignTeamId, 10),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || `Assignment failed (${res.status})`);

      setSelectedTask(null);
      setAssignTeamId('');
      loadData();
    } catch (err) {
      alert(err.message);
    } finally {
      setIsAssigning(false);
    }
  };

  const handleAcknowledge = async (taskId) => {
    try {
      const res = await fetch(`/api/tasks/${taskId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ new_status: 'ACKNOWLEDGED' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || `Acknowledge failed (${res.status})`);
      loadData();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDeleteTask = async (taskId) => {
    if (!confirm(`Permanently remove dispatch directive #${taskId}?`)) return;

    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || `Deletion failed (${res.status})`);

      setTasks((prev) => prev.filter((t) => t.task_id !== taskId));
      loadData();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleSaveRoster = async (e) => {
    e.preventDefault();
    if (!editingTeam) return;
    setSavingRoster(true);
    try {
      const res = await fetch(`/api/teams/${editingTeam.team_id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ team_name: editingTeam.team_name, member_ids: selectedTechs }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || `Roster update failed (${res.status})`);

      setRosterModalOpen(false);
      loadData();
    } catch (err) {
      alert(err.message);
    } finally {
      setSavingRoster(false);
    }
  };

  const handleResolveReassign = async (e) => {
    e.preventDefault();
    if (!reassignTask) return;
    try {
      const res = await fetch(`/api/tasks/${reassignTask.task_id}/reassign-resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: reassignAction,
          resolution: reassignResolution,
          new_team_id: newTeamId ? parseInt(newTeamId, 10) : null,
          remarks: reassignRemarks,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || `Reassignment resolution failed (${res.status})`);

      setReassignTask(null);
      loadData();
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div className="h-[100dvh] w-screen bg-zinc-950 text-zinc-100 flex flex-col overflow-hidden font-sans select-none">
      <Navbar user={{ name: 'Head Dispatcher', role: 'DISPATCHER' }} />

      <main className="flex-1 min-h-0 w-full p-3 sm:p-5 md:p-6 flex flex-col gap-3 sm:gap-4 overflow-hidden">
        
        {/* Active Teams Strip */}
        <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/40 p-3 sm:p-4 shrink-0 space-y-2.5">
          <div className="flex justify-between items-center border-b border-zinc-800 pb-2">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[10px] font-mono uppercase tracking-[0.25em] text-zinc-400">
                Field Units Workload ({teams.length})
              </span>
            </div>
            <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 hidden sm:block">
              Click unit card to modify operative roster
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 max-h-36 overflow-y-auto custom-scrollbar">
            {teams.map((t) => (
              <div
                key={t.team_id}
                onClick={() => {
                  setEditingTeam(t);
                  setSelectedTechs(t.members ? t.members.map((m) => m.tech_id) : []);
                  setRosterModalOpen(true);
                }}
                className="p-3 rounded-lg border border-zinc-800 bg-zinc-950/80 hover:border-zinc-700 hover:bg-zinc-900/60 transition cursor-pointer flex flex-col justify-between group space-y-1.5"
              >
                <div className="flex justify-between items-start gap-2">
                  <span className="font-bold uppercase text-xs tracking-tight text-zinc-200 group-hover:text-white truncate">
                    {t.team_name}
                  </span>
                  <span className="px-2 py-0.5 rounded-full border border-emerald-500/30 bg-emerald-950/40 text-emerald-400 text-[10px] font-mono font-bold shrink-0">
                    {t.active_workload} Active
                  </span>
                </div>
                <div className="text-[10px] font-mono text-zinc-500 truncate">
                  {t.members?.length > 0 ? t.members.map((m) => m.tech_id).join(', ') : 'No Operatives'}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Live Task Matrix */}
        <div className="flex-1 min-h-0 rounded-xl border border-zinc-800/80 bg-zinc-900/30 flex flex-col overflow-hidden">
          
          {/* Header, Filters & Search */}
          <div className="p-3 sm:p-4 border-b border-zinc-800 bg-zinc-900/60 flex flex-wrap justify-between items-center gap-3 shrink-0">
            <div className="flex items-center gap-2">
              {[
                { id: 'ALL', label: 'All Jobs' },
                { id: 'UNASSIGNED', label: 'Unassigned' },
                { id: 'IN_FIELD', label: 'In Field' },
                { id: 'ESCALATED', label: 'Escalated' },
                { id: 'COMPLETED', label: 'Completed' },
              ].map((filter) => (
                <button
                  key={filter.id}
                  onClick={() => setStatusFilter(filter.id)}
                  className={`px-3 py-1 text-[11px] font-mono uppercase tracking-wider rounded-lg border transition cursor-pointer ${
                    statusFilter === filter.id
                      ? 'bg-zinc-100 text-zinc-950 border-zinc-100 font-bold'
                      : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700'
                  }`}
                >
                  {filter.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2.5">
              <input
                type="text"
                placeholder="Search directives..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="px-3 py-1.5 bg-zinc-950 border border-zinc-800 rounded-lg text-xs font-mono text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600 w-44 sm:w-56"
              />
              <button
                onClick={loadData}
                className="px-3 py-1.5 rounded-lg border border-zinc-700 bg-zinc-900 text-xs font-mono uppercase tracking-wider text-zinc-300 hover:bg-zinc-800 hover:text-white transition cursor-pointer"
              >
                Refresh
              </button>
            </div>
          </div>

          {/* Table Content */}
          <div className="flex-1 min-h-0 overflow-auto custom-scrollbar">
            <table className="w-full text-left text-xs font-mono">
              <thead className="sticky top-0 bg-zinc-900/95 backdrop-blur z-10 border-b border-zinc-800">
                <tr className="text-[10px] uppercase tracking-[0.2em] text-zinc-400">
                  <th className="p-3.5 sm:p-4">Directive ID</th>
                  <th className="p-3.5 sm:p-4">Type</th>
                  <th className="p-3.5 sm:p-4">Status</th>
                  <th className="p-3.5 sm:p-4">Client / Subscriber</th>
                  <th className="p-3.5 sm:p-4">Assigned Unit</th>
                  <th className="p-3.5 sm:p-4">Site Location</th>
                  <th className="p-3.5 sm:p-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="p-12 text-center text-zinc-600 uppercase tracking-widest text-xs">
                      Synchronizing active routing telemetry...
                    </td>
                  </tr>
                ) : filteredTasks.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-12 text-center text-zinc-600 uppercase tracking-widest text-xs">
                      No matching field directives found
                    </td>
                  </tr>
                ) : (
                  filteredTasks.map((t) => (
                    <tr key={t.task_id} className="hover:bg-zinc-800/20 transition-colors">
                      <td className="p-3.5 sm:p-4 font-bold text-emerald-400">{t.task_id}</td>
                      <td className="p-3.5 sm:p-4 font-semibold text-zinc-300 uppercase">{t.task_type}</td>
                      <td className="p-3.5 sm:p-4">
                        <span className={`px-2 py-0.5 rounded border text-[10px] font-bold uppercase tracking-wider ${
                          t.status === 'NEW' ? 'border-zinc-700 text-zinc-400 bg-zinc-900' :
                          t.status === 'ASSIGNED' ? 'border-amber-500/30 text-amber-400 bg-amber-950/30' :
                          t.status === 'IN_PROGRESS' ? 'border-blue-500/30 text-blue-400 bg-blue-950/30' :
                          t.status === 'COMPLETED' ? 'border-emerald-500/30 text-emerald-400 bg-emerald-950/30' :
                          t.status === 'REASSIGNMENT_REQUESTED' ? 'border-red-500/40 text-red-400 bg-red-950/40 animate-pulse' :
                          'border-zinc-800 text-zinc-500'
                        }`}>
                          {t.status}
                        </span>
                      </td>
                      <td className="p-3.5 sm:p-4 font-bold text-zinc-100 uppercase">{t.client_name}</td>
                      <td className="p-3.5 sm:p-4 font-semibold text-zinc-300">{t.team_name || '—'}</td>
                      <td className="p-3.5 sm:p-4 text-zinc-400 max-w-xs truncate">{t.address}</td>
                      <td className="p-3.5 sm:p-4 text-right whitespace-nowrap space-x-2">
                        {['NEW', 'RELEASED', 'ASSIGNED'].includes(t.status) && (
                          <button
                            onClick={() => {
                              setSelectedTask(t);
                              setAssignTeamId(t.assigned_team_id ? String(t.assigned_team_id) : '');
                            }}
                            className="px-3 py-1 bg-zinc-100 text-zinc-950 font-bold uppercase text-[11px] tracking-wider rounded hover:bg-zinc-200 transition cursor-pointer"
                          >
                            {t.status === 'ASSIGNED' ? 'Reassign' : 'Assign Unit'}
                          </button>
                        )}

                        {t.status === 'REASSIGNMENT_REQUESTED' && (
                          <button
                            onClick={() => setReassignTask(t)}
                            className="px-3 py-1 border border-red-500/40 bg-red-950/30 text-red-400 hover:bg-red-500 hover:text-zinc-950 font-bold uppercase text-[11px] tracking-wider rounded transition cursor-pointer"
                          >
                            Review Request
                          </button>
                        )}

                        {t.status === 'COMPLETED' && (
                          <button
                            onClick={() => handleAcknowledge(t.task_id)}
                            className="px-3 py-1 border border-emerald-500/40 bg-emerald-950/30 text-emerald-400 hover:bg-emerald-500 hover:text-zinc-950 font-bold uppercase text-[11px] tracking-wider rounded transition cursor-pointer"
                          >
                            Acknowledge
                          </button>
                        )}

                        <button
                          onClick={() => handleDeleteTask(t.task_id)}
                          className="px-2.5 py-1 rounded border border-red-500/30 text-red-400 hover:bg-red-500 hover:text-zinc-950 transition text-[11px] font-bold uppercase tracking-wider cursor-pointer"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* ASSIGN TASK MODAL */}
      {selectedTask && (
        <div
          onClick={(e) => e.target === e.currentTarget && setSelectedTask(null)}
          className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-150"
        >
          <div className="max-w-md w-full rounded-xl border border-zinc-800 bg-zinc-900 p-5 space-y-4 shadow-2xl">
            <div>
              <span className="text-[10px] font-mono uppercase tracking-widest text-emerald-400">Route Field Job</span>
              <h3 className="text-sm sm:text-base font-bold uppercase tracking-tight text-zinc-100">
                {selectedTask.task_id} // {selectedTask.client_name}
              </h3>
              <p className="text-xs font-mono text-zinc-400 truncate mt-0.5">{selectedTask.address}</p>
            </div>

            <form onSubmit={handleAssignTeam} className="space-y-3 font-mono">
              <div>
                <label className="block text-[10px] uppercase tracking-widest text-zinc-400 mb-1">Target Field Unit</label>
                <select
                  required
                  value={assignTeamId}
                  onChange={(e) => setAssignTeamId(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-xs text-zinc-200 uppercase focus:outline-none focus:border-zinc-600"
                >
                  <option value="">-- Select Field Unit --</option>
                  {teams.map((t) => (
                    <option key={t.team_id} value={t.team_id}>
                      {t.team_name} ({t.active_workload} Active)
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setSelectedTask(null)}
                  className="px-4 py-2 rounded-lg border border-zinc-800 text-xs font-semibold uppercase tracking-wider text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isAssigning}
                  className="px-4 py-2 rounded-lg bg-zinc-100 text-zinc-950 text-xs font-bold uppercase tracking-wider hover:bg-zinc-200 transition cursor-pointer"
                >
                  {isAssigning ? 'Routing...' : 'Confirm Order'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ROSTER MODAL */}
      {rosterModalOpen && editingTeam && (
        <div
          onClick={(e) => e.target === e.currentTarget && setRosterModalOpen(false)}
          className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-150"
        >
          <div className="max-w-lg w-full rounded-xl border border-zinc-800 bg-zinc-900 p-5 space-y-4 shadow-2xl">
            <h3 className="text-sm sm:text-base font-bold uppercase tracking-tight text-zinc-100">
              Unit Roster // {editingTeam.team_name}
            </h3>
            <form onSubmit={handleSaveRoster} className="space-y-3 font-mono">
              <div className="max-h-56 overflow-y-auto custom-scrollbar border border-zinc-800 rounded-lg p-2 space-y-1 bg-zinc-950">
                {techs.map((t) => (
                  <label key={t.tech_id} className="flex items-center gap-2.5 p-2 rounded hover:bg-zinc-900 text-xs cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedTechs.includes(t.tech_id)}
                      onChange={() => setSelectedTechs((prev) => prev.includes(t.tech_id) ? prev.filter((id) => id !== t.tech_id) : [...prev, t.tech_id])}
                      className="rounded border-zinc-700 text-zinc-100 bg-zinc-900 focus:ring-0 w-3.5 h-3.5"
                    />
                    <span className="text-emerald-400 font-bold">{t.tech_id}</span>
                    <span className="text-zinc-200 uppercase font-semibold">{t.full_name}</span>
                  </label>
                ))}
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setRosterModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-zinc-800 text-xs font-semibold uppercase tracking-wider text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingRoster}
                  className="px-4 py-2 rounded-lg bg-zinc-100 text-zinc-950 text-xs font-bold uppercase tracking-wider hover:bg-zinc-200 transition cursor-pointer"
                >
                  {savingRoster ? 'Saving...' : 'Update Roster'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* REASSIGN REVIEW MODAL */}
      {reassignTask && (
        <div
          onClick={(e) => e.target === e.currentTarget && setReassignTask(null)}
          className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-150"
        >
          <div className="max-w-md w-full rounded-xl border border-red-500/30 bg-zinc-900 p-5 space-y-4 shadow-2xl">
            <div>
              <span className="text-[10px] font-mono uppercase tracking-widest text-red-400 font-bold">Escalation Review</span>
              <h3 className="text-sm sm:text-base font-bold uppercase tracking-tight text-zinc-100">
                {reassignTask.task_id} // {reassignTask.client_name}
              </h3>
            </div>

            <form onSubmit={handleResolveReassign} className="space-y-3 font-mono">
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setReassignAction('APPROVED')}
                  className={`py-2 text-xs uppercase tracking-wider font-bold rounded-lg border transition ${
                    reassignAction === 'APPROVED'
                      ? 'bg-zinc-100 text-zinc-950 border-zinc-100'
                      : 'border-zinc-800 text-zinc-400 bg-zinc-950 hover:border-zinc-700'
                  }`}
                >
                  Approve Reassign
                </button>
                <button
                  type="button"
                  onClick={() => setReassignAction('DENIED')}
                  className={`py-2 text-xs uppercase tracking-wider font-bold rounded-lg border transition ${
                    reassignAction === 'DENIED'
                      ? 'bg-red-500 text-zinc-950 border-red-500'
                      : 'border-zinc-800 text-zinc-400 bg-zinc-950 hover:border-zinc-700'
                  }`}
                >
                  Deny Request
                </button>
              </div>

              {reassignAction === 'APPROVED' && (
                <div>
                  <label className="block text-[10px] uppercase tracking-widest text-zinc-400 mb-1">Transfer to Unit</label>
                  <select
                    required
                    value={newTeamId}
                    onChange={(e) => setNewTeamId(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-xs text-zinc-200 uppercase focus:outline-none focus:border-zinc-600"
                  >
                    <option value="">-- Choose New Unit --</option>
                    {teams.map((t) => (
                      <option key={t.team_id} value={t.team_id}>
                        {t.team_name} ({t.active_workload} Active)
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-[10px] uppercase tracking-widest text-zinc-400 mb-1">Remarks</label>
                <input
                  type="text"
                  value={reassignRemarks}
                  onChange={(e) => setReassignRemarks(e.target.value)}
                  placeholder="Reason / Dispatcher remarks..."
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-xs text-zinc-200 focus:outline-none focus:border-zinc-600"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setReassignTask(null)}
                  className="px-4 py-2 rounded-lg border border-zinc-800 text-xs font-semibold uppercase tracking-wider text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-zinc-100 text-zinc-950 text-xs font-bold uppercase tracking-wider hover:bg-zinc-200 transition cursor-pointer"
                >
                  Commit Order
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}