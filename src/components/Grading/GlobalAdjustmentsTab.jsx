import React, { useState, useEffect } from 'react';
import { Loader2, AlertCircle, CheckCircle2, XCircle } from 'lucide-react';
import { api } from '../../api/client';
import { useToast } from '../../contexts/ToastContext';

export default function GlobalAdjustmentsTab() {
  const [loading, setLoading] = useState(true);
  const [adjustments, setAdjustments] = useState([]);
  const { showError } = useToast();
  
  // Review state
  const [reviewingId, setReviewingId] = useState(null);
  const [reviewAction, setReviewAction] = useState('Approved');
  const [reviewNote, setReviewNote] = useState('');

  const loadAdjustments = async () => {
    setLoading(true);
    try {
      const data = await api.get('/admin/grade-adjustments');
      setAdjustments(data);
    } catch (err) {
      showError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAdjustments();
  }, []);

  const handleReview = async (id, status) => {
    if (!reviewNote.trim()) {
      showError('A review note is required to approve or reject an adjustment.');
      return;
    }
    setLoading(true);
    try {
      await api.put(`/adjustment-requests/${id}`, {
        status,
        note: reviewNote.trim(),
      });
      setReviewingId(null);
      setReviewNote('');
      await loadAdjustments();
    } catch (err) {
      showError(err.message);
      setLoading(false);
    }
  };

  if (loading && adjustments.length === 0) {
    return (
      <div className="card-static py-8 text-center mt-2">
        <Loader2 size={32} className="spin text-primary mx-auto mb-2" />
        <p className="text-muted">Loading adjustment requests...</p>
      </div>
    );
  }

  return (
    <div className="card-static mt-2">
      <div className="card-header border-b border-border pb-4 mb-0">
        <div>
          <h2 className="text-xl font-bold">Global Adjustment Requests</h2>
          <p className="text-sm text-secondary">Manage grade corrections across all sections and subjects.</p>
        </div>
      </div>
      
      <div className="card-body p-0">
        <div className="table-scroll">
          <table className="interactive-table mb-0">
            <thead>
              <tr>
                <th>Context</th>
                <th>Learner</th>
                <th>Assessment</th>
                <th>Requested Change</th>
                <th>Reason & Submitter</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {adjustments.length === 0 ? (
                <tr>
                  <td colSpan={7} className="empty-cell">
                    No adjustment requests found in the system.
                  </td>
                </tr>
              ) : (
                adjustments.map((req) => {
                  const isPending = req.status === 'Pending';
                  const isApproved = req.status === 'Approved';

                  return (
                    <tr key={req.id}>
                      <td>
                        <strong>{req.grade_name} - {req.section_name}</strong>
                        <div className="muted-small">{req.subject_name}</div>
                      </td>
                      <td>
                        <strong>{req.person_name || `ID: ${req.person_id}`}</strong>
                      </td>
                      <td>
                        <span>{req.assessment_label || `Item #${req.assessment_item_id}`}</span>
                      </td>
                      <td>
                        <div className="value-diff flex items-center gap-2">
                          <span className="old-val text-muted line-through">
                            {req.old_score != null ? req.old_score : req.old_status || '—'}
                          </span>
                          <span className="text-muted">→</span>
                          <span className="new-val font-bold">
                            {req.new_score != null ? req.new_score : req.new_status}
                          </span>
                        </div>
                      </td>
                      <td>
                        <p className="reason-text text-sm mb-1">{req.reason}</p>
                        <span className="muted-small text-xs">
                          By {req.requested_by_name || 'Teacher'} &middot;{' '}
                          {req.created_at ? new Date(req.created_at).toLocaleDateString('en-PH') : ''}
                        </span>
                        {req.review_note && (
                          <div className="review-note-box mt-1 bg-surface-hover p-2 rounded text-sm">
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
                      <td>
                        {isPending && (
                          <div className="action-row compact-actions flex-wrap gap-2">
                            {reviewingId === req.id ? (
                              <div className="review-input-group flex-col items-start gap-2 w-48">
                                <input
                                  type="text"
                                  className="input-field input-sm w-full"
                                  placeholder="Review note..."
                                  value={reviewNote}
                                  onChange={(e) => setReviewNote(e.target.value)}
                                />
                                <div className="flex gap-2">
                                  <button
                                    type="button"
                                    className={`btn btn-sm ${reviewAction === 'Approved' ? 'btn-success' : 'btn-danger'}`}
                                    onClick={() => handleReview(req.id, reviewAction)}
                                    disabled={loading || !reviewNote.trim()}
                                  >
                                    Confirm {reviewAction === 'Approved' ? 'Approve' : 'Reject'}
                                  </button>
                                  <button
                                    type="button"
                                    className="btn btn-sm btn-secondary"
                                    onClick={() => setReviewingId(null)}
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <>
                                <button
                                  type="button"
                                  className="btn-link-action text-success whitespace-nowrap"
                                  title="Approve request"
                                  onClick={() => {
                                    setReviewingId(req.id);
                                    setReviewAction('Approved');
                                  }}
                                >
                                  <CheckCircle2 size={16} className="mr-1 inline" /> Approve
                                </button>
                                <button
                                  type="button"
                                  className="btn-link-action text-danger whitespace-nowrap"
                                  title="Reject request"
                                  onClick={() => {
                                    setReviewingId(req.id);
                                    setReviewAction('Rejected');
                                  }}
                                >
                                  <XCircle size={16} className="mr-1 inline" /> Reject
                                </button>
                              </>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
