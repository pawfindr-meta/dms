'use client';

import { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';

export default function CSRPage() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');

  const [rawReport, setRawReport] = useState('');
  const [taskType, setTaskType] = useState('REPAIR');
  const [accountNumber, setAccountNumber] = useState('');
  const [clientId, setClientId] = useState('');
  const [clientName, setClientName] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [address, setAddress] = useState('');
  const [landmark, setLandmark] = useState('');
  const [issue, setIssue] = useState('');
  const [isUnverified, setIsUnverified] = useState(false);

  const loadTasks = async () => {
    try {
      const res = await fetch('/api/tasks');
      if (res.ok) setTasks(await res.json());
    } catch (err) {
      console.error('Failed to load CSR tasks:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTasks();
  }, []);

  const handleAutoFill = () => {
    if (!rawReport.trim()) return;
    const text = rawReport;

    const accMatch = text.match(/(?:account\s*(?:no|number|#)?[:\s-]*)([0-9-]+)/i);
    const idMatch = text.match(/(?:client\s*id[:\s-]*)([0-9]+)/i);
    const nameMatch = text.match(/(?:client\s*name|name)[:\s-]*([^\n\r]+)/i);
    const contactMatch = text.match(/(?:contact\s*(?:no|number|#)?|phone|mobile)[:\s-]*([0-9+]+)/i);
    const addressMatch = text.match(/(?:address|location)[:\s-]*([^\n\r]+)/i);
    const landmarkMatch = text.match(/(?:landmark|port|nap)[:\s-]*([^\n\r]+)/i);
    const issueMatch = text.match(/(?:issue|concern|problem|remarks|notes)[:\s-]*([^\n\r]+)/i);

    if (accMatch) setAccountNumber(accMatch[1].trim());
    if (idMatch) setClientId(idMatch[1].trim());
    if (nameMatch) setClientName(nameMatch[1].trim());
    if (contactMatch) setContactNumber(contactMatch[1].trim());
    if (addressMatch) setAddress(addressMatch[1].trim());
    if (landmarkMatch) setLandmark(landmarkMatch[1].trim());
    if (issueMatch) setIssue(issueMatch[1].trim());

    if (/install/i.test(text)) setTaskType('INSTALLATION');
    else if (/transfer/i.test(text)) setTaskType('TRANSFER');
    else if (/pullout|retrieval/i.test(text)) setTaskType('PULLOUT');
    else if (/survey/i.test(text)) setTaskType('SURVEY');
    else if (/relocation/i.test(text)) setTaskType('RELOCATION');
    else setTaskType('REPAIR');

    setMessage('PARSER // Ticket metadata extracted into form');
  };

  const handleCreateTask = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage('');

    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          task_type: taskType,
          account_number: accountNumber.trim(),
          client_id: clientId.trim(),
          client_name: clientName.trim(),
          contact_number: contactNumber.trim(),
          address: address.trim(),
          landmark: landmark.trim(),
          issue: issue.trim(),
          is_unverified: isUnverified,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || `Submission failed (${res.status})`);

      setMessage(`DISPATCH LOGGED // Directive ID: ${data.task_id}`);
      setRawReport('');
      setAccountNumber('');
      setClientId('');
      setClientName('');
      setContactNumber('');
      setAddress('');
      setLandmark('');
      setIssue('');
      setIsUnverified(false);

      loadTasks();
    } catch (err) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="h-dvh w-screen bg-black text-white flex flex-col overflow-hidden font-sans">
      <Navbar user={{ name: 'CSR Agent', role: 'CSR' }} />

      <main className="flex-1 min-h-0 w-full p-4 sm:p-6 md:p-8 flex flex-col gap-4 sm:gap-6">
        <div className="flex justify-between items-center border-b border-white/10 pb-3 sm:pb-4 shrink-0">
          <div>
            <span className="text-[10px] sm:text-[11px] font-mono uppercase tracking-[0.3em] text-white/40">Inbound Operations</span>
            <h1 className="text-base sm:text-xl font-black uppercase tracking-tight">Direct Job Creation Console</h1>
          </div>
          <span className="text-[10px] sm:text-xs font-mono uppercase tracking-widest text-white/40">
            Node: CSR-Terminal // Station 01
          </span>
        </div>

        {message && (
          <div className="p-3 sm:p-3.5 border border-white/20 bg-white/[0.02] text-xs sm:text-sm font-mono uppercase tracking-widest text-emerald-400 shrink-0">
            [SYS_LOG] {message}
          </div>
        )}

        <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 overflow-y-auto lg:overflow-hidden">
          {/* LEFT: FORM (7 Cols) */}
          <div className="lg:col-span-7 border border-white/10 bg-white/[0.01] p-4 sm:p-6 flex flex-col h-fit lg:h-full lg:overflow-y-auto space-y-4 sm:space-y-5">
            <div className="flex justify-between items-center border-b border-white/10 pb-3 sm:pb-4 shrink-0">
              <span className="text-xs sm:text-sm font-black uppercase tracking-widest text-white">Create Field Directive</span>
              <select
                value={taskType}
                onChange={(e) => setTaskType(e.target.value)}
                className="bg-black border border-white/20 px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-mono font-bold uppercase text-white focus:outline-none focus:border-white"
              >
                <option value="REPAIR">REPAIR</option>
                <option value="INSTALLATION">INSTALLATION</option>
                <option value="TRANSFER">TRANSFER</option>
                <option value="PULLOUT">PULLOUT</option>
                <option value="SURVEY">SURVEY</option>
                <option value="RELOCATION">RELOCATION</option>
              </select>
            </div>

            {/* Quick Paste Buffer */}
            <div className="border border-white/10 bg-black p-3.5 sm:p-4 space-y-2.5 sm:space-y-3 font-mono shrink-0">
              <div className="flex justify-between items-center">
                <label className="text-[10px] sm:text-[11px] uppercase tracking-widest text-white/40 font-bold">
                  Quick Paste-to-Task Parser (Viber / Messenger Log)
                </label>
                <button
                  type="button"
                  onClick={handleAutoFill}
                  className="px-2.5 sm:px-3 py-1 border border-white/20 text-[9px] sm:text-[10px] uppercase tracking-widest font-bold hover:bg-white hover:text-black transition cursor-pointer"
                >
                  Auto-Extract
                </button>
              </div>
              <textarea
                rows={3}
                value={rawReport}
                onChange={(e) => setRawReport(e.target.value)}
                placeholder="Paste raw messenger/viber dispatch text here to auto-populate..."
                className="w-full bg-white/[0.02] border border-white/10 p-2.5 sm:p-3 text-xs sm:text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-white"
              />
            </div>

            {/* Directive Form */}
            <form onSubmit={handleCreateTask} className="space-y-3.5 sm:space-y-4 font-mono">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="block text-[10px] sm:text-[11px] uppercase tracking-widest text-white/40 mb-1.5 font-bold">Account Number</label>
                  <input
                    type="text"
                    value={accountNumber}
                    onChange={(e) => setAccountNumber(e.target.value)}
                    placeholder="13-09162023-4397"
                    className="w-full px-3.5 sm:px-4 py-2 sm:py-2.5 bg-black border border-white/10 text-xs sm:text-sm text-white uppercase focus:outline-none focus:border-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] sm:text-[11px] uppercase tracking-widest text-white/40 mb-1.5 font-bold">Client ID</label>
                  <input
                    type="text"
                    value={clientId}
                    onChange={(e) => setClientId(e.target.value)}
                    placeholder="10011803"
                    className="w-full px-3.5 sm:px-4 py-2 sm:py-2.5 bg-black border border-white/10 text-xs sm:text-sm text-white focus:outline-none focus:border-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="block text-[10px] sm:text-[11px] uppercase tracking-widest text-white/40 mb-1.5 font-bold">Client Full Name *</label>
                  <input
                    type="text"
                    required
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    placeholder="Flordeliza Gulles Pinagawa"
                    className="w-full px-3.5 sm:px-4 py-2 sm:py-2.5 bg-black border border-white/10 text-xs sm:text-sm text-white uppercase focus:outline-none focus:border-white font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[10px] sm:text-[11px] uppercase tracking-widest text-white/40 mb-1.5 font-bold">Contact Link</label>
                  <input
                    type="text"
                    value={contactNumber}
                    onChange={(e) => setContactNumber(e.target.value)}
                    placeholder="09350849701"
                    className="w-full px-3.5 sm:px-4 py-2 sm:py-2.5 bg-black border border-white/10 text-xs sm:text-sm text-white focus:outline-none focus:border-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] sm:text-[11px] uppercase tracking-widest text-white/40 mb-1.5 font-bold">Site Address / Location *</label>
                <input
                  type="text"
                  required
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Lot 10 Block 88 Bonbon Ville, Ugong"
                  className="w-full px-3.5 sm:px-4 py-2 sm:py-2.5 bg-black border border-white/10 text-xs sm:text-sm text-white uppercase focus:outline-none focus:border-white"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="block text-[10px] sm:text-[11px] uppercase tracking-widest text-white/40 mb-1.5 font-bold">Landmark / Port Details</label>
                  <input
                    type="text"
                    value={landmark}
                    onChange={(e) => setLandmark(e.target.value)}
                    placeholder="U-L37 N8 P10"
                    className="w-full px-3.5 sm:px-4 py-2 sm:py-2.5 bg-black border border-white/10 text-xs sm:text-sm text-white uppercase focus:outline-none focus:border-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] sm:text-[11px] uppercase tracking-widest text-white/40 mb-1.5 font-bold">Reported Issue / Notes</label>
                  <input
                    type="text"
                    value={issue}
                    onChange={(e) => setIssue(e.target.value)}
                    placeholder="REDLOS / Fiber Cut"
                    className="w-full px-3.5 sm:px-4 py-2 sm:py-2.5 bg-black border border-white/10 text-xs sm:text-sm text-white uppercase focus:outline-none focus:border-white"
                  />
                </div>
              </div>

              <label className="flex items-center gap-3 cursor-pointer text-xs sm:text-sm pt-1">
                <input
                  type="checkbox"
                  checked={isUnverified}
                  onChange={(e) => setIsUnverified(e.target.checked)}
                  className="rounded border-white/30 text-white bg-black focus:ring-0 w-4 h-4"
                />
                <span className="text-[11px] sm:text-xs uppercase tracking-widest text-white/60">
                  Flag as Unverified Account Details
                </span>
              </label>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3.5 sm:py-4 bg-white text-black font-black uppercase text-xs sm:text-sm tracking-[0.25em] sm:tracking-[0.3em] hover:bg-white/80 transition cursor-pointer disabled:opacity-50 mt-2"
              >
                {submitting ? 'Transmitting Directive...' : 'Transmit Field Directive →'}
              </button>
            </form>
          </div>

          {/* RIGHT: RECENT LOGS (5 Cols) */}
          <div className="lg:col-span-5 border border-white/10 bg-white/[0.01] p-4 sm:p-6 flex flex-col h-[400px] lg:h-full overflow-hidden">
            <div className="flex justify-between items-center border-b border-white/10 pb-3 sm:pb-4 shrink-0">
              <div>
                <span className="text-[10px] sm:text-[11px] font-mono uppercase tracking-[0.3em] text-white/40">Audit Trail</span>
                <h3 className="text-sm sm:text-base font-black uppercase tracking-tight">Recent Submissions ({tasks.length})</h3>
              </div>
              <button
                onClick={loadTasks}
                className="px-3 py-1.5 border border-white/20 text-xs font-mono uppercase tracking-widest hover:bg-white hover:text-black transition cursor-pointer"
              >
                Sync
              </button>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto space-y-2.5 sm:space-y-3 pt-3 sm:pt-4 pr-1">
              {loading ? (
                <div className="py-16 text-center text-white/40 font-mono text-xs uppercase tracking-widest">
                  Loading trail...
                </div>
              ) : tasks.length === 0 ? (
                <div className="py-16 text-center text-white/30 font-mono text-xs uppercase tracking-widest">
                  No directives logged today.
                </div>
              ) : (
                tasks.map((t) => (
                  <div key={t.task_id} className="p-3.5 sm:p-4 border border-white/10 bg-black hover:border-white/30 transition space-y-2 font-mono">
                    <div className="flex justify-between items-start">
                      <span className="font-bold text-emerald-400 text-xs sm:text-sm">{t.task_id}</span>
                      <span className={`px-2 py-0.5 border text-[9px] sm:text-[10px] font-bold uppercase ${
                        t.status === 'NEW' ? 'border-white/20 text-white/60' :
                        t.status === 'ASSIGNED' ? 'border-amber-400/50 text-amber-400' :
                        t.status === 'IN_PROGRESS' ? 'border-blue-400/50 text-blue-400' :
                        'border-emerald-400/50 text-emerald-400'
                      }`}>
                        {t.status}
                      </span>
                    </div>
                    <div>
                      <div className="text-xs sm:text-sm font-bold text-white uppercase">{t.client_name}</div>
                      <div className="text-[11px] sm:text-xs text-white/50 truncate">{t.address}</div>
                    </div>
                    <div className="text-[10px] text-white/40 pt-2 border-t border-white/5 flex justify-between">
                      <span className="uppercase font-bold">{t.task_type}</span>
                      <span>{new Date(t.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}