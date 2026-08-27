'use client';

import { useState, useEffect, useRef } from 'react';
import Navbar from '@/components/Navbar';

export default function CSRPage() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [syncingSheet, setSyncingSheet] = useState(false);
  const [message, setMessage] = useState('');
  const [lastSyncTime, setLastSyncTime] = useState(null);

  // Raw Parser Buffer
  const [rawReport, setRawReport] = useState('');

  // Form State
  const [taskType, setTaskType] = useState('REPAIR');
  const [accountNumber, setAccountNumber] = useState('');
  const [clientId, setClientId] = useState('');
  const [clientName, setClientName] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [address, setAddress] = useState('');
  const [landmark, setLandmark] = useState('');
  const [issue, setIssue] = useState('');
  const [isUnverified, setIsUnverified] = useState(false);

  // Autocomplete Dropdown State
  const [searchResults, setSearchResults] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const searchContainerRef = useRef(null);

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

  const handleSyncGoogleSheets = async (isManual = true) => {
    setSyncingSheet(true);
    if (isManual) setMessage('SHEETS // Contacting Google Sheets API bridge...');

    try {
      const res = await fetch('/api/sheets/sync', { method: 'POST' });
      if (!res.ok) {
        let errMsg = `Sheets sync failed with status ${res.status}`;
        try {
          const errData = await res.json();
          if (errData?.error) errMsg = errData.error;
        } catch (_) {}
        throw new Error(errMsg);
      }

      const data = await res.json();
      setLastSyncTime(new Date());
      setMessage(`SHEETS SYNCHRONIZED // ${data?.importedCount ?? 0} records updated`);
      loadTasks();
    } catch (err) {
      if (isManual) alert(err.message);
      else console.error('Background sheets sync error:', err.message);
    } finally {
      setSyncingSheet(false);
    }
  };

  useEffect(() => {
    loadTasks();

    // Auto-sync Google Sheets every 5 minutes (300,000ms)
    const interval = setInterval(() => {
      handleSyncGoogleSheets(false);
    }, 300000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Search clients across Sheets / Database
  const searchClients = async (query) => {
    if (!query || query.trim().length < 2) {
      setSearchResults([]);
      setShowDropdown(false);
      return;
    }

    try {
      const res = await fetch(`/api/clients/search?q=${encodeURIComponent(query.trim())}`);
      if (res.ok) {
        const data = await res.json();
        setSearchResults(data || []);
        setShowDropdown(data && data.length > 0);
      }
    } catch (err) {
      console.error('Client search error:', err);
    }
  };

  const handleSelectClient = (client) => {
    if (client.account_number) setAccountNumber(client.account_number);
    if (client.client_id) setClientId(String(client.client_id));
    if (client.client_name || client.name) setClientName(client.client_name || client.name);
    if (client.contact_number || client.contact) setContactNumber(client.contact_number || client.contact);
    if (client.address) setAddress(client.address);
    if (client.landmark || client.port || client.nap) setLandmark(client.landmark || client.port || client.nap || '');
    if (client.issue) setIssue(client.issue);

    setShowDropdown(false);
    setMessage(`PROFILE MATCHED // ${client.client_name || client.name}`);
  };

  const handleAutoFill = async () => {
    if (!rawReport.trim()) return;

    setAccountNumber('');
    setClientId('');
    setClientName('');
    setContactNumber('');
    setAddress('');
    setLandmark('');
    setIssue('');

    const text = rawReport.trim();
    const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

    let parsedAcc = '';
    let parsedId = '';
    let parsedName = '';
    let parsedContact = '';
    let parsedAddress = '';
    let parsedLandmark = '';
    let parsedIssue = '';

    const accMatch = text.match(/(?:account\s*(?:no|number|#)?[:\s-]*)([0-9-]+)/i);
    const idMatch = text.match(/(?:client\s*id|id)[:\s-]*([0-9]+)/i);
    const nameMatch = text.match(/(?:client\s*name|name)[:\s-]*([a-zA-Z\s.,'-]+)/i);
    const contactMatch = text.match(/(?:contact\s*(?:no|number|#)?|phone|mobile)[:\s-]*([0-9+]+)/i);
    const addressMatch = text.match(/(?:address|location)[:\s-]*([^\n\r]+)/i);
    const landmarkMatch = text.match(/(?:landmark|port|nap)[:\s-]*([^\n\r]+)/i);
    const issueMatch = text.match(/(?:issue|concern|problem|remarks|notes)[:\s-]*([^\n\r]+)/i);

    if (accMatch) parsedAcc = accMatch[1].trim();
    if (idMatch) parsedId = idMatch[1].trim();
    if (nameMatch) parsedName = nameMatch[1].trim();
    if (contactMatch) parsedContact = contactMatch[1].trim();
    if (addressMatch) parsedAddress = addressMatch[1].trim();
    if (landmarkMatch) parsedLandmark = landmarkMatch[1].trim();
    if (issueMatch) parsedIssue = issueMatch[1].trim();

    lines.forEach((line) => {
      const cleanDigits = line.replace(/[\s-]/g, '');

      if (/^\d{2}-\d{8}-\d{4}$/.test(line) && !parsedAcc) {
        parsedAcc = line;
      } else if (/^(?:\+?63|0)?9\d{9}$/.test(cleanDigits) && !parsedContact) {
        parsedContact = cleanDigits.startsWith('63') ? '0' + cleanDigits.slice(2) : cleanDigits.startsWith('9') ? '0' + cleanDigits : cleanDigits;
      } else if (/^\d{6,8}$/.test(cleanDigits) && !parsedId) {
        parsedId = cleanDigits;
      } else if (/(?:[LP]\d+|N\d+[A-Z]?|NAP|PORT|POST|POLE)/i.test(line) && line.length < 35 && !parsedLandmark) {
        parsedLandmark = line;
      } else if (/(?:blk|lot|comp|sitio|street|st\.|brgy|barangay|ave|road|subd|phase|vill)/i.test(line) && !parsedAddress) {
        parsedAddress = line;
      } else if (/(?:redlos|los|blinking|no\s*connection|slow|cut|defective)/i.test(line) && !parsedIssue) {
        parsedIssue = line;
      } else if (!parsedName && /^[a-zA-Z\s.,'-]+$/.test(line) && line.length > 3 && line.length < 50) {
        parsedName = line;
      }
    });

    const searchKey = parsedId || parsedAcc || (lines.length === 1 ? lines[0] : parsedName);

    if (searchKey) {
      setMessage(`LOOKUP // Querying database for ${searchKey}...`);
      try {
        const res = await fetch(`/api/clients/search?q=${encodeURIComponent(searchKey.trim())}`);
        if (res.ok) {
          const results = await res.json();
          if (results && results.length > 0) {
            const client = results[0];
            if (client.account_number) parsedAcc = client.account_number;
            if (client.client_id) parsedId = String(client.client_id);
            if (client.client_name || client.name) parsedName = client.client_name || client.name;
            if ((client.contact_number || client.contact) && !parsedContact) parsedContact = client.contact_number || client.contact;
            if (client.address && !parsedAddress) parsedAddress = client.address;
            if ((client.landmark || client.port || client.nap) && !parsedLandmark) {
              parsedLandmark = client.landmark || client.port || client.nap;
            }
            if (client.issue && !parsedIssue) parsedIssue = client.issue;

            setMessage(`PROFILE MATCHED // ${client.client_name || client.name}`);
          }
        }
      } catch (err) {
        console.error('Auto-lookup error:', err);
      }
    }

    setAccountNumber(parsedAcc);
    setClientId(parsedId);
    setClientName(parsedName);
    setContactNumber(parsedContact);
    setAddress(parsedAddress);
    setLandmark(parsedLandmark);
    setIssue(parsedIssue);

    if (/install/i.test(text)) setTaskType('INSTALLATION');
    else if (/transfer/i.test(text)) setTaskType('TRANSFER');
    else if (/pullout|retrieval/i.test(text)) setTaskType('PULLOUT');
    else if (/survey/i.test(text)) setTaskType('SURVEY');
    else if (/relocation/i.test(text)) setTaskType('RELOCATION');
    else setTaskType('REPAIR');
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
    <div className="h-[100dvh] w-screen bg-zinc-950 text-zinc-100 flex flex-col overflow-hidden font-sans select-none">
      <Navbar user={{ name: 'CSR Agent', role: 'CSR' }} />

      <main className="flex-1 min-h-0 w-full p-3 sm:p-5 md:p-6 flex flex-col gap-3 sm:gap-4 overflow-hidden">
        
        {/* Header Ribbon & Google Sheets Integration Telemetry */}
        <div className="flex flex-wrap justify-between items-center border-b border-zinc-800 pb-3 gap-3 shrink-0">
          <div>
            <span className="text-[10px] font-mono uppercase tracking-[0.25em] text-zinc-500">Inbound Operations</span>
            <h1 className="text-sm sm:text-base font-bold uppercase tracking-tight text-zinc-100">Direct Job Creation Console</h1>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => handleSyncGoogleSheets(true)}
              disabled={syncingSheet}
              className="px-3.5 py-1.5 bg-emerald-500/10 border border-emerald-500/30 hover:bg-emerald-500 hover:text-zinc-950 text-emerald-400 text-xs font-mono font-bold uppercase tracking-wider rounded-lg transition cursor-pointer flex items-center gap-2 disabled:opacity-50"
            >
              <span className={`w-2 h-2 rounded-full ${syncingSheet ? 'bg-amber-400 animate-ping' : 'bg-emerald-400'}`} />
              {syncingSheet ? 'Syncing Sheets...' : 'Sync Google Sheets'}
            </button>

            <span className="text-xs font-mono uppercase tracking-widest text-zinc-500 hidden sm:block">
              {lastSyncTime ? `Last Sync: ${lastSyncTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'Auto-Sync Active (5m)'}
            </span>
          </div>
        </div>

        {message && (
          <div className="px-4 py-2.5 rounded-lg border border-emerald-500/30 bg-emerald-950/30 text-xs font-mono uppercase tracking-widest text-emerald-400 shrink-0 flex items-center justify-between">
            <span className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
              [SYS_LOG] {message}
            </span>
            <button onClick={() => setMessage('')} className="text-zinc-400 hover:text-zinc-200 text-xs">✕</button>
          </div>
        )}

        <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-3 sm:gap-4 overflow-hidden">
          
          {/* LEFT: FORM (7 Cols) */}
          <div className="lg:col-span-7 rounded-xl border border-zinc-800/80 bg-zinc-900/40 p-4 sm:p-5 flex flex-col h-full overflow-y-auto custom-scrollbar space-y-3 sm:space-y-4">
            
            <div className="flex justify-between items-center border-b border-zinc-800 pb-3 shrink-0">
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-200">Create Field Directive</span>
              <select
                value={taskType}
                onChange={(e) => setTaskType(e.target.value)}
                className="bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs font-mono font-bold uppercase text-zinc-200 focus:outline-none focus:border-zinc-600"
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
            <div className="border border-zinc-800 rounded-lg bg-zinc-950 p-3 space-y-2 font-mono shrink-0">
              <div className="flex justify-between items-center">
                <label className="text-[10px] uppercase tracking-widest text-zinc-400 font-bold">
                  Quick Parser (Viber / Messenger Log)
                </label>
                <button
                  type="button"
                  onClick={handleAutoFill}
                  className="px-2.5 py-1 rounded border border-zinc-700 bg-zinc-900 text-[10px] uppercase tracking-widest font-bold text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100 transition cursor-pointer"
                >
                  Auto-Extract
                </button>
              </div>
              <textarea
                rows={3}
                value={rawReport}
                onChange={(e) => setRawReport(e.target.value)}
                placeholder="Paste Viber/Messenger dump (Name, Phone, Address, NAP/Port) or ID and click Auto-Extract..."
                className="w-full bg-zinc-900 border border-zinc-800 rounded p-2.5 text-xs text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600 font-mono resize-none"
              />
            </div>

            {/* Directive Form & Autocomplete Container */}
            <form onSubmit={handleCreateTask} className="space-y-3 font-mono relative" ref={searchContainerRef}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] uppercase tracking-widest text-zinc-400 mb-1 font-bold">Account Number</label>
                  <input
                    type="text"
                    value={accountNumber}
                    onChange={(e) => {
                      setAccountNumber(e.target.value);
                      searchClients(e.target.value);
                    }}
                    placeholder="Enter Account Number"
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-xs text-zinc-200 uppercase focus:outline-none focus:border-zinc-600"
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase tracking-widest text-zinc-400 mb-1 font-bold">Client ID</label>
                  <input
                    type="text"
                    value={clientId}
                    onChange={(e) => {
                      setClientId(e.target.value);
                      searchClients(e.target.value);
                    }}
                    placeholder="Enter Client ID"
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-xs text-zinc-200 focus:outline-none focus:border-zinc-600"
                  />
                </div>
              </div>

              {/* Client Name with Matched Profile Dropdown */}
              <div className="relative">
                <label className="block text-[10px] uppercase tracking-widest text-zinc-400 mb-1 font-bold">
                  Client Full Name * <span className="text-zinc-600 font-normal">(Type to search database/sheets)</span>
                </label>
                <input
                  type="text"
                  required
                  value={clientName}
                  onChange={(e) => {
                    setClientName(e.target.value);
                    searchClients(e.target.value);
                  }}
                  onFocus={() => {
                    if (searchResults.length > 0) setShowDropdown(true);
                  }}
                  placeholder="Enter Client Name to search..."
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-xs text-zinc-100 uppercase focus:outline-none focus:border-zinc-600 font-bold"
                />

                {/* Dropdown for Sheets / Database Matches */}
                {showDropdown && (
                  <div className="absolute top-full left-0 right-0 z-50 mt-1 rounded-lg bg-zinc-900 border border-zinc-700 shadow-2xl max-h-48 overflow-y-auto custom-scrollbar divide-y divide-zinc-800">
                    <div className="p-2 text-[10px] uppercase tracking-widest text-emerald-400 font-bold bg-zinc-950">
                      Matched Subscribers ({searchResults.length})
                    </div>
                    {searchResults.map((client, idx) => (
                      <div
                        key={idx}
                        onClick={() => handleSelectClient(client)}
                        className="p-2.5 hover:bg-zinc-800 cursor-pointer transition text-xs font-mono group"
                      >
                        <div className="flex justify-between items-center">
                          <span className="font-bold uppercase text-zinc-100 group-hover:text-white">
                            {client.client_name || client.name}
                          </span>
                          <span className="text-[10px] font-bold text-emerald-400">
                            {client.account_number || `ID: ${client.client_id}`}
                          </span>
                        </div>
                        <div className="text-[11px] text-zinc-400 truncate mt-0.5">
                          {client.address} {client.landmark || client.port ? `• ${client.landmark || client.port}` : ''}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-[10px] uppercase tracking-widest text-zinc-400 mb-1 font-bold">Contact Link</label>
                <input
                  type="text"
                  value={contactNumber}
                  onChange={(e) => setContactNumber(e.target.value)}
                  placeholder="09XXXXXXXXX"
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-xs text-zinc-200 focus:outline-none focus:border-zinc-600"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase tracking-widest text-zinc-400 mb-1 font-bold">Site Address / Location *</label>
                <input
                  type="text"
                  required
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Street / Block / Barangay / City"
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-xs text-zinc-200 uppercase focus:outline-none focus:border-zinc-600"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] uppercase tracking-widest text-zinc-400 mb-1 font-bold">Landmark / Port Details</label>
                  <input
                    type="text"
                    value={landmark}
                    onChange={(e) => setLandmark(e.target.value)}
                    placeholder="NAP / Port / Pole details"
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-xs text-zinc-200 uppercase focus:outline-none focus:border-zinc-600"
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase tracking-widest text-zinc-400 mb-1 font-bold">Reported Issue / Notes</label>
                  <input
                    type="text"
                    value={issue}
                    onChange={(e) => setIssue(e.target.value)}
                    placeholder="e.g. REDLOS / Fiber Cut"
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-xs text-zinc-200 uppercase focus:outline-none focus:border-zinc-600"
                  />
                </div>
              </div>

              <label className="flex items-center gap-2.5 cursor-pointer text-xs pt-1">
                <input
                  type="checkbox"
                  checked={isUnverified}
                  onChange={(e) => setIsUnverified(e.target.checked)}
                  className="rounded border-zinc-700 text-zinc-100 bg-zinc-900 focus:ring-0 w-3.5 h-3.5"
                />
                <span className="text-[10px] uppercase tracking-widest text-zinc-400">
                  Flag as Unverified Account Details
                </span>
              </label>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3 bg-zinc-100 text-zinc-950 font-bold uppercase text-xs tracking-[0.2em] rounded-lg hover:bg-zinc-200 transition cursor-pointer disabled:opacity-50 mt-1"
              >
                {submitting ? 'Transmitting Directive...' : 'Transmit Field Directive →'}
              </button>
            </form>
          </div>

          {/* RIGHT: RECENT LOGS (5 Cols) */}
          <div className="lg:col-span-5 rounded-xl border border-zinc-800/80 bg-zinc-900/30 p-4 sm:p-5 flex flex-col h-full overflow-hidden">
            <div className="flex justify-between items-center border-b border-zinc-800 pb-3 shrink-0">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-[0.25em] text-zinc-500">Audit Trail</span>
                <h3 className="text-sm font-bold uppercase tracking-tight text-zinc-100">Recent Submissions ({tasks.length})</h3>
              </div>
              <button
                onClick={loadTasks}
                className="px-3 py-1 rounded border border-zinc-700 bg-zinc-900 text-xs font-mono uppercase tracking-wider text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100 transition cursor-pointer"
              >
                Sync Trail
              </button>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar space-y-2.5 pt-3 pr-1">
              {loading ? (
                <div className="py-16 text-center text-zinc-600 font-mono text-xs uppercase tracking-widest">
                  Loading trail...
                </div>
              ) : tasks.length === 0 ? (
                <div className="py-16 text-center text-zinc-600 font-mono text-xs uppercase tracking-widest">
                  No directives logged today.
                </div>
              ) : (
                tasks.map((t) => (
                  <div key={t.task_id} className="p-3.5 rounded-lg border border-zinc-800 bg-zinc-950 hover:border-zinc-700 transition space-y-2 font-mono">
                    <div className="flex justify-between items-start">
                      <span className="font-bold text-emerald-400 text-xs">{t.task_id}</span>
                      <span className={`px-2 py-0.5 rounded border text-[10px] font-bold uppercase ${
                        t.status === 'NEW' ? 'border-zinc-700 text-zinc-400 bg-zinc-900' :
                        t.status === 'ASSIGNED' ? 'border-amber-500/30 text-amber-400 bg-amber-950/30' :
                        t.status === 'IN_PROGRESS' ? 'border-blue-500/30 text-blue-400 bg-blue-950/30' :
                        'border-emerald-500/30 text-emerald-400 bg-emerald-950/30'
                      }`}>
                        {t.status}
                      </span>
                    </div>
                    <div>
                      <div className="text-xs font-bold text-zinc-100 uppercase">{t.client_name}</div>
                      <div className="text-[11px] text-zinc-400 truncate">{t.address}</div>
                    </div>
                    <div className="text-[10px] text-zinc-500 pt-2 border-t border-zinc-900 flex justify-between">
                      <span className="uppercase font-bold text-zinc-400">{t.task_type}</span>
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