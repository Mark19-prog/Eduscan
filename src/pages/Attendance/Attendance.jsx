import { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, Clock3, Download, FileEdit, MessageSquareText, ShieldCheck, X } from 'lucide-react';
import { api, auth, displayTime, localDate } from '../../api/client';

const statusColor = { Present: 'var(--success)', Late: '#b45309', Absent: 'var(--danger)', 'No scan': 'var(--text-muted)', 'Time Out': 'var(--success)' };

export default function Attendance() {
  const [date, setDate] = useState(localDate());
  const [rows, setRows] = useState([]);
  const [corrections, setCorrections] = useState([]);
  const [outboxCount, setOutboxCount] = useState(0);
  const [editing, setEditing] = useState(null);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [roleFilter, setRoleFilter] = useState('All');

  const load = useCallback(async () => {
    setError('');
    try {
      const [attendance, audit] = await Promise.all([api.get(`/attendance?date=${date}`), api.get('/attendance/corrections')]);
      setRows(attendance); setCorrections(audit);
      if (auth.role() === 'admin') setOutboxCount((await api.get('/sms/outbox')).length);
    } catch (err) { setError(err.message); }
  }, [date]);
  useEffect(() => { load(); }, [load]);

  const filtered = roleFilter === 'All' ? rows : rows.filter((row) => row.role === roleFilter);
  const counts = rows.reduce((result, row) => ({ ...result, [row.status]: (result[row.status] || 0) + 1 }), {});
  const handleClose = async () => {
    try { const result = await api.post(`/attendance/close?date=${date}`, {}); setNotice(`${result.created} absence record(s) created. Applicable guardian SMS notices were processed.`); await load(); }
    catch (err) { setError(err.message); }
  };

  return (
    <div className="page-stack">
      <div className="page-heading"><div><p className="eyebrow">Persistent gate attendance register</p><h1>Attendance review & corrections</h1><p>Every correction requires a reason and is stored separately from the original LBPH gate event.</p></div><div className="action-row"><button className="btn-secondary" onClick={() => api.download(`/attendance/temporary-log?date=${date}`, `attendance-${date}.xlsx`).catch((err) => setError(err.message))}><Download size={17} /> Temporary Excel log</button><button className="btn-primary" onClick={handleClose}><Clock3 size={17} /> Run authorized daily close</button></div></div>
      <div className="notice notice-blue"><ShieldCheck size={19} /><div><strong>Database and audit controls are active.</strong> Scanner events are immutable; authorized corrections change the reporting view without deleting the source event.</div></div>
      {notice && <div className="notice notice-success"><CheckCircle2 size={19} /> {notice}</div>}
      {error && <div className="notice notice-danger">{error}</div>}

      <div className="metric-grid compact-grid">{[['Present', counts.Present || 0], ['Late', counts.Late || 0], ['Absent', counts.Absent || 0], ['Pending / no scan', counts['No scan'] || 0]].map(([label, value]) => <div className="metric-card" key={label}><span>{label}</span><strong>{value}</strong></div>)}</div>

      <div className="card-static">
        <div className="toolbar"><div><label className="field-label" htmlFor="attendance-date">Attendance date</label><input id="attendance-date" type="date" className="input-field" value={date} onChange={(event) => setDate(event.target.value)} /></div><div><label className="field-label" htmlFor="role-filter">Personnel group</label><select id="role-filter" className="input-field" value={roleFilter} onChange={(event) => setRoleFilter(event.target.value)}><option>All</option><option>Student</option><option>Faculty</option><option>Non-teaching Personnel</option></select></div><div className="toolbar-note"><MessageSquareText size={17} /> {auth.role() === 'admin' ? `${outboxCount} SMS notice(s) in outbox` : 'SMS status is restricted to administrators'}</div></div>
        <div className="table-scroll"><table className="interactive-table"><thead><tr><th>Name</th><th>Role / class</th><th>Time in</th><th>Time out</th><th>Status</th><th>Source</th><th>Action</th></tr></thead><tbody>
          {filtered.length === 0 && <tr><td colSpan="7" className="empty-cell">No active people are registered yet.</td></tr>}
          {filtered.map((row) => <tr key={row.person_id}><td><strong>{row.full_name}</strong><div className="muted-small">{row.lrn || row.external_id} · {row.sex}</div></td><td>{row.role}<div className="muted-small">{row.role === 'Student' ? `Grade ${row.grade} — ${row.section}` : row.assignment}</div></td><td>{displayTime(row.time_in)}</td><td>{displayTime(row.time_out)}</td><td><span style={{ color: statusColor[row.status], fontWeight: 700 }}>{row.status}</span></td><td>{row.source}{row.correction_reason && <div className="muted-small">Reason: {row.correction_reason}</div>}</td><td><button className="btn-link" onClick={() => setEditing(row)}><FileEdit size={15} /> Correct</button></td></tr>)}
        </tbody></table></div>
      </div>

      <div className="card-static"><h2>Correction audit trail</h2><p className="section-copy">Original scan events are never overwritten. The latest authorized correction controls the reported result.</p><div className="table-scroll"><table className="interactive-table"><thead><tr><th>Date & time</th><th>Person</th><th>Authorized actor</th><th>Before</th><th>Corrected to</th><th>Reason</th></tr></thead><tbody>
        {corrections.length === 0 && <tr><td colSpan="6" className="empty-cell">No corrections recorded.</td></tr>}
        {corrections.map((item) => <tr key={item.id}><td>{new Date(item.created_at).toLocaleString('en-PH')}</td><td>{item.person_name}</td><td>{item.actor_name} · {item.actor_role}</td><td>{item.before.status} · {displayTime(item.before.time_in)} / {displayTime(item.before.time_out)}</td><td>{item.status} · {displayTime(item.time_in)} / {displayTime(item.time_out)}</td><td>{item.reason}</td></tr>)}
      </tbody></table></div></div>
      {editing && <CorrectionModal row={editing} date={date} onClose={() => setEditing(null)} onSaved={async () => { setEditing(null); setNotice('Attendance correction saved with an audit entry.'); await load(); }} />}
    </div>
  );
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
  return <div className="modal-backdrop"><form className="modal-card" onSubmit={submit}><div className="modal-header"><div><p className="eyebrow">Documented correction</p><h2>{row.full_name}</h2></div><button type="button" className="icon-btn" onClick={onClose}><X size={20} /></button></div><p className="section-copy">The raw gate event remains unchanged. This becomes a separate attributable record for {date}.</p><div className="form-grid two-columns"><label><span className="field-label">Authorized account</span><input className="input-field" value={`${auth.name()} (${auth.role()})`} readOnly /></label><label><span className="field-label">Corrected status</span><select className="input-field" value={form.status} onChange={update('status')}><option>Present</option><option>Late</option><option>Absent</option><option>Time Out</option></select></label><label><span className="field-label">Corrected time in</span><input className="input-field" type="time" value={form.time_in} onChange={update('time_in')} /></label><label><span className="field-label">Corrected time out</span><input className="input-field" type="time" value={form.time_out} onChange={update('time_out')} /></label></div><label><span className="field-label">Required reason and supporting detail</span><textarea className="text-area" value={form.reason} onChange={update('reason')} /></label>{error && <p className="error-text">{error}</p>}<div className="modal-actions"><button type="button" className="btn-secondary" onClick={onClose}>Cancel</button><button className="btn-primary" type="submit">Save correction & audit entry</button></div></form></div>;
}
