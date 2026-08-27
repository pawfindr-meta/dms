'use client';

import { useState, useEffect, useMemo } from 'react';
import Navbar from '@/components/Navbar';

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState('users');
  const [users, setUsers] = useState([]);
  const [teams, setTeams] = useState([]);
  const [techs, setTechs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

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
  const [enrollingTech, setEnrollingTech] = useState(false);

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

  const triggerSysMessage = (msg) => {
    setMessage(msg);
    setTimeout(() => setMessage(''), 4000);
  };

  // Filtered lists based on search bar
  const filteredUsers = useMemo(() => {
    if (!searchQuery.trim()) return users;
    const q = searchQuery.toLowerCase();
    return users.filter(
      (u) =>
        u.full_name?.toLowerCase().includes(q) ||
        u.username_or_email?.toLowerCase().includes(q) ||
        u.role?.toLowerCase().includes(q)
    );
  }, [users, searchQuery]);

  const filteredTechs = useMemo(() => {
    if (!searchQuery.trim()) return techs;
    const q = searchQuery.toLowerCase();
    return techs.filter(
      (t) =>
        t.full_name?.toLowerCase().includes(q) ||
        t.tech_id?.toLowerCase().includes(q) ||
        t.personnel_type?.toLowerCase().includes(q)
    );
  }, [techs, searchQuery]);

  // --- USER HANDLERS ---
  const handleSaveUser = async (e) => {
    e.preventDefault();
    setSavingUser(true);
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

      triggerSysMessage(editingUser ? `UPDATED // ${userForm.full_name}` : `CREATED // ${userForm.full_name}`);
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

      triggerSysMessage(`DELETED // ${u.full_name}`);
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

      triggerSysMessage(`TEAM SYNCHRONIZED // ${teamName}`);
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

      triggerSysMessage(`DECOMMISSIONED // ${team.team_name}`);
      loadData();
    } catch (err) {
      alert(err.message);
    }
  };

  // --- TECHNICIAN HANDLERS ---
  const handleCreateTech = async (e) => {
    e.preventDefault();
    setEnrollingTech(true);
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

      triggerSysMessage(`REGISTERED // ${data.tech_id}`);
      setTechId('');
      setFullName('');
      setContactNumber('');
      loadData();
    } catch (err) {
      alert(err.message);
    } finally {
      setEnrollingTech(false);
    }
  };

  const handleResetPin = async (id) => {
    if (!confirm(`Restore default PIN 00000000 for operative ${id}?`)) return;
    try {
      const res = await fetch(`/api/technicians/${id}/reset-pin`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || `Reset failed (${res.status})`);

      triggerSysMessage(`PIN RESTORED // ${id}`);
      loadData();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDeleteTech = async (tech) => {
    if (!confirm(`Permanently remove operative "${tech.full_name}" (${tech.tech_id})?`)) return;
    try {
      const res = await fetch(`/api/technicians/${tech.tech_id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || `Removal failed (${res.status})`);

      triggerSysMessage(`OPERATIVE REMOVED // ${tech.tech_id}`);
      loadData();
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div className="h-[100dvh] w-screen bg-zinc-950 text-zinc-100 flex flex-col overflow-hidden font-sans select-none">
      <Navbar user={{ name: 'Master Administrator', role: 'MASTER_ADMIN' }} />

      <main className="flex-1 min-h-0 w-full p-3 sm:p-5 md:p-6 flex flex-col gap-3 sm:gap-4 overflow-hidden">
        
        {/* Navigation Ribbon & Global Telemetry */}
        <div className="flex flex-wrap items-center justify-between border-b border-zinc-800 pb-3 gap-3 shrink-0">
          <div className="flex gap-2 overflow-x-auto max-w-full">
            {[
              { id: 'users', label: '01 / Personnel Access' },
              { id: 'teams', label: '02 / Field Units' },
              { id: 'techs', label: '03 / Technicians & OSP' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  setSearchQuery('');
                }}
                className={`px-3.5 sm:px-5 py-2 text-[11px] sm:text-xs uppercase tracking-[0.2em] font-bold rounded-lg border transition-all cursor-pointer whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'bg-zinc-100 text-zinc-950 border-zinc-100 shadow-[0_0_12px_rgba(255,255,255,0.15)]'
                    : 'bg-zinc-900/50 text-zinc-400 border-zinc-800 hover:text-zinc-200 hover:border-zinc-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3">
            {activeTab !== 'teams' && (
              <input
                type="text"
                placeholder="Filter records..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="px-3 py-1.5 bg-zinc-900 border border-zinc-800 rounded-lg text-xs font-mono text-zinc-200 focus:outline-none focus:border-zinc-600 placeholder:text-zinc-600 w-44 sm:w-56"
              />
            )}
            <a
              href="/dispatcher"
              className="text-[11px] uppercase tracking-widest font-mono text-zinc-400 hover:text-zinc-100 transition flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-800 hover:border-zinc-700 bg-zinc-900/50"
            >
              Dispatch Queue ↗
            </a>
          </div>
        </div>

        {/* System Message Banner */}
        {message && (
          <div className="px-4 py-2.5 rounded-lg border border-emerald-500/30 bg-emerald-950/30 text-xs font-mono uppercase tracking-widest text-emerald-400 shrink-0 flex items-center justify-between">
            <span className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
              [SYS_MSG] {message}
            </span>
            <button onClick={() => setMessage('')} className="text-zinc-400 hover:text-zinc-200 text-xs">✕</button>
          </div>
        )}

        {/* TAB 1: USERS */}
        {activeTab === 'users' && (
          <div className="flex-1 min-h-0 flex flex-col rounded-xl border border-zinc-800/80 bg-zinc-900/30 overflow-hidden">
            <div className="p-4 sm:p-5 flex justify-between items-center border-b border-zinc-800/80 bg-zinc-900/60 shrink-0">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-[0.25em] text-zinc-500">Console Security</span>
                <h2 className="text-sm sm:text-base font-bold uppercase tracking-tight text-zinc-100">
                  Staff Accounts Directory ({filteredUsers.length})
                </h2>
              </div>
              <button
                onClick={() => {
                  setEditingUser(null);
                  setUserForm({ username_or_email: '', full_name: '', role: 'CSR', password: '', status: 'ACTIVE' });
                  setUserModalOpen(true);
                }}
                className="px-4 py-2 bg-zinc-100 text-zinc-950 text-xs font-bold uppercase tracking-wider rounded-lg hover:bg-zinc-200 transition cursor-pointer"
              >
                + Register User
              </button>
            </div>

            <div className="flex-1 min-h-0 overflow-auto custom-scrollbar">
              <table className="w-full text-left text-xs font-mono">
                <thead className="sticky top-0 bg-zinc-900/95 backdrop-blur z-10 border-b border-zinc-800">
                  <tr className="text-[10px] uppercase tracking-[0.2em] text-zinc-400">
                    <th className="p-3.5 sm:p-4">UID</th>
                    <th className="p-3.5 sm:p-4">Full Name</th>
                    <th className="p-3.5 sm:p-4">Identifier / Email</th>
                    <th className="p-3.5 sm:p-4">Assigned Role</th>
                    <th className="p-3.5 sm:p-4">Status</th>
                    <th className="p-3.5 sm:p-4 text-right">Operations</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60">
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-zinc-600 uppercase tracking-widest text-xs">
                        No user accounts matched
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((u) => (
                      <tr key={u.user_id} className="hover:bg-zinc-800/20 transition-colors">
                        <td className="p-3.5 sm:p-4 text-zinc-500 font-bold">#{u.user_id}</td>
                        <td className="p-3.5 sm:p-4 font-bold text-zinc-100 uppercase">{u.full_name}</td>
                        <td className="p-3.5 sm:p-4 text-zinc-400">{u.username_or_email}</td>
                        <td className="p-3.5 sm:p-4">
                          <span className="px-2.5 py-1 rounded bg-zinc-800 border border-zinc-700/60 text-[11px] uppercase tracking-wider font-semibold text-zinc-300">
                            {u.role}
                          </span>
                        </td>
                        <td className="p-3.5 sm:p-4">
                          <span className={`inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase ${u.status === 'ACTIVE' ? 'text-emerald-400' : 'text-zinc-500'}`}>
                            <span className={`h-1.5 w-1.5 rounded-full ${u.status === 'ACTIVE' ? 'bg-emerald-400' : 'bg-zinc-600'}`} />
                            {u.status || 'ACTIVE'}
                          </span>
                        </td>
                        <td className="p-3.5 sm:p-4 text-right space-x-2 whitespace-nowrap">
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
                            className="px-3 py-1 rounded border border-zinc-700 bg-zinc-850 hover:bg-zinc-700 hover:text-zinc-100 transition text-[11px] uppercase tracking-wider font-semibold text-zinc-300 cursor-pointer"
                          >
                            Configure
                          </button>
                          <button
                            onClick={() => handleDeleteUser(u)}
                            className="px-3 py-1 rounded border border-red-500/30 text-red-400 hover:bg-red-500 hover:text-white transition text-[11px] uppercase tracking-wider font-semibold cursor-pointer"
                          >
                            Revoke
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 2: TEAMS */}
        {activeTab === 'teams' && (
          <div className="flex-1 min-h-0 flex flex-col space-y-3">
            <div className="flex justify-between items-center shrink-0">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-[0.25em] text-zinc-500">Dispatch Units</span>
                <h2 className="text-sm sm:text-base font-bold uppercase tracking-tight text-zinc-100">
                  Field Team Matrix ({teams.length})
                </h2>
              </div>
              <button
                onClick={() => {
                  setEditingTeam(null);
                  setTeamName('');
                  setSelectedTechs([]);
                  setTeamModalOpen(true);
                }}
                className="px-4 py-2 bg-zinc-100 text-zinc-950 text-xs font-bold uppercase tracking-wider rounded-lg hover:bg-zinc-200 transition cursor-pointer"
              >
                + Form New Team
              </button>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 pr-1">
              {teams.map((t) => (
                <div
                  key={t.team_id}
                  className="p-4 sm:p-5 rounded-xl border border-zinc-800/80 bg-zinc-900/40 hover:border-zinc-700 transition flex flex-col justify-between space-y-4 h-fit"
                >
                  <div className="space-y-3">
                    <div className="flex justify-between items-start">
                      <h3 className="font-bold text-zinc-100 uppercase text-sm sm:text-base tracking-tight">{t.team_name}</h3>
                      <span className="px-2.5 py-0.5 rounded-full border border-emerald-500/30 bg-emerald-950/40 text-emerald-400 text-[11px] font-mono font-bold uppercase">
                        {t.active_workload || 0} In Field
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-zinc-500 block mb-2">
                        Assigned Operatives ({t.members?.length || 0})
                      </span>
                      <div className="space-y-1.5 max-h-36 overflow-y-auto custom-scrollbar">
                        {t.members?.length > 0 ? (
                          t.members.map((m, idx) => (
                            <div key={idx} className="p-2 rounded border border-zinc-800/70 bg-zinc-900/80 flex justify-between items-center text-xs font-mono">
                              <span className="text-zinc-200 uppercase font-semibold">{m.full_name}</span>
                              <span className="text-emerald-400 font-bold">{m.tech_id}</span>
                            </div>
                          ))
                        ) : (
                          <div className="text-xs font-mono text-zinc-600 py-1.5 uppercase">No operatives assigned</div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-zinc-800/80 flex justify-end gap-2">
                    <button
                      onClick={() => {
                        setEditingTeam(t);
                        setTeamName(t.team_name);
                        setSelectedTechs(t.members ? t.members.map((m) => m.tech_id) : []);
                        setTeamModalOpen(true);
                      }}
                      className="px-3 py-1.5 rounded border border-zinc-700 text-zinc-300 text-xs uppercase tracking-wider font-semibold hover:bg-zinc-800 transition cursor-pointer"
                    >
                      Edit Roster
                    </button>
                    <button
                      onClick={() => handleDeleteTeam(t)}
                      className="px-3 py-1.5 rounded border border-red-500/30 text-red-400 text-xs uppercase tracking-wider font-semibold hover:bg-red-500 hover:text-white transition cursor-pointer"
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
          <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-3 sm:gap-4 overflow-hidden">
            {/* Enrollment Form */}
            <div className="lg:col-span-4 rounded-xl border border-zinc-800/80 bg-zinc-900/40 p-4 sm:p-5 flex flex-col justify-between overflow-y-auto custom-scrollbar">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-tight text-zinc-100 mb-3">Enroll Operative</h3>
                <form onSubmit={handleCreateTech} className="space-y-3 font-mono">
                  <div>
                    <label className="block text-[10px] uppercase tracking-widest text-zinc-400 mb-1">Personnel Type</label>
                    <select
                      value={personnelType}
                      onChange={(e) => setPersonnelType(e.target.value)}
                      className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-xs text-zinc-200 uppercase focus:outline-none focus:border-zinc-600"
                    >
                      <option value="TECHNICIAN">TECHNICIAN (Subscriber Line)</option>
                      <option value="OSP">OSP (Outside Plant)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase tracking-widest text-zinc-400 mb-1">Operative ID</label>
                    <input
                      type="text"
                      required
                      value={techId}
                      onChange={(e) => setTechId(e.target.value)}
                      placeholder="T-0002"
                      className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-xs text-zinc-200 uppercase focus:outline-none focus:border-zinc-600"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase tracking-widest text-zinc-400 mb-1">Full Legal Name</label>
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Juan Dela Cruz"
                      className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-xs text-zinc-200 uppercase focus:outline-none focus:border-zinc-600"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase tracking-widest text-zinc-400 mb-1">Contact Link</label>
                    <input
                      type="text"
                      value={contactNumber}
                      onChange={(e) => setContactNumber(e.target.value)}
                      placeholder="09171234567"
                      className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-xs text-zinc-200 focus:outline-none focus:border-zinc-600"
                    />
                  </div>

                  <p className="text-[10px] text-zinc-500 tracking-wider uppercase">Default access PIN: 00000000.</p>

                  <button
                    type="submit"
                    disabled={enrollingTech}
                    className="w-full py-2.5 bg-zinc-100 text-zinc-950 font-bold uppercase text-xs tracking-wider rounded-lg hover:bg-zinc-200 transition cursor-pointer mt-1"
                  >
                    {enrollingTech ? 'Registering...' : 'Enroll Operative'}
                  </button>
                </form>
              </div>
            </div>

            {/* Technicians Table */}
            <div className="lg:col-span-8 rounded-xl border border-zinc-800/80 bg-zinc-900/30 flex flex-col h-full overflow-hidden">
              <div className="flex-1 min-h-0 overflow-auto custom-scrollbar">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="sticky top-0 bg-zinc-900/95 backdrop-blur z-10 border-b border-zinc-800">
                    <tr className="text-[10px] uppercase tracking-[0.2em] text-zinc-400">
                      <th className="p-3.5 sm:p-4">ID</th>
                      <th className="p-3.5 sm:p-4">Full Name</th>
                      <th className="p-3.5 sm:p-4">Role</th>
                      <th className="p-3.5 sm:p-4">Contact</th>
                      <th className="p-3.5 sm:p-4">Credential State</th>
                      <th className="p-3.5 sm:p-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/60">
                    {filteredTechs.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-zinc-600 uppercase tracking-widest text-xs">
                          No technicians found
                        </td>
                      </tr>
                    ) : (
                      filteredTechs.map((t) => (
                        <tr key={t.tech_id} className="hover:bg-zinc-800/20 transition-colors">
                          <td className="p-3.5 sm:p-4 font-bold text-emerald-400">{t.tech_id}</td>
                          <td className="p-3.5 sm:p-4 text-zinc-100 uppercase font-semibold">{t.full_name}</td>
                          <td className="p-3.5 sm:p-4">
                            <span className="px-2 py-0.5 rounded bg-zinc-800 border border-zinc-700/60 text-[10px] font-bold text-zinc-300">
                              {t.personnel_type}
                            </span>
                          </td>
                          <td className="p-3.5 sm:p-4 text-zinc-400">{t.contact_number || '—'}</td>
                          <td className="p-3.5 sm:p-4">
                            <span className={`inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase ${t.must_change_password ? 'text-amber-400' : 'text-emerald-400'}`}>
                              <span className={`h-1.5 w-1.5 rounded-full ${t.must_change_password ? 'bg-amber-400' : 'bg-emerald-400'}`} />
                              {t.must_change_password ? 'Default PIN' : 'Active Key'}
                            </span>
                          </td>
                          <td className="p-3.5 sm:p-4 text-right space-x-2 whitespace-nowrap">
                            <button
                              onClick={() => handleResetPin(t.tech_id)}
                              className="px-3 py-1 rounded border border-zinc-700 text-zinc-300 text-[11px] uppercase tracking-wider font-semibold hover:bg-zinc-800 hover:text-white transition cursor-pointer"
                            >
                              Reset PIN
                            </button>
                            <button
                              onClick={() => handleDeleteTech(t)}
                              className="px-3 py-1 rounded border border-red-500/30 text-red-400 hover:bg-red-500 hover:text-zinc-950 transition text-[11px] uppercase tracking-wider font-semibold cursor-pointer"
                            >
                              Remove
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* USER MODAL */}
      {userModalOpen && (
        <div
          onClick={(e) => e.target === e.currentTarget && setUserModalOpen(false)}
          className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-150"
        >
          <div className="max-w-lg w-full rounded-xl border border-zinc-800 bg-zinc-900 p-5 sm:p-6 space-y-4 shadow-2xl">
            <h3 className="text-sm sm:text-base font-bold uppercase tracking-tight text-zinc-100">
              {editingUser ? `Configure // ${editingUser.full_name}` : 'Provision Staff Account'}
            </h3>
            <form onSubmit={handleSaveUser} className="space-y-3 font-mono">
              <input
                type="text"
                required
                placeholder="Full Name"
                value={userForm.full_name}
                onChange={(e) => setUserForm({ ...userForm, full_name: e.target.value })}
                className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-xs text-zinc-100 uppercase focus:outline-none focus:border-zinc-600"
              />
              <input
                type="text"
                required
                placeholder="Identifier / Email"
                value={userForm.username_or_email}
                onChange={(e) => setUserForm({ ...userForm, username_or_email: e.target.value })}
                className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-xs text-zinc-100 focus:outline-none focus:border-zinc-600"
              />
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={userForm.role}
                  onChange={(e) => setUserForm({ ...userForm, role: e.target.value })}
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-xs text-zinc-100 uppercase focus:outline-none focus:border-zinc-600"
                >
                  <option value="CSR">CSR</option>
                  <option value="DISPATCHER">DISPATCHER</option>
                  <option value="MASTER_ADMIN">MASTER_ADMIN</option>
                </select>
                {editingUser && (
                  <select
                    value={userForm.status}
                    onChange={(e) => setUserForm({ ...userForm, status: e.target.value })}
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-xs text-zinc-100 uppercase focus:outline-none focus:border-zinc-600"
                  >
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="INACTIVE">INACTIVE</option>
                  </select>
                )}
              </div>
              <input
                type="password"
                required={!editingUser}
                minLength={8}
                placeholder={editingUser ? 'New Password (blank to preserve)' : 'Password (min 8 chars)'}
                value={userForm.password}
                onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-xs text-zinc-100 focus:outline-none focus:border-zinc-600"
              />
              <div className="flex justify-end gap-2 pt-3 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setUserModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-zinc-800 text-xs font-semibold uppercase tracking-wider text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingUser}
                  className="px-4 py-2 rounded-lg bg-zinc-100 text-zinc-950 text-xs font-bold uppercase tracking-wider hover:bg-zinc-200 transition"
                >
                  {savingUser ? 'Committing...' : 'Commit Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TEAM MODAL */}
      {teamModalOpen && (
        <div
          onClick={(e) => e.target === e.currentTarget && setTeamModalOpen(false)}
          className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-150"
        >
          <div className="max-w-lg w-full rounded-xl border border-zinc-800 bg-zinc-900 p-5 sm:p-6 space-y-4 shadow-2xl">
            <h3 className="text-sm sm:text-base font-bold uppercase tracking-tight text-zinc-100">
              {editingTeam ? `Roster // ${editingTeam.team_name}` : 'Form Field Unit'}
            </h3>
            <form onSubmit={handleSaveTeam} className="space-y-3 font-mono">
              <input
                type="text"
                required
                placeholder="Team Designation (e.g. Team Delta - Maysan)"
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-xs text-zinc-100 uppercase focus:outline-none focus:border-zinc-600"
              />
              <div>
                <label className="block text-[10px] uppercase tracking-widest text-zinc-400 mb-1.5">Assign Operatives</label>
                <div className="max-h-52 overflow-y-auto custom-scrollbar border border-zinc-800 rounded-lg p-2 space-y-1 bg-zinc-950">
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
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setTeamModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-zinc-800 text-xs font-semibold uppercase tracking-wider text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingTeam}
                  className="px-4 py-2 rounded-lg bg-zinc-100 text-zinc-950 text-xs font-bold uppercase tracking-wider hover:bg-zinc-200 transition"
                >
                  {savingTeam ? 'Deploying...' : 'Deploy Team'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}