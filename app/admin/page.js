'use client';

import { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState('users');
  const [users, setUsers] = useState([]);
  const [teams, setTeams] = useState([]);
  const [techs, setTechs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  // User Modal State
  const [userModalOpen, setUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [userForm, setUserForm] = useState({
    username_or_email: '',
    full_name: '',
    role: 'CSR',
    password: '',
    status: 'ACTIVE',
  });
  const [savingUser, setSavingUser] = useState(false);

  // Team Modal State
  const [teamModalOpen, setTeamModalOpen] = useState(false);
  const [editingTeam, setEditingTeam] = useState(null);
  const [teamName, setTeamName] = useState('');
  const [selectedTechs, setSelectedTechs] = useState([]);
  const [savingTeam, setSavingTeam] = useState(false);

  // Technician Form State
  const [techId, setTechId] = useState('');
  const [fullName, setFullName] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [personnelType, setPersonnelType] = useState('TECHNICIAN');

  const loadData = async () => {
    try {
      const [usersRes, teamsRes, techRes] = await Promise.all([
        fetch('/api/users'),
        fetch('/api/teams'),
        fetch('/api/technicians'),
      ]);

      if (usersRes.ok) setUsers(await usersRes.json());
      if (teamsRes.ok) setTeams(await teamsRes.json());
      if (techRes.ok) setTechs(await techRes.json());
    } catch (err) {
      console.error('Failed to load admin telemetry:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // --- USER HANDLERS ---
  const handleSaveUser = async (e) => {
    e.preventDefault();
    setSavingUser(true);
    setMessage('');
    try {
      const url = editingUser ? `/api/users/${editingUser.user_id}` : '/api/users';
      const method = editingUser ? 'PUT' : 'POST';

      const payload = {
        username_or_email: userForm.username_or_email.trim(),
        full_name: userForm.full_name.trim(),
        role: userForm.role,
        status: userForm.status || 'ACTIVE',
      };

      if (editingUser) {
        if (userForm.password?.trim()) {
          payload.new_password = userForm.password.trim();
        }
      } else {
        payload.password = userForm.password;
      }

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || `Request failed (${res.status})`);

      setMessage(editingUser ? `UPDATED // ${userForm.full_name}` : `CREATED // ${userForm.full_name}`);
      setUserModalOpen(false);
      loadData();
    } catch (err) {
      alert(err.message);
    } finally {
      setSavingUser(false);
    }
  };

  const handleDeleteUser = async (u) => {
    if (!confirm(`Revoke and delete user account "${u.full_name}"?`)) return;
    try {
      const res = await fetch(`/api/users/${u.user_id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || `Revocation failed (${res.status})`);

      setMessage(`DELETED // ${u.full_name}`);
      loadData();
    } catch (err) {
      alert(err.message);
    }
  };

  // --- TEAM HANDLERS ---
  const handleSaveTeam = async (e) => {
    e.preventDefault();
    if (!teamName.trim()) return;
    setSavingTeam(true);
    try {
      const url = editingTeam ? `/api/teams/${editingTeam.team_id}` : '/api/teams';
      const method = editingTeam ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ team_name: teamName.trim(), member_ids: selectedTechs }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || `Team update failed (${res.status})`);

      setMessage(`TEAM SYNCHRONIZED // ${teamName}`);
      setTeamModalOpen(false);
      loadData();
    } catch (err) {
      alert(err.message);
    } finally {
      setSavingTeam(false);
    }
  };

  const handleDeleteTeam = async (team) => {
    if (!confirm(`Decommission unit "${team.team_name}"?`)) return;
    try {
      const res = await fetch(`/api/teams/${team.team_id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || `Decommission failed (${res.status})`);

      setMessage(`DECOMMISSIONED // ${team.team_name}`);
      loadData();
    } catch (err) {
      alert(err.message);
    }
  };

  // --- TECHNICIAN HANDLERS ---
  const handleCreateTech = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/technicians', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tech_id: techId.trim().toUpperCase(),
          full_name: fullName.trim(),
          contact_number: contactNumber.trim(),
          personnel_type: personnelType,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || `Enrollment failed (${res.status})`);

      setMessage(`REGISTERED // ${data.tech_id}`);
      setTechId('');
      setFullName('');
      setContactNumber('');
      loadData();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleResetPin = async (id) => {
    if (!confirm(`Restore default PIN 00000000 for operative ${id}?`)) return;
    try {
      const res = await fetch(`/api/technicians/${id}/reset-pin`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || `Reset failed (${res.status})`);

      setMessage(`PIN RESTORED // ${id}`);
      loadData();
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div className="h-dvh w-screen bg-black text-white flex flex-col overflow-hidden font-sans">
      <Navbar user={{ name: 'Master Administrator', role: 'MASTER_ADMIN' }} />

      <main className="flex-1 min-h-0 w-full p-4 sm:p-6 md:p-8 flex flex-col gap-4 sm:gap-6">
        {/* Navigation Ribbon */}
        <div className="flex flex-wrap items-center justify-between border-b border-white/10 pb-3 sm:pb-4 gap-3 shrink-0">
          <div className="flex gap-2 sm:gap-3 overflow-x-auto max-w-full">
            {[
              { id: 'users', label: '01 / Personnel Access' },
              { id: 'teams', label: '02 / Field Units' },
              { id: 'techs', label: '03 / Technicians & OSP' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 sm:px-6 py-2.5 sm:py-3 text-[11px] sm:text-xs uppercase tracking-[0.25em] sm:tracking-[0.3em] font-black border transition-all cursor-pointer whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'bg-white text-black border-white shadow-[0_0_15px_rgba(255,255,255,0.2)]'
                    : 'bg-transparent text-white/50 border-white/10 hover:text-white hover:border-white/30'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <a
            href="/dispatcher"
            className="text-xs uppercase tracking-[0.25em] font-mono text-white/40 hover:text-white transition flex items-center gap-2"
          >
            Live Dispatch Queue ↗
          </a>
        </div>

        {message && (
          <div className="p-3 border border-white/20 bg-white/[0.02] text-xs sm:text-sm font-mono uppercase tracking-widest text-emerald-400 shrink-0">
            [SYS_MSG] {message}
          </div>
        )}

        {/* TAB 1: USERS */}
        {activeTab === 'users' && (
          <div className="flex-1 min-h-0 flex flex-col border border-white/10 bg-white/[0.01]">
            <div className="p-4 sm:p-6 flex justify-between items-center border-b border-white/10 shrink-0">
              <div>
                <span className="text-[10px] sm:text-[11px] font-mono uppercase tracking-[0.3em] text-white/40">Console Accounts</span>
                <h2 className="text-base sm:text-xl font-black uppercase tracking-tight">System Staff Directory ({users.length})</h2>
              </div>
              <button
                onClick={() => {
                  setEditingUser(null);
                  setUserForm({ username_or_email: '', full_name: '', role: 'CSR', password: '', status: 'ACTIVE' });
                  setUserModalOpen(true);
                }}
                className="px-4 sm:px-6 py-2 sm:py-3 bg-white text-black text-[10px] sm:text-xs font-black uppercase tracking-[0.2em] sm:tracking-[0.25em] hover:bg-white/80 cursor-pointer"
              >
                + Register User
              </button>
            </div>

            <div className="flex-1 min-h-0 overflow-auto">
              <table className="min-w-[750px] w-full text-left text-sm font-mono">
                <thead className="sticky top-0 bg-black/95 z-10">
                  <tr className="border-b border-white/10 text-[11px] uppercase tracking-[0.25em] text-white/40 bg-white/[0.02]">
                    <th className="p-4">User ID</th>
                    <th className="p-4">Full Legal Name</th>
                    <th className="p-4">System Identifier / Email</th>
                    <th className="p-4">Assigned Role</th>
                    <th className="p-4">Status</th>
                    <th className="p-4 text-right">Operations</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {users.map((u) => (
                    <tr key={u.user_id} className="hover:bg-white/[0.03] transition">
                      <td className="p-4 text-white/40 font-bold">#{u.user_id}</td>
                      <td className="p-4 font-bold text-white uppercase text-sm sm:text-base">{u.full_name}</td>
                      <td className="p-4 text-white/80 text-xs sm:text-sm">{u.username_or_email}</td>
                      <td className="p-4">
                        <span className="px-3 py-1 border border-white/20 text-xs uppercase tracking-wider font-bold">
                          {u.role}
                        </span>
                      </td>
                      <td className="p-4">
                        <span className={`text-xs font-bold uppercase ${u.status === 'ACTIVE' ? 'text-emerald-400' : 'text-white/30'}`}>
                          ● {u.status || 'ACTIVE'}
                        </span>
                      </td>
                      <td className="p-4 text-right space-x-3 whitespace-nowrap">
                        <button
                          onClick={() => {
                            setEditingUser(u);
                            setUserForm({
                              username_or_email: u.username_or_email,
                              full_name: u.full_name,
                              role: u.role,
                              password: '',
                              status: u.status || 'ACTIVE',
                            });
                            setUserModalOpen(true);
                          }}
                          className="px-3.5 py-1.5 border border-white/20 hover:bg-white hover:text-black transition text-xs uppercase tracking-wider font-bold cursor-pointer"
                        >
                          Configure
                        </button>
                        <button
                          onClick={() => handleDeleteUser(u)}
                          className="px-3.5 py-1.5 border border-red-500/40 text-red-400 hover:bg-red-500 hover:text-black transition text-xs uppercase tracking-wider font-bold cursor-pointer"
                        >
                          Revoke
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 2: TEAMS */}
        {activeTab === 'teams' && (
          <div className="flex-1 min-h-0 flex flex-col space-y-4">
            <div className="flex justify-between items-center shrink-0">
              <div>
                <span className="text-[10px] sm:text-[11px] font-mono uppercase tracking-[0.3em] text-white/40">Field Deployment Units</span>
                <h2 className="text-base sm:text-xl font-black uppercase tracking-tight">Active Team Matrix ({teams.length})</h2>
              </div>
              <button
                onClick={() => {
                  setEditingTeam(null);
                  setTeamName('');
                  setSelectedTechs([]);
                  setTeamModalOpen(true);
                }}
                className="px-4 sm:px-6 py-2 sm:py-3 bg-white text-black text-[10px] sm:text-xs font-black uppercase tracking-[0.2em] sm:tracking-[0.25em] hover:bg-white/80 cursor-pointer"
              >
                + Form New Team
              </button>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 pr-1">
              {teams.map((t) => (
                <div
                  key={t.team_id}
                  className="p-5 sm:p-6 border border-white/10 bg-white/[0.01] hover:border-white/40 transition flex flex-col justify-between space-y-4 sm:space-y-6 h-fit"
                >
                  <div className="space-y-3 sm:space-y-4">
                    <div className="flex justify-between items-start">
                      <h3 className="font-black text-white uppercase text-base sm:text-lg tracking-tight">{t.team_name}</h3>
                      <span className="px-2.5 sm:px-3 py-1 border border-emerald-400/40 text-emerald-400 text-xs font-mono font-bold uppercase">
                        {t.active_workload || 0} In Field
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] sm:text-[11px] font-mono uppercase tracking-[0.25em] text-white/40 block mb-2">
                        Assigned Operatives ({t.members?.length || 0})
                      </span>
                      <div className="space-y-1.5 sm:space-y-2 max-h-36 sm:max-h-40 overflow-y-auto">
                        {t.members?.length > 0 ? (
                          t.members.map((m, idx) => (
                            <div key={idx} className="p-2 sm:p-2.5 border border-white/5 bg-white/[0.02] flex justify-between items-center text-xs sm:text-sm font-mono">
                              <span className="text-white uppercase font-bold">{m.full_name}</span>
                              <span className="text-emerald-400 font-bold">{m.tech_id}</span>
                            </div>
                          ))
                        ) : (
                          <div className="text-xs sm:text-sm font-mono text-white/30 py-2 uppercase">No operatives assigned</div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 sm:pt-4 border-t border-white/10 flex justify-end gap-2.5 sm:gap-3">
                    <button
                      onClick={() => {
                        setEditingTeam(t);
                        setTeamName(t.team_name);
                        setSelectedTechs(t.members ? t.members.map((m) => m.tech_id) : []);
                        setTeamModalOpen(true);
                      }}
                      className="px-3.5 sm:px-4 py-1.5 sm:py-2 border border-white/20 text-xs uppercase tracking-widest font-black hover:bg-white hover:text-black transition cursor-pointer"
                    >
                      Edit Roster
                    </button>
                    <button
                      onClick={() => handleDeleteTeam(t)}
                      className="px-3.5 sm:px-4 py-1.5 sm:py-2 border border-red-500/30 text-red-400 text-xs uppercase tracking-widest font-black hover:bg-red-500 hover:text-black transition cursor-pointer"
                    >
                      Decommission
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 3: TECHS */}
        {activeTab === 'techs' && (
          <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 overflow-y-auto lg:overflow-hidden">
            <div className="lg:col-span-4 border border-white/10 bg-white/[0.01] p-5 sm:p-6 flex flex-col justify-between h-fit lg:h-full lg:overflow-y-auto">
              <div>
                <h3 className="text-base font-black uppercase tracking-tight text-white mb-4">Enroll Personnel</h3>
                <form onSubmit={handleCreateTech} className="space-y-3.5 sm:space-y-4 font-mono">
                  <div>
                    <label className="block text-[10px] sm:text-[11px] uppercase tracking-widest text-white/40 mb-1.5">Personnel Type</label>
                    <select
                      value={personnelType}
                      onChange={(e) => setPersonnelType(e.target.value)}
                      className="w-full px-3.5 sm:px-4 py-2.5 sm:py-3 bg-black border border-white/10 text-xs sm:text-sm text-white uppercase focus:outline-none focus:border-white"
                    >
                      <option value="TECHNICIAN">TECHNICIAN (Subscriber Line)</option>
                      <option value="OSP">OSP (Outside Plant)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] sm:text-[11px] uppercase tracking-widest text-white/40 mb-1.5">Operative ID</label>
                    <input
                      type="text"
                      required
                      value={techId}
                      onChange={(e) => setTechId(e.target.value)}
                      placeholder="T-0002"
                      className="w-full px-3.5 sm:px-4 py-2.5 sm:py-3 bg-black border border-white/10 text-xs sm:text-sm text-white uppercase focus:outline-none focus:border-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] sm:text-[11px] uppercase tracking-widest text-white/40 mb-1.5">Full Legal Name</label>
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Juan Dela Cruz"
                      className="w-full px-3.5 sm:px-4 py-2.5 sm:py-3 bg-black border border-white/10 text-xs sm:text-sm text-white uppercase focus:outline-none focus:border-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] sm:text-[11px] uppercase tracking-widest text-white/40 mb-1.5">Contact Link</label>
                    <input
                      type="text"
                      value={contactNumber}
                      onChange={(e) => setContactNumber(e.target.value)}
                      placeholder="09171234567"
                      className="w-full px-3.5 sm:px-4 py-2.5 sm:py-3 bg-black border border-white/10 text-xs sm:text-sm text-white focus:outline-none focus:border-white"
                    />
                  </div>

                  <p className="text-[10px] text-white/40 tracking-wider uppercase">Default access PIN: 00000000.</p>

                  <button
                    type="submit"
                    className="w-full py-3 sm:py-3.5 bg-white text-black font-black uppercase text-xs tracking-widest hover:bg-white/80 transition cursor-pointer mt-2"
                  >
                    Enroll Operative
                  </button>
                </form>
              </div>
            </div>

            <div className="lg:col-span-8 border border-white/10 flex flex-col h-[400px] lg:h-full overflow-hidden">
              <div className="flex-1 min-h-0 overflow-auto">
                <table className="min-w-[700px] w-full text-left text-sm font-mono">
                  <thead className="sticky top-0 bg-black/95 z-10">
                    <tr className="border-b border-white/10 text-[11px] uppercase tracking-[0.25em] text-white/40 bg-white/[0.02]">
                      <th className="p-4">ID</th>
                      <th className="p-4">Full Name</th>
                      <th className="p-4">Role</th>
                      <th className="p-4">Contact</th>
                      <th className="p-4">Password State</th>
                      <th className="p-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/10">
                    {techs.map((t) => (
                      <tr key={t.tech_id} className="hover:bg-white/[0.02]">
                        <td className="p-4 font-bold text-emerald-400 text-sm sm:text-base">{t.tech_id}</td>
                        <td className="p-4 text-white uppercase font-bold">{t.full_name}</td>
                        <td className="p-4">
                          <span className="px-3 py-1 border border-white/20 text-xs">{t.personnel_type}</span>
                        </td>
                        <td className="p-4 text-white/60">{t.contact_number || '—'}</td>
                        <td className="p-4">
                          <span className={`text-xs font-bold uppercase ${t.must_change_password ? 'text-amber-400' : 'text-emerald-400'}`}>
                            {t.must_change_password ? 'Default PIN' : 'Active Key'}
                          </span>
                        </td>
                        <td className="p-4 text-right whitespace-nowrap">
                          <button
                            onClick={() => handleResetPin(t.tech_id)}
                            className="px-3 py-1.5 border border-white/20 text-xs uppercase tracking-wider font-bold hover:bg-white hover:text-black transition cursor-pointer"
                          >
                            Reset PIN
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* USER MODAL */}
      {userModalOpen && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 z-50">
          <div className="max-w-xl w-full border border-white/20 bg-black p-6 sm:p-8 space-y-6 shadow-2xl">
            <h3 className="text-base sm:text-lg font-black uppercase tracking-tight text-white">
              {editingUser ? `Configure // ${editingUser.full_name}` : 'Provision User Account'}
            </h3>
            <form onSubmit={handleSaveUser} className="space-y-4 font-mono">
              <input
                type="text"
                required
                placeholder="Full Name"
                value={userForm.full_name}
                onChange={(e) => setUserForm({ ...userForm, full_name: e.target.value })}
                className="w-full px-4 py-2.5 sm:py-3 bg-black border border-white/10 text-sm text-white uppercase focus:outline-none focus:border-white"
              />
              <input
                type="text"
                required
                placeholder="Identifier / Email"
                value={userForm.username_or_email}
                onChange={(e) => setUserForm({ ...userForm, username_or_email: e.target.value })}
                className="w-full px-4 py-2.5 sm:py-3 bg-black border border-white/10 text-sm text-white focus:outline-none focus:border-white"
              />
              <div className="grid grid-cols-2 gap-3">
                <select
                  value={userForm.role}
                  onChange={(e) => setUserForm({ ...userForm, role: e.target.value })}
                  className="w-full px-4 py-2.5 sm:py-3 bg-black border border-white/10 text-sm text-white uppercase focus:outline-none focus:border-white"
                >
                  <option value="CSR">CSR</option>
                  <option value="DISPATCHER">DISPATCHER</option>
                  <option value="MASTER_ADMIN">MASTER_ADMIN</option>
                </select>
                {editingUser && (
                  <select
                    value={userForm.status}
                    onChange={(e) => setUserForm({ ...userForm, status: e.target.value })}
                    className="w-full px-4 py-2.5 sm:py-3 bg-black border border-white/10 text-sm text-white uppercase focus:outline-none focus:border-white"
                  >
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="INACTIVE">INACTIVE</option>
                  </select>
                )}
              </div>
              <input
                type="password"
                required={!editingUser}
                placeholder={editingUser ? 'New Password (leave blank to keep current)' : 'Password (min 8 chars)'}
                value={userForm.password}
                onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                className="w-full px-4 py-2.5 sm:py-3 bg-black border border-white/10 text-sm text-white focus:outline-none focus:border-white"
              />
              <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setUserModalOpen(false)}
                  className="px-4 sm:px-5 py-2 sm:py-2.5 border border-white/20 text-xs uppercase tracking-widest text-white hover:bg-white/10"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingUser}
                  className="px-5 sm:px-6 py-2 sm:py-2.5 bg-white text-black text-xs font-black uppercase tracking-widest hover:bg-white/80"
                >
                  {savingUser ? 'Saving...' : 'Commit Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TEAM MODAL */}
      {teamModalOpen && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 z-50">
          <div className="max-w-xl w-full border border-white/20 bg-black p-6 sm:p-8 space-y-6 shadow-2xl">
            <h3 className="text-base sm:text-lg font-black uppercase tracking-tight text-white">
              {editingTeam ? `Roster // ${editingTeam.team_name}` : 'Form New Field Unit'}
            </h3>
            <form onSubmit={handleSaveTeam} className="space-y-4 font-mono">
              <input
                type="text"
                required
                placeholder="Team Designation (e.g. Team Delta - Maysan)"
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                className="w-full px-4 py-2.5 sm:py-3 bg-black border border-white/10 text-sm text-white uppercase focus:outline-none focus:border-white"
              />
              <div>
                <label className="block text-[10px] sm:text-[11px] uppercase tracking-widest text-white/40 mb-2">Assign Personnel</label>
                <div className="max-h-56 overflow-y-auto border border-white/10 p-3 space-y-2">
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
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setTeamModalOpen(false)}
                  className="px-4 sm:px-5 py-2 sm:py-2.5 border border-white/20 text-xs uppercase tracking-widest text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingTeam}
                  className="px-5 sm:px-6 py-2 sm:py-2.5 bg-white text-black text-xs font-black uppercase tracking-widest hover:bg-white/80"
                >
                  {savingTeam ? 'Saving...' : 'Deploy Team'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}