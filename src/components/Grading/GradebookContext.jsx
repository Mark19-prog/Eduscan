import { useEffect, useRef } from 'react';
import { BookOpen, CheckCircle2, Clock, Lock, Send, Shield } from 'lucide-react';
import { useToast } from '../../contexts/ToastContext';

const STATUS_CONFIG = {
  Draft: { icon: Clock, label: 'Draft', className: 'status-badge-draft', description: 'Editable by the teacher' },
  Submitted: { icon: Send, label: 'Submitted', className: 'status-badge-submitted', description: 'Awaiting finalization' },
  Finalized: { icon: CheckCircle2, label: 'Finalized', className: 'status-badge-finalized', description: 'Approved and computed' },
  Locked: { icon: Lock, label: 'Locked', className: 'status-badge-locked', description: 'No further changes allowed' },
};

export default function GradebookContext({ gradebook, policyName }) {
  const { showError } = useToast();
  const toastShown = useRef(false);

  useEffect(() => {
    if (gradebook?.reopen_reason && !toastShown.current) {
      toastShown.current = true;
      const adminName = gradebook.reopened_by_name ? gradebook.reopened_by_name : 'System Administrator';
      showError(`Reopened by ${adminName}: ${gradebook.reopen_reason}`);
    }
  }, [gradebook, showError]);

  if (!gradebook) return null;
  const config = STATUS_CONFIG[gradebook.status] || STATUS_CONFIG.Draft;
  const StatusIcon = config.icon;

  return (
    <section className="card-static gradebook-context-card mb-4">
      <div className="gradebook-context-header">
        <div className="gradebook-context-info">
          <h2 className="context-subject-title">{gradebook.subject_name}</h2>
          <p className="gradebook-context-meta">
            <span>Grade {gradebook.grade_name}</span>
            <span className="bullet-divider">&bull;</span>
            <span>{gradebook.section_name}</span>
            <span className="bullet-divider">&bull;</span>
            <span>SY {gradebook.school_year_name}</span>
            <span className="bullet-divider">&bull;</span>
            <span>Quarter {gradebook.quarter}</span>
          </p>
          {gradebook.teacher_name && <p className="gradebook-context-teacher">Teacher: <strong>{gradebook.teacher_name}</strong></p>}
        </div>
        <div className="gradebook-context-right">
          <div className={`status-badge-sm ${config.className}`}>
            <StatusIcon size={14} />
            <span>{config.label}</span>
          </div>
        </div>
      </div>
    </section>
  );
}

