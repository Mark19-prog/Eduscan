import React, { useState } from 'react';
import { History, X, Search, User, Clock, ArrowRight, ShieldAlert, CheckCircle2, Lock, Unlock, FileEdit, Send } from 'lucide-react';

const ACTION_CONFIG = {
  Create: { color: 'badge-info', icon: FileEdit, label: 'Created' },
  Save: { color: 'badge-neutral', icon: FileEdit, label: 'Saved Draft' },
  Submit: { color: 'badge-primary', icon: Send, label: 'Submitted' },
  Finalize: { color: 'badge-success', icon: CheckCircle2, label: 'Finalized' },
  Lock: { color: 'badge-purple', icon: Lock, label: 'Locked' },
  Reopen: { color: 'badge-warning', icon: Unlock, label: 'Reopened' },
  Adjustment: { color: 'badge-cyan', icon: ShieldAlert, label: 'Adjustment' },
};

export default function AuditHistory({ audit = [], onClose, onRefresh }) {
  const [search, setSearch] = useState('');
  const [filterAction, setFilterAction] = useState('All');

  const filtered = audit.filter((entry) => {
    if (filterAction !== 'All' && entry.action !== filterAction) return false;
    if (!search.trim()) return true;
    const term = search.toLowerCase();
    return (
      (entry.actor_name || '').toLowerCase().includes(term) ||
      (entry.reason || '').toLowerCase().includes(term) ||
      (entry.person_name || '').toLowerCase().includes(term) ||
      (entry.assessment_label || '').toLowerCase().includes(term) ||
      (entry.action || '').toLowerCase().includes(term)
    );
  });

  const actionTypes = ['All', ...new Set(audit.map((e) => e.action).filter(Boolean))];

  return (
    <div className="modal-backdrop">
      <div className="modal-card modal-lg">
        <div className="modal-header">
          <div className="breakdown-title-group">
            <div className="breakdown-icon-circle">
              <History size={20} />
            </div>
            <div>
              <h3>Gradebook Audit Trail</h3>
              <p className="modal-subtitle">
                Immutable, field-level log of all grade entries, status transitions, and adjustments.
              </p>
            </div>
          </div>
          <button type="button" className="btn-icon" onClick={onClose} aria-label="Close audit log">
            <X size={20} />
          </button>
        </div>

        <div className="modal-body">
          {/* Filter Bar */}
          <div className="audit-filter-bar">
            <div className="search-box">
              <Search size={16} className="search-icon" />
              <input
                type="text"
                className="input-field"
                placeholder="Search actor, student, assessment, or reason..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="audit-action-filters">
              {actionTypes.map((action) => (
                <button
                  key={action}
                  type="button"
                  className={`pill-filter ${filterAction === action ? 'pill-filter-active' : ''}`}
                  onClick={() => setFilterAction(action)}
                >
                  {action}
                </button>
              ))}
            </div>
          </div>

          {/* Audit List / Table */}
          <div className="audit-table-wrapper table-scroll">
            <table className="interactive-table audit-table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Action</th>
                  <th>Actor</th>
                  <th>Target / Field</th>
                  <th>Change (Old → New)</th>
                  <th>Stated Reason</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="empty-cell">
                      {audit.length === 0
                        ? 'No audit entries recorded for this gradebook yet.'
                        : 'No matching audit records found.'}
                    </td>
                  </tr>
                ) : (
                  filtered.map((entry) => {
                    const config = ACTION_CONFIG[entry.action] || {
                      color: 'badge-neutral',
                      icon: FileEdit,
                      label: entry.action,
                    };
                    const ActionIcon = config.icon;
                    const dateStr = entry.created_at
                      ? new Date(entry.created_at).toLocaleString('en-PH', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : '—';

                    return (
                      <tr key={entry.id}>
                        <td className="audit-date-cell">
                          <Clock size={12} className="text-muted inline-icon" />
                          <span>{dateStr}</span>
                        </td>
                        <td>
                          <span className={`tag ${config.color}`}>
                            <ActionIcon size={12} className="mr-1" />
                            {config.label}
                          </span>
                        </td>
                        <td className="audit-actor-cell">
                          <strong>{entry.actor_name || 'System'}</strong>
                          {entry.actor_role && (
                            <span className="muted-small"> ({entry.actor_role})</span>
                          )}
                        </td>
                        <td>
                          {entry.person_name ? (
                            <div>
                              <strong>{entry.person_name}</strong>
                              {entry.assessment_label && (
                                <div className="muted-small">
                                  {entry.component_name ? `${entry.component_name} › ` : ''}
                                  {entry.assessment_label}
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-muted">Gradebook State</span>
                          )}
                        </td>
                        <td>
                          {entry.old_value !== null || entry.new_value !== null ? (
                            <div className="value-diff">
                              <span className="old-val">{entry.old_value ?? '—'}</span>
                              <ArrowRight size={12} className="diff-arrow" />
                              <span className="new-val">{entry.new_value ?? '—'}</span>
                            </div>
                          ) : (
                            <span className="text-muted">—</span>
                          )}
                        </td>
                        <td className="audit-reason-cell">
                          <p className="reason-text">{entry.reason || '—'}</p>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="modal-footer flex-between">
          <span className="muted-small">Showing {filtered.length} of {audit.length} entries</span>
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
