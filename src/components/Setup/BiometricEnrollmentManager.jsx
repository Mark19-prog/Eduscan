import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, Eye, History, RefreshCw, ScanFace, Trash2, UserPlus, X } from 'lucide-react';
import { api } from '../../api/client';
import StudentRegistrationModal from '../Scanner/StudentRegistrationModal';

const formatDateTime = (value) => value ? new Date(value).toLocaleString('en-PH') : '—';

export default function BiometricEnrollmentManager({ onModelChanged }) {
  const [enrollments, setEnrollments] = useState([]);
  const [audit, setAudit] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState(null);
  const [viewing, setViewing] = useState(null);
  const [deleting, setDeleting] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [rows, events] = await Promise.all([
        api.get('/biometrics/enrollments'),
        api.get('/biometrics/enrollments/audit'),
      ]);
      setEnrollments(rows);
      setAudit(events);
      setError('');
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const changed = async (message) => {
    setCreating(false); setEditing(null); setDeleting(null); setViewing(null);
    setNotice(message); setError('');
    await load();
    await onModelChanged?.();
    window.setTimeout(() => setNotice(''), 4500);
  };

  const viewDetails = async (row) => {
    try { setViewing(await api.get(`/biometrics/enrollments/${row.person_id}`)); }
    catch (err) { setError(err.message); }
  };

  return <div className="page-stack" data-testid="biometric-enrollment-manager">
    {notice && <div className="notice notice-success"><CheckCircle2 size={18} /> {notice}</div>}
    {error && <div className="notice notice-danger"><AlertTriangle size={18} /> {error}</div>}
    <section className="card-static">
      <div className="section-heading"><div><p className="eyebrow">Encrypted enrollment registry</p><h2>Facial enrollments</h2><p className="section-copy">Create, inspect, replace, or securely delete an enrollment. Source images are never displayed; only operational metadata is shown.</p></div><div className="action-row"><button className="btn-secondary" onClick={load} disabled={loading}><RefreshCw size={16} /> Refresh</button><button className="btn-primary" onClick={() => setCreating(true)}><UserPlus size={16} /> Enroll person</button></div></div>
      <div className="notice notice-blue"><ScanFace size={18} /><span>Every create, re-enrollment, and deletion records the authorized account, timestamp, reason, sample counts, and resulting LBPH model version.</span></div>
      <div className="table-scroll"><table className="interactive-table"><thead><tr><th>Person</th><th>Group</th><th>Samples</th><th>Quality</th><th>Last capture</th><th>Actions</th></tr></thead><tbody>
        {!loading && enrollments.length === 0 && <tr><td colSpan="6" className="empty-cell">No facial enrollments yet.</td></tr>}
        {loading && <tr><td colSpan="6" className="empty-cell">Loading encrypted enrollment metadata…</td></tr>}
        {enrollments.map((row) => <tr key={row.person_id}><td><strong>{row.full_name}</strong><small className="table-subline">{row.external_id}</small></td><td>{row.role}{row.grade ? <small className="table-subline">Grade {row.grade} — {row.section}</small> : row.assignment ? <small className="table-subline">{row.assignment}</small> : null}</td><td><span className="tag tag-success">{row.sample_count} encrypted</span></td><td>{row.average_quality == null ? '—' : `${row.average_quality}%`}</td><td>{formatDateTime(row.last_captured_at)}</td><td><details className="action-menu"><summary>Manage</summary><div className="action-menu-panel"><button className="btn-link" onClick={() => viewDetails(row)}><Eye size={15} /> View details</button><button className="btn-link" onClick={() => setEditing(row)}><RefreshCw size={15} /> Re-enroll</button><button className="btn-link danger-link" onClick={() => setDeleting(row)}><Trash2 size={15} /> Delete enrollment</button></div></details></td></tr>)}
      </tbody></table></div>
    </section>

    <section className="card-static">
      <div className="section-heading"><div><p className="eyebrow">Append-only accountability record</p><h2>Facial enrollment audit log</h2></div><History size={24} /></div>
      <div className="table-scroll"><table className="interactive-table"><thead><tr><th>Date & time</th><th>Person</th><th>Action</th><th>Authorized actor</th><th>Samples before → after</th><th>Reason</th><th>Resulting model</th></tr></thead><tbody>
        {audit.length === 0 && <tr><td colSpan="7" className="empty-cell">No enrollment changes have been recorded yet.</td></tr>}
        {audit.map((event) => <tr key={event.id}><td>{formatDateTime(event.created_at)}</td><td><strong>{event.person_name}</strong><small className="table-subline">{event.external_id}</small></td><td><span className={`tag ${event.action === 'deleted' ? 'tag-danger' : event.action === 'updated' ? 'tag-warning' : 'tag-success'}`}>{event.action}</span></td><td>{event.actor_name}<small className="table-subline">{event.actor_role}</small></td><td>{event.before.sample_count} → {event.after.sample_count}</td><td>{event.reason}</td><td className="model-version">{event.model_version || 'No active model'}</td></tr>)}
      </tbody></table></div>
    </section>

    {creating && <StudentRegistrationModal onClose={() => setCreating(false)} onSaved={() => changed('Facial enrollment created and recorded in the audit log.')} />}
    {editing && <StudentRegistrationModal person={editing} onClose={() => setEditing(null)} onSaved={() => changed('Facial enrollment replaced, LBPH retrained, and the change audited.')} />}
    {viewing && <EnrollmentDetails enrollment={viewing} onClose={() => setViewing(null)} />}
    {deleting && <DeleteEnrollmentModal enrollment={deleting} onClose={() => setDeleting(null)} onDeleted={(result) => changed(`${result.removed_samples} encrypted samples and ${result.removed_model_records} obsolete model record(s) securely deleted; the non-biometric audit history was retained.`)} />}
  </div>;
}

function EnrollmentDetails({ enrollment, onClose }) {
  return <div className="modal-backdrop"><div className="modal-card enrollment-detail-modal">
    <div className="modal-header"><div><p className="eyebrow">Read-only enrollment record</p><h2><ScanFace size={23} /> {enrollment.full_name}</h2></div><button className="icon-btn" onClick={onClose}><X size={21} /></button></div>
    <div className="metric-grid"><div className="metric-card"><span>School / employee ID</span><strong>{enrollment.external_id}</strong></div><div className="metric-card"><span>Encrypted samples</span><strong>{enrollment.sample_count}</strong></div><div className="metric-card"><span>Average quality</span><strong>{enrollment.average_quality}%</strong></div><div className="metric-card"><span>Last capture</span><strong className="detail-date">{formatDateTime(enrollment.last_captured_at)}</strong></div></div>
    <p className="section-copy">Encrypted face crops cannot be previewed from EduScan. This prevents the management screen from becoming a biometric image gallery.</p>
    <div className="table-scroll"><table className="interactive-table"><thead><tr><th>Sample reference</th><th>Quality score</th><th>Captured</th></tr></thead><tbody>{enrollment.samples.map((sample) => <tr key={sample.id}><td>{sample.id.slice(0, 8)}…</td><td>{sample.quality_score}%</td><td>{formatDateTime(sample.created_at)}</td></tr>)}</tbody></table></div>
    <div className="modal-actions"><button className="btn-primary" onClick={onClose}>Done</button></div>
  </div></div>;
}

function DeleteEnrollmentModal({ enrollment, onClose, onDeleted }) {
  const [reason, setReason] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const valid = reason.trim().length >= 8 && confirmation === enrollment.external_id;
  const submit = async (event) => {
    event.preventDefault();
    if (!valid) return;
    setSaving(true); setError('');
    try { onDeleted(await api.delete(`/biometrics/enrollments/${enrollment.person_id}`, { reason: reason.trim() })); }
    catch (err) { setError(err.message); setSaving(false); }
  };
  return <div className="modal-backdrop"><form className="modal-card" onSubmit={submit}>
    <div className="modal-header"><div><p className="eyebrow danger-text">Permanent biometric deletion</p><h2>Delete {enrollment.full_name}’s facial enrollment?</h2></div><button type="button" className="icon-btn" onClick={onClose}><X size={21} /></button></div>
    <div className="notice notice-danger"><AlertTriangle size={19} /><span>{enrollment.sample_count} encrypted samples, their SQLite metadata, and every obsolete LBPH model file and database record will be removed. The active model will be rebuilt without this person. Attendance, grades, person details, and the required non-biometric audit record remain.</span></div>
    <label><span className="field-label">Required deletion reason</span><textarea className="text-area" value={reason} onChange={(event) => setReason(event.target.value)} placeholder="State the authorized basis for deletion" /></label>
    <label><span className="field-label">Type {enrollment.external_id} to confirm</span><input className="input-field" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} autoComplete="off" /></label>
    {error && <p className="error-text">{error}</p>}
    <div className="modal-actions"><button type="button" className="btn-secondary" onClick={onClose}>Cancel</button><button type="submit" className="btn-danger" disabled={!valid || saving}><Trash2 size={16} /> {saving ? 'Deleting & retraining…' : 'Delete enrollment'}</button></div>
  </form></div>;
}
