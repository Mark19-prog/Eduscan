import { BookOpen, CheckCircle2, Clock, Lock, Send, Shield } from 'lucide-react';

const STATUS_CONFIG = {
  Draft: { icon: Clock, label: 'Draft', className: 'status-badge-draft', description: 'Editable by the teacher' },
  Submitted: { icon: Send, label: 'Submitted', className: 'status-badge-submitted', description: 'Awaiting finalization' },
  Finalized: { icon: CheckCircle2, label: 'Finalized', className: 'status-badge-finalized', description: 'Approved and computed' },
  Locked: { icon: Lock, label: 'Locked', className: 'status-badge-locked', description: 'No further changes allowed' },
};

export default function GradebookContext({ gradebook, policyName }) {
  if (!gradebook) return null;
  const config = STATUS_CONFIG[gradebook.status] || STATUS_CONFIG.Draft;
  const StatusIcon = config.icon;

  return (
    <section className="card-static gradebook-context">
      <div className="gradebook-context-header">
        <div className="gradebook-context-info">
          <p className="eyebrow"><BookOpen size={14} /> Active Gradebook</p>
          <h2>{gradebook.subject_name}</h2>
          <p className="gradebook-context-meta">
            Grade {gradebook.grade_name} — {gradebook.section_name} &middot; SY {gradebook.school_year_name} &middot; Quarter {gradebook.quarter}
          </p>
          {gradebook.teacher_name && <p className="gradebook-context-teacher">Teacher: <strong>{gradebook.teacher_name}</strong></p>}
        </div>
        <div className="gradebook-context-right">
          <div className={`status-badge ${config.className}`}>
            <StatusIcon size={16} />
            <span>{config.label}</span>
          </div>
          {policyName && (
            <GradingPolicyBadge name={policyName} version={gradebook.policy_version} />
          )}
        </div>
      </div>
      {gradebook.reopen_reason && (
        <div className="notice notice-warning compact-notice">
          <Shield size={16} /> Reopened: {gradebook.reopen_reason}
          {gradebook.reopened_by_name && <span className="muted-small"> by {gradebook.reopened_by_name}</span>}
        </div>
      )}
    </section>
  );
}

function GradingPolicyBadge({ name, version }) {
  return (
    <div className="policy-badge" title={`Grading Policy: ${name} v${version || '1.0'}`}>
      <Shield size={14} />
      <span>{name}</span>
      {version && <span className="policy-version">v{version}</span>}
    </div>
  );
}
