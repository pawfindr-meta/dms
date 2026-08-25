'use client';

import { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';

export default function DispatcherPage() {
  const [tasks, setTasks] = useState([]);
  const [teams, setTeams] = useState([]);
  const [techs, setTechs] = useState([]);
  const [loading, setLoading] = useState(true);

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
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 10000);
    return () => clearInterval(interval);
  }, []);

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
      if (res.ok) {
        setSelectedTask(null);
        setAssignTeamId('');
        loadData();
      }
    } finally {
      setIsAssigning(false);
    }
  };

  const handleAcknowledge = async (taskId) => {
    const res = await fetch(`/api/tasks/${taskId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ new_status: 'ACKNOWLEDGED' }),
    });
    if (res.ok) loadData();
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
      if (res.ok) {
        setRosterModalOpen(false);
        loadData();
      }
    } finally {
      setSavingRoster(false);
    }
  };

  const handleResolveReassign = async (e) => {
    e.preventDefault();
    if (!reassignTask) return;
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
    if (res.ok) {
      setReassignTask(null);
      loadData();
    }
  };

  return (
    <div className="h-screen w-screen bg-black text-white flex flex-col overflow-hidden font-sans">
      <Navbar user={{ name: 'Head Dispatcher', role: 'DISPATCHER' }} />

      <main className="flex-1 min-h-0 w-full p-6 md:p-8 flex flex-col gap-6">
        {/* Active Teams Strip */}
        <div className="border border-white/10 bg-white/[0.01] p-6 shrink-0 space-y-4">
          <div className="flex justify-between items-center border-b border-white/10 pb-3">
            <div>
              <span className="text-[11px] font-mono uppercase tracking-[0.3em] text-white/40">Field Units</span>
              <h2 className="text-base font-black uppercase tracking-tight">Active Workload Distribution</h2>
            </div>
            <span className="text-[11px] font-mono uppercase tracking-widest text-white/40">Click unit to modify roster</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {teams.map((t) => (
              <div
                key={t.team_id}
                onClick={() => {
                  setEditingTeam(t);
                  setSelectedTechs(t.members ? t.members.map((m) => m.tech_id) : []);
                  setRosterModalOpen(true);
                }}
                className="p-5 border border-white/10 bg-black hover:bg-white hover:text-black transition-all duration-300 cursor-pointer flex flex-col justify-between group space-y-3"
              >
                <div className="flex justify-between items-start">
                  <span className="font-black uppercase text-sm md:text-base tracking-tight">{t.team_name}</span>
                  <span className="px-3 py-1 border border-emerald-400 text-emerald-400 group-hover:bg-black group-hover:text-emerald-400 text-xs font-mono font-bold">
                    {t.active_workload} Active
                  </span>
                </div>
                <div className="text-xs font-mono text-white/50 group-hover:text-black/70 truncate">
                  {t.members?.length > 0 ? t.members.map((m) => m.tech_id).join(', ') : 'Unassigned'}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Live Task Matrix */}
        <div className="flex-1 min-h-0 border border-white/10 flex flex-col bg-white/[0.01]">
          <div className="p-6 flex justify-between items-center border-b border-white/10 shrink-0">
            <div>
              <span className="text-[11px] font-mono uppercase tracking-[0.3em] text-white/40">Real-Time Routing</span>
              <h2 className="text-xl font-black uppercase tracking-tight">Active Dispatch Matrix ({tasks.length})</h2>
            </div>
            <button
              onClick={loadData}
              className="px-4 py-2 border border-white/20 text-xs font-mono uppercase tracking-widest hover:bg-white hover:text-black transition cursor-pointer"
            >
              Refresh
            </button>
          </div>

          <div className="flex-1 overflow-auto">
            <table className="w-full text-left text-sm font-mono">
              <thead className="sticky top-0 bg-black/95 z-10">
                <tr className="border-b border-white/10 text-[11px] uppercase tracking-[0.25em] text-white/40 bg-white/[0.02]">
                  <th className="p-4">Task ID</th>
                  <th className="p-4">Type</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Client Name</th>
                  <th className="p-4">Assigned Unit</th>
                  <th className="p-4">Site Coordinates</th>
                  <th className="p-4 text-right">Operations</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {tasks.map((t) => (
                  <tr key={t.task_id} className="hover:bg-white/[0.02] transition">
                    <td className="p-4 font-bold text-emerald-400 text-base">{t.task_id}</td>
                    <td className="p-4 uppercase font-bold text-white">{t.task_type}</td>
                    <td className="p-4">
                      <span className={`px-3 py-1 border text-xs font-black uppercase tracking-wider ${
                        t.status === 'NEW' ? 'border-white/20 text-white/70' :
                        t.status === 'ASSIGNED' ? 'border-amber-400/50 text-amber-400' :
                        t.status === 'IN_PROGRESS' ? 'border-blue-400/50 text-blue-400' :
                        t.status === 'COMPLETED' ? 'border-emerald-400/50 text-emerald-400' :
                        t.status === 'REASSIGNMENT_REQUESTED' ? 'border-red-500 text-red-400 animate-pulse' :
                        'border-white/10 text-white/40'
                      }`}>
                        {t.status}
                      </span>
                    </td>
                    <td className="p-4 text-white uppercase font-bold text-base">{t.client_name}</td>
                    <td className="p-4 text-white/80 font-bold">{t.team_name || '—'}</td>
                    <td className="p-4 text-white/60 max-w-sm truncate">{t.address}</td>
                    <td className="p-4 text-right space-x-3 whitespace-nowrap">
                      {['NEW', 'RELEASED', 'ASSIGNED'].includes(t.status) && (
                        <button
                          onClick={() => setSelectedTask(t)}
                          className="px-4 py-2 bg-white text-black font-black uppercase text-xs tracking-widest hover:bg-white/80 transition cursor-pointer"
                        >
                          {t.status === 'ASSIGNED' ? 'Reassign' : 'Assign Unit'}
                        </button>
                      )}

                      {t.status === 'REASSIGNMENT_REQUESTED' && (
                        <button
                          onClick={() => setReassignTask(t)}
                          className="px-4 py-2 border border-red-500 text-red-400 hover:bg-red-500 hover:text-black font-black uppercase text-xs tracking-widest transition cursor-pointer"
                        >
                          Review Incident
                        </button>
                      )}

                      {t.status === 'COMPLETED' && (
                        <button
                          onClick={() => handleAcknowledge(t.task_id)}
                          className="px-4 py-2 border border-emerald-400 text-emerald-400 hover:bg-emerald-400 hover:text-black font-black uppercase text-xs tracking-widest transition cursor-pointer"
                        >
                          Acknowledge
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* ASSIGN TASK MODAL */}
      {selectedTask && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center p-6 z-50">
          <div className="max-w-lg w-full border border-white/20 bg-black p-8 space-y-6 shadow-2xl">
            <h3 className="text-lg font-black uppercase tracking-tight text-white">Route Job: {selectedTask.task_id}</h3>
            <p className="text-sm font-mono text-white/60">{selectedTask.client_name} • {selectedTask.address}</p>

            <form onSubmit={handleAssignTeam} className="space-y-4 font-mono">
              <select
                required
                value={assignTeamId}
                onChange={(e) => setAssignTeamId(e.target.value)}
                className="w-full px-4 py-3 bg-black border border-white/10 text-sm text-white uppercase focus:outline-none focus:border-white"
              >
                <option value="">-- Select Field Unit --</option>
                {teams.map((t) => (
                  <option key={t.team_id} value={t.team_id}>
                    {t.team_name} ({t.active_workload} active)
                  </option>
                ))}
              </select>

              <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setSelectedTask(null)}
                  className="px-5 py-2.5 border border-white/20 text-xs uppercase tracking-widest text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isAssigning}
                  className="px-6 py-2.5 bg-white text-black text-xs font-black uppercase tracking-widest hover:bg-white/80 cursor-pointer"
                >
                  {isAssigning ? 'Routing...' : 'Confirm Assignment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ROSTER MODAL */}
      {rosterModalOpen && editingTeam && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center p-6 z-50">
          <div className="max-w-lg w-full border border-white/20 bg-black p-8 space-y-6 shadow-2xl">
            <h3 className="text-lg font-black uppercase tracking-tight text-white">Unit Roster: {editingTeam.team_name}</h3>
            <form onSubmit={handleSaveRoster} className="space-y-4 font-mono">
              <div className="max-h-64 overflow-y-auto border border-white/10 p-3 space-y-2">
                {techs.map((t) => (
                  <label key={t.tech_id} className="flex items-center gap-3 p-2 hover:bg-white/[0.03] text-sm cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedTechs.includes(t.tech_id)}
                      onChange={() => setSelectedTechs((prev) => prev.includes(t.tech_id) ? prev.filter((id) => id !== t.tech_id) : [...prev, t.tech_id])}
                      className="rounded border-white/30 text-white bg-black focus:ring-0 w-4 h-4"
                    />
                    <span className="text-emerald-400 font-bold">{t.tech_id}</span>
                    <span className="text-white uppercase font-bold">{t.full_name}</span>
                  </label>
                ))}
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setRosterModalOpen(false)}
                  className="px-5 py-2.5 border border-white/20 text-xs uppercase tracking-widest text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingRoster}
                  className="px-6 py-2.5 bg-white text-black text-xs font-black uppercase tracking-widest hover:bg-white/80 cursor-pointer"
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
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center p-6 z-50">
          <div className="max-w-lg w-full border border-red-500/40 bg-black p-8 space-y-6 shadow-2xl">
            <h3 className="text-lg font-black uppercase tracking-tight text-red-400">Incident Review: {reassignTask.task_id}</h3>
            <form onSubmit={handleResolveReassign} className="space-y-4 font-mono">
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setReassignAction('APPROVED')}
                  className={`py-2.5 text-xs uppercase tracking-widest font-black border ${reassignAction === 'APPROVED' ? 'bg-white text-black border-white' : 'border-white/20 text-white'}`}
                >
                  Approve Reassign
                </button>
                <button
                  type="button"
                  onClick={() => setReassignAction('DENIED')}
                  className={`py-2.5 text-xs uppercase tracking-widest font-black border ${reassignAction === 'DENIED' ? 'bg-red-500 text-black border-red-500' : 'border-white/20 text-white'}`}
                >
                  Deny Request
                </button>
              </div>

              {reassignAction === 'APPROVED' && (
                <select
                  required
                  value={newTeamId}
                  onChange={(e) => setNewTeamId(e.target.value)}
                  className="w-full px-4 py-3 bg-black border border-white/10 text-sm text-white uppercase focus:outline-none focus:border-white"
                >
                  <option value="">-- Choose New Unit --</option>
                  {teams.map((t) => (
                    <option key={t.team_id} value={t.team_id}>
                      {t.team_name} ({t.active_workload} active)
                    </option>
                  ))}
                </select>
              )}

              <input
                type="text"
                value={reassignRemarks}
                onChange={(e) => setReassignRemarks(e.target.value)}
                placeholder="Operational remarks..."
                className="w-full px-4 py-3 bg-black border border-white/10 text-sm text-white focus:outline-none focus:border-white"
              />

              <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setReassignTask(null)}
                  className="px-5 py-2.5 border border-white/20 text-xs uppercase tracking-widest text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-white text-black text-xs font-black uppercase tracking-widest hover:bg-white/80 cursor-pointer"
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