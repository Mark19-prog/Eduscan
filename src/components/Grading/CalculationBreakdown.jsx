import { Calculator, CheckCircle2, HelpCircle, Shield, X, XCircle } from 'lucide-react';

export default function CalculationBreakdown({ breakdown, onClose }) {
  if (!breakdown) return null;

  const isPassing = breakdown.status === 'Passing';
  const isComplete = breakdown.complete;

  return (
    <div className="modal-backdrop">
      <div className="modal-card modal-md">
        <div className="modal-header">
          <div className="breakdown-title-group">
            <div className="breakdown-icon-circle">
              <Calculator size={20} />
            </div>
            <div>
              <h3>Grade Computation Breakdown</h3>
              <p className="modal-subtitle">{breakdown.student_name}</p>
            </div>
          </div>
          <button type="button" className="btn-icon" onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>
        </div>

        <div className="modal-body">
          {/* Policy context card */}
          <div className="breakdown-policy-banner">
            <Shield size={16} />
            <span>
              Governing Policy: <strong>{breakdown.policy_name || 'DepEd K-12 Standard'}</strong>
            </span>
          </div>

          {/* Component breakdown table */}
          <div className="breakdown-table-wrapper">
            <table className="table table-compact breakdown-table">
              <thead>
                <tr>
                  <th>Component</th>
                  <th className="text-right">Earned / Max</th>
                  <th className="text-right">Percentage</th>
                  <th className="text-right">Weight</th>
                  <th className="text-right">Weighted Grade</th>
                </tr>
              </thead>
              <tbody>
                {breakdown.components.map((comp, idx) => (
                  <tr key={idx}>
                    <td>
                      <strong>{comp.name}</strong>
                    </td>
                    <td className="text-right font-mono">
                      {comp.total_score != null ? `${comp.total_score} / ${comp.total_max}` : '—'}
                    </td>
                    <td className="text-right font-mono">
                      {comp.percentage != null ? `${comp.percentage.toFixed(2)}%` : '—'}
                    </td>
                    <td className="text-right font-mono">{comp.weight}%</td>
                    <td className="text-right font-mono font-bold">
                      {comp.weighted_score != null ? comp.weighted_score.toFixed(2) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="breakdown-total-row">
                  <td colSpan="4">
                    <strong>Initial Grade (Sum of Weighted Scores)</strong>
                  </td>
                  <td className="text-right font-mono font-bold text-primary">
                    {breakdown.initial_grade != null ? breakdown.initial_grade.toFixed(2) : 'Incomplete'}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Transmutation / Final Grade highlight */}
          <div className={`breakdown-result-box ${isPassing ? 'result-pass' : !isComplete ? 'result-incomplete' : 'result-fail'}`}>
            <div className="result-main">
              <div className="result-label">Quarterly Reported Grade</div>
              <div className="result-value font-mono">
                {breakdown.reported_grade != null ? breakdown.reported_grade : '—'}
              </div>
            </div>
            <div className="result-meta">
              <div className="result-status-badge">
                {isPassing ? (
                  <>
                    <CheckCircle2 size={16} className="text-success" />
                    <span className="text-success font-bold">Passing</span>
                  </>
                ) : !isComplete ? (
                  <>
                    <HelpCircle size={16} className="text-warning" />
                    <span className="text-warning font-bold">Incomplete Scores</span>
                  </>
                ) : (
                  <>
                    <XCircle size={16} className="text-danger" />
                    <span className="text-danger font-bold">Below Passing</span>
                  </>
                )}
              </div>
              <p className="muted-small">
                Passing Grade Requirement: {breakdown.passing_grade || 75}
              </p>
            </div>
          </div>

          {/* DepEd assessment methodology note */}
          <div className="deped-formula-note">
            <p className="note-title">DepEd K-12 Assessment Methodology (DO 8, s. 2015):</p>
            <ol>
              <li>
                <strong>Total-over-Total Method:</strong> Component % = (Total Earned Points ÷ Total Possible Points) × 100
              </li>
              <li>
                <strong>Weighted Component:</strong> Percentage × Component Weight %
              </li>
              <li>
                <strong>Initial Grade:</strong> Sum of all weighted component scores
              </li>
              <li>
                <strong>Quarterly Grade:</strong> Converted using the official Transmutation Table
              </li>
            </ol>
          </div>
        </div>

        <div className="modal-footer">
          <button type="button" className="btn btn-primary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
