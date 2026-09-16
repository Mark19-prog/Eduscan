import React, { useState } from 'react';
import {
  Save,
  Sliders,
  Send,
  CheckCircle2,
  Lock,
  Unlock,
  Download,
  FileText,
  History,
  ShieldAlert,
  ClipboardCheck,
  Loader2,
} from 'lucide-react';
import { auth } from '../../api/client';

export default function GradebookActions({
  gradebook,
  isDirty = false,
  isSaving = false,
  onSaveDraft,
  onOpenConfig,
  onSubmit,
  onFinalize,
  onLock,
  onReopen,
  onOpenAudit,
  onOpenAdjustments,
  onToggleValidation,
  onExportXlsx,
  onPrintReport,
  disabled = false,
}) {
  const userRole = auth.role();
  const canEdit = ['admin', 'teacher'].includes(userRole);
  const isAdminOrOfficer = ['admin', 'records_officer'].includes(userRole);

  const status = gradebook?.status || 'Draft';
  const isDraft = status === 'Draft';
  const isSubmitted = status === 'Submitted';
  const isFinalized = status === 'Finalized';
  const isLocked = status === 'Locked';

  // Action dialog state
  const [activeDialog, setActiveDialog] = useState(null); // 'submit' | 'finalize' | 'lock' | 'reopen'
  const [reasonInput, setReasonInput] = useState('');
  const [dialogError, setDialogError] = useState('');

  const openActionDialog = (type) => {
    setActiveDialog(type);
    setReasonInput('');
    setDialogError('');
  };

  const handleConfirmAction = async () => {
    if (reasonInput.trim().length < 8) {
      setDialogError('Please provide a specific justification of at least 8 characters.');
      return;
    }

    try {
      if (activeDialog === 'submit') await onSubmit?.(reasonInput.trim());
      else if (activeDialog === 'finalize') await onFinalize?.(reasonInput.trim());
      else if (activeDialog === 'lock') await onLock?.(reasonInput.trim());
      else if (activeDialog === 'reopen') await onReopen?.(reasonInput.trim());
      setActiveDialog(null);
    } catch (err) {
      setDialogError(err.message || 'Action failed');
    }
  };

  return (
    <div className="gradebook-actions-bar card-static">
      <div className="action-row flex-wrap items-center">
        {/* Primary Editing Actions */}
        {canEdit && isDraft && (
          <>
            <button
              type="button"
              className={`btn ${isDirty ? 'btn-primary' : 'btn-secondary'}`}
              onClick={onSaveDraft}
              disabled={disabled || isSaving}
              title={isDirty ? 'Save pending changes to database' : 'All changes saved'}
            >
              {isSaving ? <Loader2 size={16} className="spin" /> : <Save size={16} />}
              <span>{isSaving ? 'Saving...' : isDirty ? 'Save Draft *' : 'Save Draft'}</span>
            </button>

            <button
              type="button"
              className="btn btn-secondary"
              onClick={onOpenConfig}
              disabled={disabled || isSaving}
              title="Configure components, activities, and weights"
            >
              <Sliders size={16} />
              <span>Assessment Setup</span>
            </button>
          </>
        )}

        {/* Workflow: Submit for review */}
        {canEdit && isDraft && (
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => openActionDialog('submit')}
            disabled={disabled || isSaving}
            title="Submit gradebook for coordinator / admin review"
          >
            <Send size={16} />
            <span>Submit Gradebook</span>
          </button>
        )}

        {/* Workflow: Finalize */}
        {canEdit && (isDraft || isSubmitted) && (
          <button
            type="button"
            className="btn btn-success"
            onClick={() => openActionDialog('finalize')}
            disabled={disabled || isSaving}
            title="Finalize grades (computes official quarterly ratings)"
          >
            <CheckCircle2 size={16} />
            <span>Finalize & Compute</span>
          </button>
        )}

        {/* Workflow: Lock / Archive (Admin only) */}
        {isAdminOrOfficer && isFinalized && (
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => openActionDialog('lock')}
            disabled={disabled}
            title="Lock and archive gradebook"
          >
            <Lock size={16} />
            <span>Lock Gradebook</span>
          </button>
        )}

        {/* Workflow: Reopen with audited reason (Admin / Records Officer) */}
        {isAdminOrOfficer && (isFinalized || isLocked) && (
          <button
            type="button"
            className="btn btn-warning"
            onClick={() => openActionDialog('reopen')}
            disabled={disabled}
            title="Reopen gradebook with mandatory justification"
          >
            <Unlock size={16} />
            <span>Reopen Gradebook</span>
          </button>
        )}

        {/* Workflow: Post-Finalization Adjustment Requests */}
        {(isFinalized || isLocked) && (
          <button
            type="button"
            className="btn btn-secondary text-primary"
            onClick={onOpenAdjustments}
            title="Request or review post-finalization grade adjustments"
          >
            <ShieldAlert size={16} />
            <span>Grade Adjustments</span>
          </button>
        )}

        <div className="action-divider" />

        {/* Validation Checklist Toggle */}
        <button
          type="button"
          className="btn btn-secondary"
          onClick={onToggleValidation}
          title="Run pre-flight validation checklist"
        >
          <ClipboardCheck size={16} />
          <span>Validation</span>
        </button>

        {/* Export & Reports */}
        <button
          type="button"
          className="btn btn-secondary"
          onClick={onExportXlsx}
          title="Download Excel spreadsheet (XLSX)"
        >
          <Download size={16} />
          <span>Export XLSX</span>
        </button>

        <button
          type="button"
          className="btn btn-secondary"
          onClick={onPrintReport}
          title="Open printable summary report"
        >
          <FileText size={16} />
          <span>Print Summary</span>
        </button>

        {/* Audit History */}
        <button
          type="button"
          className="btn btn-secondary"
          onClick={onOpenAudit}
          title="View full audit log of all changes"
        >
          <History size={16} />
          <span>Audit Log</span>
        </button>
      </div>

      {/* Workflow Action Confirmation Dialog */}
      {activeDialog && (
        <div className="modal-backdrop">
          <div className="modal-card modal-sm">
            <div className="modal-header">
              <h3>
                {activeDialog === 'submit' && 'Submit Gradebook'}
                {activeDialog === 'finalize' && 'Finalize Gradebook'}
                {activeDialog === 'lock' && 'Lock Gradebook'}
                {activeDialog === 'reopen' && 'Authorized Reopen'}
              </h3>
            </div>

            <div className="modal-body">
              <p className="text-muted text-sm mb-3">
                {activeDialog === 'submit' &&
                  'Submitting this gradebook indicates all scores have been reviewed and is awaiting administrative finalization.'}
                {activeDialog === 'finalize' &&
                  'Finalizing permanently calculates official quarterly ratings. Direct score edits will be locked. All learners must have complete scores.'}
                {activeDialog === 'lock' &&
                  'Locking archives this gradebook. No further adjustments can be made without explicit reopening.'}
                {activeDialog === 'reopen' &&
                  'Reopening reverts the gradebook to Draft status. An explicit, auditable reason is required.'}
              </p>

              {dialogError && (
                <div className="notice notice-danger compact-notice mb-3">{dialogError}</div>
              )}

              <div className="form-group">
                <label className="field-label">
                  Official Justification / Reason <span className="text-danger">*</span>
                </label>
                <textarea
                  className="input-field"
                  rows={3}
                  placeholder={`Reason for ${activeDialog}ing this gradebook... (min 8 characters)`}
                  value={reasonInput}
                  onChange={(e) => setReasonInput(e.target.value)}
                  autoFocus
                />
              </div>
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setActiveDialog(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className={`btn ${activeDialog === 'reopen'
                    ? 'btn-warning'
                    : activeDialog === 'finalize'
                      ? 'btn-success'
                      : 'btn-primary'
                  }`}
                onClick={handleConfirmAction}
                disabled={reasonInput.trim().length < 8}
              >
                Confirm {activeDialog.charAt(0).toUpperCase() + activeDialog.slice(1)}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
