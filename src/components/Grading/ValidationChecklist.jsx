import React from 'react';
import { CheckCircle2, AlertTriangle, XCircle, ShieldCheck, Wrench, X } from 'lucide-react';

export default function ValidationChecklist({
  components = [],
  students = [],
  status = 'Draft',
  passingGrade = 75,
  onOpenConfig,
  onClose,
}) {
  const totalWeight = components.reduce((sum, c) => sum + (Number(c.weight) || 0), 0);
  const isWeightValid = Math.abs(totalWeight - 100.0) < 0.01;

  const emptyComponents = components.filter((c) => !c.items || c.items.length === 0);
  const hasItemsInAllComponents = components.length > 0 && emptyComponents.length === 0;

  const incompleteStudents = students.filter((s) => !s.complete || s.reported_grade == null);
  const allScoresComplete = students.length > 0 && incompleteStudents.length === 0;

  const checks = [
    {
      id: 'weights',
      title: 'Component Weights Total 100%',
      description: isWeightValid
        ? 'Weights sum to exactly 100% across all components.'
        : `Current total is ${totalWeight.toFixed(1)}%. Weights must equal 100.0%.`,
      status: isWeightValid ? 'pass' : 'error',
      action: onOpenConfig ? { label: 'Adjust Weights', onClick: onOpenConfig } : null,
    },
    {
      id: 'items',
      title: 'Assessment Items Defined',
      description: hasItemsInAllComponents
        ? `All ${components.length} component(s) have assessment activities defined.`
        : emptyComponents.length > 0
        ? `Component(s) without items: ${emptyComponents.map((c) => c.name).join(', ')}.`
        : 'No components defined for this gradebook.',
      status: hasItemsInAllComponents ? 'pass' : 'error',
      action: onOpenConfig ? { label: 'Add Items', onClick: onOpenConfig } : null,
    },
    {
      id: 'scores',
      title: 'Learner Scores Completion',
      description: allScoresComplete
        ? `All ${students.length} enrolled learner(s) have complete computed scores.`
        : `${incompleteStudents.length} of ${students.length} learner(s) have missing, excused, or blank scores.`,
      status: allScoresComplete ? 'pass' : status === 'Draft' ? 'warn' : 'error',
      hint: 'Required prior to Finalization. Drafts may be saved with partial scores.',
    },
    {
      id: 'policy',
      title: 'DepEd Transmutation & Passing Rule',
      description: `Official transmutation active with passing threshold set at ${passingGrade}.`,
      status: 'pass',
    },
  ];

  const hasErrors = checks.some((c) => c.status === 'error');
  const hasWarnings = checks.some((c) => c.status === 'warn');

  return (
    <div className="validation-checklist-panel card-static">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Quality & Compliance Guard</p>
          <h3>Pre-Flight Validation Checklist</h3>
        </div>
        {onClose && (
          <button type="button" className="btn-icon" onClick={onClose} aria-label="Close checklist">
            <X size={18} />
          </button>
        )}
      </div>

      <div className="validation-summary-banner">
        {hasErrors ? (
          <div className="notice notice-danger compact-notice">
            <XCircle size={18} />
            <span><strong>Submission Blocked:</strong> Resolve critical errors before submitting or finalizing.</span>
          </div>
        ) : hasWarnings ? (
          <div className="notice notice-warning compact-notice">
            <AlertTriangle size={18} />
            <span><strong>Ready for Draft/Review:</strong> Partial scores exist. All scores must be entered before Finalization.</span>
          </div>
        ) : (
          <div className="notice notice-success compact-notice">
            <ShieldCheck size={18} />
            <span><strong>Fully Compliant:</strong> Gradebook satisfies all DepEd validation criteria and is ready for Finalization.</span>
          </div>
        )}
      </div>

      <div className="validation-items-list">
        {checks.map((check) => {
          let Icon = CheckCircle2;
          let iconClass = 'text-success';
          let itemClass = 'validation-item-pass';

          if (check.status === 'error') {
            Icon = XCircle;
            iconClass = 'text-danger';
            itemClass = 'validation-item-error';
          } else if (check.status === 'warn') {
            Icon = AlertTriangle;
            iconClass = 'text-warning';
            itemClass = 'validation-item-warn';
          }

          return (
            <div key={check.id} className={`validation-item ${itemClass}`}>
              <div className="validation-item-icon">
                <Icon size={20} className={iconClass} />
              </div>
              <div className="validation-item-content">
                <div className="validation-item-header">
                  <strong>{check.title}</strong>
                  {check.action && (
                    <button
                      type="button"
                      className="btn-link-action"
                      onClick={check.action.onClick}
                    >
                      <Wrench size={14} /> {check.action.label}
                    </button>
                  )}
                </div>
                <p className="validation-item-desc">{check.description}</p>
                {check.hint && <p className="validation-item-hint">{check.hint}</p>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
