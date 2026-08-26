import { useCallback, useEffect, useMemo, useState } from 'react';
import { CheckCircle2, ChevronDown, Clock3, Download, Eraser, FileEdit, MessageSquareText, ShieldCheck, X } from 'lucide-react';
import { api, auth, displayTime, localDate } from '../../api/client';

const statusColor = {
  Present: 'var(--success)', Late: '#b45309', Absent: 'var(--danger)', 'No scan': 'var(--text-muted)',
  'Time Out': 'var(--success)', Excused: '#2563eb', 'Not Enrolled': 'var(--text-muted)', 'Transferred Out': '#7c3aed',
};

export default function Attendance() {
  const [date, setDate] = useState(localDate());
  const [rows, setRows] = useState([]);
  const [corrections, setCorrections] = useState([]);
  const [resets, setResets] = useState([]);
  const [sections, setSections] = useState([]);
  const [sectionKey, setSectionKey] = useState('');
  const [outboxCount, setOutboxCount] = useState(0);
  const [editing, setEditing] = useState(null);
  const [resetting, setResetting] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [roleFilter, setRoleFilter] = useState('All');

  const selectedSection = useMemo(() => sections.find((item) => `${item.grade}|${item.section}` === sectionKey), [sections, sectionKey]);
  const sectionQuery = selectedSection ? `&grade=${encodeURIComponent(selectedSection.grade)}&section=${encodeURIComponent(selectedSection.section)}` : '';

  useEffect(() => {
    api.get('/my/advisory-sections').then((items) => {
      setSections(items);
      if (auth.role() === 'teacher' && items.length) setSectionKey(`${items[0].grade}|${items[0].section}`);
    }).catch((err) => setError(err.message));
  }, []);

  const load = useCallback(async () => {
    setError('');
    try {
      const requests = [api.get(`/attendance?date=${date}${sectionQuery}`), api.get('/attendance/corrections')];
      if (auth.role() === 'admin') requests.push(api.get('/sms/outbox'), api.get('/attendance/resets'));
      const [attendance, audit, outbox = [], resetRows = []] = await Promise.all(requests);
      setRows(attendance); setCorrections(audit); setOutboxCount(outbox.length); setResets(resetRows);
    } catch (err) { setError(err.message); }
  }, [date, sectionQuery]);
  useEffect(() => { load(); }, [load]);

  const filtered = roleFilter === 'All' ? rows : rows.filter((row) => row.role === roleFilter);
  const counts = rows.reduce((result, row) => ({ ...result, [row.status]: (result[row.status] || 0) + 1 }), {});
  const downloadLog = () => {
    if (auth.role() === 'teacher' && !selectedSection) return setError('Ask the administrator to assign your adviser account to a section first.');
    const query = new URLSearchParams({ date });
    if (selectedSection) { query.set('grade', selectedSection.grade); query.set('section', selectedSection.section); }
    const scope = selectedSection ? `Grade-${selectedSection.grade}-${selectedSection.section}` : 'All-School';
    api.download(`/attendance/temporary-log?${query}`, `attendance-${date}-${scope}.xlsx`).catch((err) => setError(err.message));
  };
  const handleClose = async () => {
    if (auth.role() === 'teacher' && !selectedSection) return setError('Select your assigned section before closing attendance.');
    try {
      const result = await api.post(`/attendance/close?date=${date}${sectionQuery}`, {});
      setNotice(`${result.created} absence record(s) created. Applicable guardian SMS notices were processed.`); await load();
    } catch (err) { setError(err.message); }
  };

  return <div className="page-stack">
    <div className="page-heading"><div><p className="eyebrow">Persistent gate attendance register</p><h1>Attendance review</h1><p>Review the school-wide gate log or an adviser section, then correct only the records that need attention.</p></div><button className="btn-primary" onClick={downloadLog}><Download size={17} /> Download current log</button></div>
    <div className="notice notice-blue"><ShieldCheck size={19} /><div><strong>One row per unique student ID or LRN.</strong> The all-school file includes every active record; adviser downloads are filtered by section and alphabetized. Raw scans and clean-slate actions remain auditable.</div></div>
    {notice && <div className="notice notice-success"><CheckCircle2 size={19} /> {notice}</div>}
    {error && <div className="notice notice-danger">{error}</div>}

    <div className="metric-grid compact-grid">{[['Present', counts.Present || 0], ['Late', counts.Late || 0], ['Absent', counts.Absent || 0], ['Pending / no scan', counts['No scan'] || 0]].map(([label, value]) => <div className="metric-card" key={label}><span>{label}</span><strong>{value}</strong></div>)}</div>

    <section className="card-static">
      <div className="toolbar">
        <div><label className="field-label" htmlFor="attendance-date">Attendance date</label><input id="attendance-date" type="date" className="input-field" value={date} onChange={(event) => setDate(event.target.value)} /></div>
        <div><label className="field-label" htmlFor="section-filter">Reporting scope</label><select id="section-filter" className="input-field" value={sectionKey} onChange={(event) => setSectionKey(event.target.value)}>{auth.role() === 'admin' && <option value="">All school records</option>}{sections.map((item) => <option key={item.id} value={`${item.grade}|${item.section}`}>Grade {item.grade} — {item.section}</option>)}</select></div>
        {auth.role() === 'admin' && <div><label className="field-label" htmlFor="role-filter">Personnel group</label><select id="role-filter" className="input-field" value={roleFilter} onChange={(event) => setRoleFilter(event.target.value)}><option>All</option><option>Student</option><option>Faculty</option><option>Non-teaching Personnel</option></select></div>}
        <div className="toolbar-note"><MessageSquareText size={17} /> {auth.role() === 'admin' ? `${outboxCount} SMS notice(s) in outbox` : `${sections.length} assigned section(s)`}</div>
        <details className="action-menu"><summary><ChevronDown size={16} /> Attendance actions</summary><div className="action-menu-panel"><button onClick={handleClose}><Clock3 size={16} /> Run authorized daily close</button>{auth.role() === 'admin' && <button className="danger-link" onClick={() => setResetting(true)}><Eraser size={16} /> Start a clean slate for {date}</button>}</div></details>
      </div>
      {auth.role() === 'teacher' && sections.length === 0 && <div className="notice notice-warning">No adviser section is assigned to {auth.name()}. An administrator must select this account’s full name in Administration → Academic structure → Sections.</div>}
      <div className="table-scroll"><table className="interactive-table"><thead><tr><th>Name</th><th>Role / class</th><th>Time in</th><th>Time out</th><th>Status</th><th>Source</th><th>Action</th></tr></thead><tbody>
        {filtered.length === 0 && <tr><td colSpan="7" className="empty-cell">No active records are available for this scope.</td></tr>}
        {filtered.map((row) => <tr key={row.person_id}><td><strong>{row.full_name}</strong><div className="muted-small">{row.external_id}{row.lrn ? ` · LRN ${row.lrn}` : ''} · {row.sex}</div></td><td>{row.role}<div className="muted-small">{row.role === 'Student' ? `Grade ${row.grade} — ${row.section}` : row.assignment}</div></td><td>{displayTime(row.time_in)}</td><td>{displayTime(row.time_out)}</td><td><span style={{ color: statusColor[row.status], fontWeight: 700 }}>{row.status}</span></td><td>{row.source}{row.correction_reason && <div className="muted-small">Reason: {row.correction_reason}</div>}</td><td><button className="btn-link" onClick={() => setEditing(row)}><FileEdit size={15} /> Correct</button></td></tr>)}
      </tbody></table></div>
    </section>

    <details className="card-static disclosure-card"><summary>Correction audit trail ({corrections.length})</summary><p className="section-copy">Original scan events are never overwritten. The latest authorized correction controls the reported result.</p><div className="table-scroll"><table className="interactive-table"><thead><tr><th>Date & time</th><th>Person</th><th>Authorized actor</th><th>Before</th><th>Corrected to</th><th>Reason</th></tr></thead><tbody>
      {corrections.length === 0 && <tr><td colSpan="6" className="empty-cell">No corrections recorded.</td></tr>}
      {corrections.map((item) => <tr key={item.id}><td>{new Date(item.created_at).toLocaleString('en-PH')}</td><td>{item.person_name}</td><td>{item.actor_name} · {item.actor_role}</td><td>{item.before.status} · {displayTime(item.before.time_in)} / {displayTime(item.before.time_out)}</td><td>{item.status} · {displayTime(item.time_in)} / {displayTime(item.time_out)}</td><td>{item.reason}</td></tr>)}
    </tbody></table></div></details>
    {auth.role() === 'admin' && <details className="card-static disclosure-card"><summary>Clean-slate audit ({resets.length})</summary><div className="table-scroll"><table className="interactive-table"><thead><tr><th>Reset time</th><th>Attendance date</th><th>Actor</th><th>Superseded records</th><th>Reason</th></tr></thead><tbody>{resets.length === 0 && <tr><td colSpan="5" className="empty-cell">No attendance day has been reset.</td></tr>}{resets.map((item) => <tr key={item.id}><td>{new Date(item.created_at).toLocaleString('en-PH')}</td><td>{item.attendance_date}</td><td>{item.actor_name}</td><td>{item.superseded_event_count} scans, {item.superseded_correction_count} corrections</td><td>{item.reason}</td></tr>)}</tbody></table></div></details>}
    {editing && <CorrectionModal row={editing} date={date} onClose={() => setEditing(null)} onSaved={async () => { setEditing(null); setNotice('Attendance correction saved with an audit entry.'); await load(); }} />}
    {resetting && <ResetDayModal date={date} onClose={() => setResetting(false)} onSaved={async (result) => { setResetting(false); setNotice(`Clean slate started. ${result.superseded_event_count} scan event(s) and ${result.superseded_correction_count} correction(s) were superseded, not silently erased.`); await load(); }} />}
  </div>;
}

function CorrectionModal({ row, date, onClose, onSaved }) {
  const [form, setForm] = useState({ status: row.status === 'No scan' ? 'Present' : row.status, time_in: row.time_in || '', time_out: row.time_out || '', reason: '' });
  const [error, setError] = useState('');
  const update = (field) => (event) => setForm((current) => ({ ...current, [field]: event.target.value }));
  const submit = async (event) => {
    event.preventDefault();
    if (form.reason.trim().length < 8) return setError('Enter a specific correction reason (at least 8 characters).');
    try { await api.post('/attendance/corrections', { person_id: row.person_id, attendance_date: date, status: form.status, time_in: form.time_in || null, time_out: form.time_out || null, reason: form.reason }); await onSaved(); }
    catch (err) { setError(err.message); }
  };
  return <div className="modal-backdrop"><form className="modal-card" onSubmit={submit}><div className="modal-header"><div><p className="eyebrow">Documented correction</p><h2>{row.full_name}</h2></div><button type="button" className="icon-btn" onClick={onClose}><X size={20} /></button></div><p className="section-copy">The raw gate event remains unchanged. This becomes a separate attributable record for {date}.</p><div className="form-grid two-columns"><label><span className="field-label">Authorized account</span><input className="input-field" value={`${auth.name()} (${auth.role()})`} readOnly /></label><label><span className="field-label">Corrected status</span><select className="input-field" value={form.status} onChange={update('status')}><option>Present</option><option>Late</option><option>Absent</option><option>Time Out</option></select></label><label><span className="field-label">Corrected time in</span><input className="input-field" type="time" value={form.time_in} onChange={update('time_in')} /></label><label><span className="field-label">Corrected time out</span><input className="input-field" type="time" value={form.time_out} onChange={update('time_out')} /></label></div><label><span className="field-label">Required reason and supporting detail</span><textarea className="text-area" value={form.reason} onChange={update('reason')} /></label>{error && <p className="error-text">{error}</p>}<div className="modal-actions"><button type="button" className="btn-secondary" onClick={onClose}>Cancel</button><button className="btn-primary" type="submit">Save correction</button></div></form></div>;
}

function ResetDayModal({ date, onClose, onSaved }) {
  const [reason, setReason] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [error, setError] = useState('');
  const submit = async (event) => {
    event.preventDefault();
    try { await onSaved(await api.post('/attendance/reset', { attendance_date: date, reason, confirmation })); }
    catch (err) { setError(err.message); }
  };
  return <div className="modal-backdrop"><form className="modal-card" onSubmit={submit}><div className="modal-header"><div><p className="eyebrow">Admin-only clean slate</p><h2>Reset reporting view for {date}</h2></div><button type="button" className="icon-btn" onClick={onClose}><X size={20} /></button></div><div className="notice notice-warning">Existing scans and corrections are retained for accountability but superseded in attendance, scanner history, and generated logs. New scans after this reset become the active records.</div><label><span className="field-label">Documented reason</span><textarea className="text-area" value={reason} onChange={(event) => setReason(event.target.value)} required /></label><label><span className="field-label">Type {date} to confirm</span><input className="input-field" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} required /></label>{error && <p className="error-text">{error}</p>}<div className="modal-actions"><button type="button" className="btn-secondary" onClick={onClose}>Cancel</button><button className="btn-danger" disabled={confirmation !== date || reason.trim().length < 12}><Eraser size={16} /> Start clean slate</button></div></form></div>;
}
