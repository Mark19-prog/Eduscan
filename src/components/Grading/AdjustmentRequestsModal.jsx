import React, { useState } from 'react';
import { ShieldAlert, Plus, Check, X, Clock, User, AlertCircle, CheckCircle2, XCircle } from 'lucide-react';
import { api, auth } from '../../api/client';

export default function AdjustmentRequestsModal({
  gradebookId,
  students = [],
  components = [],
  adjustments = [],
  onClose,
  onRefresh,
}) {
  const userRole = auth.role();
  const isAdminOrOfficer = ['admin', 'records_officer'].includes(userRole);

  const [mode, setMode] = useState('list'); // 'list' | 'create'
  const [selectedStudentId, setSelectedStudentId] = useState(students[0]?.person_id || '');
  const [selectedItemId, setSelectedItemId] = useState(() => {
    for (const c of components) {
      if (c.items && c.items.length > 0) return c.items[0].id;
    }
    return '';
  });
  const [newScore, setNewScore] = useState('');
  const [newStatus, setNewStatus] = useState('Scored');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Review modal state
  const [reviewingId, setReviewingId] = useState(null);
  const [reviewAction, setReviewAction] = useState('Approved'); // 'Approved' | 'Rejected'
  const [reviewNote, setReviewNote] = useState('');

  // Collect all items across components for the dropdown
  const allItems = components.flatMap((c) =>
    (c.items || []).map((item) => ({
      ...item,
      componentName: c.name,
    }))
  );

  const selectedStudent = students.find((s) => s.person_id === Number(selectedStudentId));
  const selectedItem = allItems.find((i) => i.id === Number(selectedItemId));
  const currentScore = selectedStudent?.scores?.[selectedItemId] ?? '—';
  const currentStatus = selectedStudent?.score_statuses?.[selectedItemId] || 'Scored';

  const handleSubmitRequest = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!selectedStudentId) {
      setError('Please select a student.');
      return;
    }
    if (!selectedItemId) {
      setError('Please select an assessment activity.');
      return;
    }
    if (newStatus === 'Scored') {
      if (newScore === '' || isNaN(Number(newScore))) {
        setError('Please enter a valid numeric score.');
        return;
      }
      const num = Number(newScore);
      if (num < 0 || (selectedItem && num > selectedItem.max_score)) {
        setError(`Score must be between 0 and ${selectedItem ? selectedItem.max_score : 100}.`);
        return;
      }
    }
    if (!reason.trim() || reason.trim().length < 8) {
      setError('Please provide an explicit justification of at least 8 characters.');
      return;
    }

    setLoading(true);
    try {
      await api.post(`/gradebooks/${gradebookId}/adjustments`, {
        person_id: Number(selectedStudentId),
        assessment_item_id: Number(selectedItemId),
        new_score: newStatus === 'Scored' ? Number(newScore) : null,
        new_status: newStatus,
        reason: reason.trim(),
      });
      setSuccess('Grade adjustment request successfully submitted for administrative review.');
      setReason('');
      setNewScore('');
      onRefresh?.();
      setTimeout(() => {
        setMode('list');
        setSuccess('');
      }, 1500);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleReview = async (id, status) => {
    if (!reviewNote.trim()) {
      setError('A review note is required to approve or reject an adjustment.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await api.put(`/adjustment-requests/${id}`, {
        status,
        note: reviewNote.trim(),
      });
      setReviewingId(null);
      setReviewNote('');
      onRefresh?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-card modal-lg">
        <div className="modal-header">
          <div className="breakdown-title-group">
            <div className="breakdown-icon-circle text-warning">
              <ShieldAlert size={20} />
            </div>
            <div>
              <h3>Post-Finalization Grade Adjustments</h3>
              <p className="modal-subtitle">
                Formal request and approval workflow for grade corrections on finalized gradebooks.
              </p>
            </div>
          </div>
          <button type="button" className="btn-icon" onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>
        </div>

        <div className="modal-body">
          {error && <div className="notice notice-danger compact-notice">{error}</div>}
          {success && <div className="notice notice-success compact-notice">{success}</div>}

          {/* Navigation Tabs */}
          <div className="modal-tab-row">
            <button
              type="button"
              className={`pill-filter ${mode === 'list' ? 'pill-filter-active' : ''}`}
              onClick={() => setMode('list')}
            >
              Adjustment Requests ({adjustments.length})
            </button>
            <button
              type="button"
              className={`pill-filter ${mode === 'create' ? 'pill-filter-active' : ''}`}
              onClick={() => setMode('create')}
            >
              <Plus size={14} /> New Request
            </button>
          </div>

          {mode === 'create' ? (
            /* CREATE REQUEST FORM */
            <form onSubmit={handleSubmitRequest} className="adjustment-form-grid">
              <div className="form-group">
                <label className="field-label">Select Learner</label>
                <select
                  className="input-field"
                  value={selectedStudentId}
                  onChange={(e) => setSelectedStudentId(e.target.value)}
                  disabled={loading}
                >
                  {students.map((s) => (
                    <option key={s.person_id} value={s.person_id}>
                      {s.full_name} ({s.lrn || s.external_id || 'ID: ' + s.person_id})
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="field-label">Select Assessment Item</label>
                <select
                  className="input-field"
                  value={selectedItemId}
                  onChange={(e) => setSelectedItemId(e.target.value)}
                  disabled={loading}
                >
                  {allItems.map((item) => (
                    <option key={item.id} value={item.id}>
                      [{item.componentName}] {item.label} (Max: {item.max_score})
                    </option>
                  ))}
                </select>
              </div>

              {/* Current value display */}
              <div className="adjustment-current-snapshot">
                <span className="text-muted text-sm">Current Recorded Value:</span>
                <strong>
                  {currentScore !== '—' && currentScore !== null ? currentScore : 'No Score'} ({currentStatus})
                </strong>
                {selectedItem && <span className="muted-small">Max: {selectedItem.max_score}</span>}
              </div>

              <div className="form-grid two-columns">
                <div className="form-group">
                  <label className="field-label">New Status</label>
                  <select
                    className="input-field"
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value)}
                    disabled={loading}
                  >
                    <option value="Scored">Scored</option>
                    <option value="Missing">Missing</option>
                    <option value="Excused">Excused</option>
                    <option value="Incomplete">Incomplete</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="field-label">
                    New Score {selectedItem && `(0 – ${selectedItem.max_score})`}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max={selectedItem?.max_score ?? 100}
                    className="input-field font-mono"
                    placeholder="Enter corrected score"
                    disabled={loading || newStatus !== 'Scored'}
                    value={newScore}
                    onChange={(e) => setNewScore(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="field-label">
                  Official Justification / Reason <span className="text-danger">*</span>
                </label>
                <textarea
                  className="input-field"
                  rows={3}
                  placeholder="State the reason for this post-finalization grade adjustment (e.g., re-checked rubric, computed error, medical excuse validated)..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  disabled={loading}
                />
                <span className="muted-small">Minimum 8 characters required for official audit trail.</span>
              </div>

              <div className="action-row">
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={loading || reason.trim().length < 8}
                >
                  {loading ? 'Submitting...' : 'Submit Request for Approval'}
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setMode('list')}
                  disabled={loading}
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            /* LIST REQUESTS */
            <div className="table-scroll">
              <table className="interactive-table">
                <thead>
                  <tr>
                    <th>Learner</th>
                    <th>Assessment</th>
                    <th>Requested Change</th>
                    <th>Reason & Submitter</th>
                    <th>Status</th>
                    {isAdminOrOfficer && <th>Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {adjustments.length === 0 ? (
                    <tr>
                      <td colSpan={isAdminOrOfficer ? 6 : 5} className="empty-cell">
                        No adjustment requests recorded for this gradebook.
                      </td>
                    </tr>
                  ) : (
                    adjustments.map((req) => {
                      const isPending = req.status === 'Pending';
                      const isApproved = req.status === 'Approved';

                      return (
                        <tr key={req.id}>
                          <td>
                            <strong>{req.person_name || `ID: ${req.person_id}`}</strong>
                          </td>
                          <td>
                            <span>{req.assessment_label || `Item #${req.assessment_item_id}`}</span>
                          </td>
                          <td>
                            <div className="value-diff">
                              <span className="old-val">
                                {req.old_score != null ? req.old_score : req.old_status || '—'}
                              </span>
                              <span className="text-muted">→</span>
                              <span className="new-val font-bold">
                                {req.new_score != null ? req.new_score : req.new_status}
                              </span>
                            </div>
                          </td>
                          <td>
                            <p className="reason-text">{req.reason}</p>
                            <span className="muted-small">
                              By {req.requested_by_name || 'Teacher'} &middot;{' '}
                              {req.created_at ? new Date(req.created_at).toLocaleDateString('en-PH') : ''}
                            </span>
                            {req.review_note && (
                              <div className="review-note-box">
                                <span className="muted-small">Review: {req.review_note}</span>
                              </div>
                            )}
                          </td>
                          <td>
                            <span
                              className={`tag ${
                                isApproved
                                  ? 'tag-success'
                                  : isPending
                                  ? 'tag-warning'
                                  : 'tag-danger'
                              }`}
                            >
                              {req.status}
                            </span>
                          </td>
                          {isAdminOrOfficer && (
                            <td>
                              {isPending && (
                                <div className="action-row compact-actions">
                                  {reviewingId === req.id ? (
                                    <div className="review-input-group">
                                      <input
                                        type="text"
                                        className="input-field input-sm"
                                        placeholder="Review note..."
                                        value={reviewNote}
                                        onChange={(e) => setReviewNote(e.target.value)}
                                      />
                                      <button
                                        type="button"
                                        className="btn btn-sm btn-success"
                                        onClick={() => handleReview(req.id, reviewAction)}
                                        disabled={loading || !reviewNote.trim()}
                                      >
                                        Confirm
                                      </button>
                                      <button
                                        type="button"
                                        className="btn btn-sm btn-secondary"
                                        onClick={() => setReviewingId(null)}
                                      >
                                        Cancel
                                      </button>
                                    </div>
                                  ) : (
                                    <>
                                      <button
                                        type="button"
                                        className="btn-link-action text-success"
                                        title="Approve request"
                                        onClick={() => {
                                          setReviewingId(req.id);
                                          setReviewAction('Approved');
                                        }}
                                      >
                                        <CheckCircle2 size={16} /> Approve
                                      </button>
                                      <button
                                        type="button"
                                        className="btn-link-action text-danger"
                                        title="Reject request"
                                        onClick={() => {
                                          setReviewingId(req.id);
                                          setReviewAction('Rejected');
                                        }}
                                      >
                                        <XCircle size={16} /> Reject
                                      </button>
                                    </>
                                  )}
                                </div>
                              )}
                            </td>
                          )}
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
