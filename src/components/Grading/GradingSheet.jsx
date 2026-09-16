import React, { useState, useMemo, useRef } from 'react';
import { Search, Filter, HelpCircle, AlertCircle, Calculator, ChevronDown, Check, ArrowUpDown } from 'lucide-react';
import { calculateStudentGrade } from '../../services/gradingCalculations';

export default function GradingSheet({
  students = [],
  components = [],
  scores = {},
  scoreStatuses = {},
  passingGrade = 75,
  transmutationTable = null,
  disabled = false,
  onScoreChange,
  onStatusChange,
  onStudentBreakdown,
}) {
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('All'); // 'All' | 'Passing' | 'Below Passing' | 'Incomplete'
  const [sortBy, setSortBy] = useState('name'); // 'name' | 'grade'

  // Ref grid for keyboard arrow navigation: inputs keyed by `${studentIndex}-${itemIndex}`
  const inputRefs = useRef(new Map());

  // Flattened assessment items list for column generation
  const flatItems = useMemo(() => {
    return components.flatMap((c) =>
      (c.items || []).map((item) => ({
        ...item,
        componentId: c.id,
        componentName: c.name,
        componentWeight: c.weight,
      }))
    );
  }, [components]);

  // Compute calculated values per student in real-time
  const computedStudents = useMemo(() => {
    return students.map((student, studentIdx) => {
      const studentIdStr = String(student.person_id);
      const studentScoreMap = scores[studentIdStr] || {};
      const studentStatusMap = scoreStatuses[studentIdStr] || {};

      const formattedScores = flatItems.map((item) => ({
        itemId: item.id,
        score: studentScoreMap[item.id] !== undefined ? studentScoreMap[item.id] : student.scores?.[item.id],
        status: studentStatusMap[item.id] || student.score_statuses?.[item.id] || 'Scored',
      }));

      const calc = calculateStudentGrade({
        studentScores: formattedScores,
        components,
        transmutationTable,
        passingGrade,
      });

      return {
        ...student,
        studentIdx,
        liveScores: studentScoreMap,
        liveStatuses: studentStatusMap,
        calc,
      };
    });
  }, [students, scores, scoreStatuses, flatItems, components, transmutationTable, passingGrade]);

  // Filter and Sort
  const displayedStudents = useMemo(() => {
    let list = computedStudents.filter((s) => {
      if (filterStatus === 'Passing' && s.calc.status !== 'Passing') return false;
      if (filterStatus === 'Below Passing' && s.calc.status !== 'Below Passing') return false;
      if (filterStatus === 'Incomplete' && s.calc.status !== 'Incomplete') return false;

      if (!search.trim()) return true;
      const term = search.toLowerCase();
      return (
        s.full_name.toLowerCase().includes(term) ||
        (s.lrn && s.lrn.toLowerCase().includes(term)) ||
        (s.external_id && s.external_id.toLowerCase().includes(term))
      );
    });

    if (sortBy === 'grade') {
      list.sort((a, b) => (b.calc.reportedGrade || 0) - (a.calc.reportedGrade || 0));
    } else {
      list.sort((a, b) => a.full_name.localeCompare(b.full_name));
    }

    return list;
  }, [computedStudents, filterStatus, search, sortBy]);

  // Keyboard navigation handler
  const handleKeyDown = (e, rowIdx, colIdx) => {
    let nextRow = rowIdx;
    let nextCol = colIdx;

    if (e.key === 'ArrowDown' || e.key === 'Enter') {
      e.preventDefault();
      nextRow = Math.min(displayedStudents.length - 1, rowIdx + 1);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      nextRow = Math.max(0, rowIdx - 1);
    } else if (e.key === 'ArrowRight' && e.target.selectionStart === e.target.value.length) {
      if (colIdx < flatItems.length - 1) {
        nextCol = colIdx + 1;
      }
    } else if (e.key === 'ArrowLeft' && e.target.selectionStart === 0) {
      if (colIdx > 0) {
        nextCol = colIdx - 1;
      }
    }

    if (nextRow !== rowIdx || nextCol !== colIdx) {
      const targetInput = inputRefs.current.get(`${nextRow}-${nextCol}`);
      if (targetInput) {
        targetInput.focus();
        targetInput.select();
      }
    }
  };

  return (
    <section className="card-static grading-sheet-section">
      <div className="section-heading">
        <div>
          <p className="eyebrow">{displayedStudents.length} of {students.length} Learners Enrolled</p>
          <h2>Interactive Grading Sheet</h2>
        </div>

        {/* Filter and Search Bar */}
        <div className="sheet-controls">
          <div className="search-box">
            <Search size={15} className="search-icon" />
            <input
              type="text"
              className="input-field input-sm"
              placeholder="Search learner or LRN..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="filter-group">
            <button
              type="button"
              className={`pill-filter ${filterStatus === 'All' ? 'pill-filter-active' : ''}`}
              onClick={() => setFilterStatus('All')}
            >
              All
            </button>
            <button
              type="button"
              className={`pill-filter ${filterStatus === 'Passing' ? 'pill-filter-active' : ''}`}
              onClick={() => setFilterStatus('Passing')}
            >
              Passing
            </button>
            <button
              type="button"
              className={`pill-filter ${filterStatus === 'Below Passing' ? 'pill-filter-active' : ''}`}
              onClick={() => setFilterStatus('Below Passing')}
            >
              Below Passing
            </button>
            <button
              type="button"
              className={`pill-filter ${filterStatus === 'Incomplete' ? 'pill-filter-active' : ''}`}
              onClick={() => setFilterStatus('Incomplete')}
            >
              Incomplete
            </button>

            <button
              type="button"
              className="btn-link-action ml-2"
              title="Toggle Sort Order"
              onClick={() => setSortBy((cur) => (cur === 'name' ? 'grade' : 'name'))}
            >
              <ArrowUpDown size={14} /> Sort: {sortBy === 'name' ? 'Name (A-Z)' : 'Grade (High-Low)'}
            </button>
          </div>
        </div>
      </div>

      {/* Spreadsheet Table Container */}
      <div className="grading-sheet-scroll table-scroll">
        <table className="interactive-table grading-sheet-table">
          <thead>
            {/* Top Tier: Student and Component Headers */}
            <tr className="header-tier-1">
              <th rowSpan={2} className="sticky-col sticky-col-1 student-col-header">
                Learner (Full Name & LRN)
              </th>
              <th rowSpan={2} className="text-center sex-col-header">
                Sex
              </th>

              {components.map((comp) => {
                const itemCount = (comp.items || []).length;
                return (
                  <th
                    key={comp.id}
                    colSpan={Math.max(itemCount, 1)}
                    className="component-group-header"
                  >
                    <div className="comp-header-title">
                      <span>{comp.name}</span>
                      <span className="comp-weight-tag">{comp.weight}%</span>
                    </div>
                  </th>
                );
              })}

              <th rowSpan={2} className="text-right initial-grade-header">
                Initial Grade
              </th>
              <th rowSpan={2} className="text-right reported-grade-header">
                Quarterly Grade
              </th>
              <th rowSpan={2} className="text-center status-col-header">
                Remarks
              </th>
              <th rowSpan={2} className="text-center action-col-header">
                Calculation
              </th>
            </tr>

            {/* Bottom Tier: Assessment Items */}
            <tr className="header-tier-2">
              {components.flatMap((comp) => {
                const items = comp.items || [];
                if (items.length === 0) {
                  return (
                    <th key={`${comp.id}-empty`} className="item-header empty-item-header">
                      No Activities
                    </th>
                  );
                }
                return items.map((item) => (
                  <th key={item.id} className="item-header">
                    <div className="item-header-content" title={item.label}>
                      <span className="item-label">{item.label}</span>
                      <span className="item-max-score">Max: {item.max_score}</span>
                    </div>
                  </th>
                ));
              })}
            </tr>
          </thead>

          <tbody>
            {displayedStudents.length === 0 ? (
              <tr>
                <td colSpan={flatItems.length + 6} className="empty-cell">
                  No learners match the current filter or search criteria.
                </td>
              </tr>
            ) : (
              displayedStudents.map((student, rowIdx) => {
                const isPassing = student.calc.status === 'Passing';
                const isIncomplete = student.calc.status === 'Incomplete';
                let colCounter = 0;

                return (
                  <tr key={student.person_id} className="grading-row">
                    {/* Sticky Student Column */}
                    <td className="sticky-col sticky-col-1 student-identity-cell">
                      <div className="student-identity-wrap">
                        <span className="student-name" title={student.full_name}>
                          {student.full_name}
                        </span>
                        <span className="student-subtext">
                          {student.lrn ? `LRN: ${student.lrn}` : student.external_id || `ID: ${student.person_id}`}
                        </span>
                      </div>
                    </td>

                    {/* Sex */}
                    <td className="text-center sex-cell">
                      <span className="muted-small">{student.sex ? student.sex.charAt(0) : '—'}</span>
                    </td>

                    {/* Score Cells */}
                    {components.flatMap((comp) => {
                      const items = comp.items || [];
                      if (items.length === 0) {
                        return (
                          <td key={`${comp.id}-empty-cell`} className="empty-score-cell text-center">
                            —
                          </td>
                        );
                      }

                      return items.map((item) => {
                        const itemCol = colCounter++;
                        const currentVal =
                          student.liveScores[item.id] !== undefined
                            ? student.liveScores[item.id]
                            : student.scores?.[item.id] ?? '';
                        const currentStatus =
                          student.liveStatuses[item.id] ||
                          student.score_statuses?.[item.id] ||
                          (currentVal === '' ? 'Missing' : 'Scored');

                        const isScored = currentStatus === 'Scored';
                        const isOverMax = isScored && Number(currentVal) > item.max_score;
                        const isNegative = isScored && Number(currentVal) < 0;
                        const hasError = isOverMax || isNegative;

                        return (
                          <td
                            key={item.id}
                            className={`score-entry-cell ${hasError ? 'score-cell-error' : ''}`}
                          >
                            <div className="score-input-container">
                              <input
                                ref={(el) => {
                                  if (el) inputRefs.current.set(`${rowIdx}-${itemCol}`, el);
                                  else inputRefs.current.delete(`${rowIdx}-${itemCol}`);
                                }}
                                type="number"
                                step="0.5"
                                min="0"
                                max={item.max_score}
                                className={`score-input font-mono ${hasError ? 'input-error' : ''}`}
                                disabled={disabled || !isScored}
                                value={currentVal}
                                placeholder={!isScored ? currentStatus : '—'}
                                onChange={(e) =>
                                  onScoreChange?.(student.person_id, item.id, e.target.value)
                                }
                                onKeyDown={(e) => handleKeyDown(e, rowIdx, itemCol)}
                                title={
                                  hasError
                                    ? `Score must be between 0 and ${item.max_score}`
                                    : `${item.label} (Max: ${item.max_score})`
                                }
                              />

                              {/* Mini Status Pill / Selector */}
                              {!disabled && (
                                <select
                                  className="score-status-mini-select"
                                  value={currentStatus}
                                  onChange={(e) =>
                                    onStatusChange?.(student.person_id, item.id, e.target.value)
                                  }
                                  title="Change score status (Scored, Missing, Excused, Incomplete)"
                                >
                                  <option value="Scored">Scored</option>
                                  <option value="Missing">Missing</option>
                                  <option value="Excused">Excused</option>
                                  <option value="Incomplete">Incomplete</option>
                                </select>
                              )}
                            </div>
                          </td>
                        );
                      });
                    })}

                    {/* Initial Grade */}
                    <td className="text-right font-mono initial-grade-cell">
                      {student.calc.initialGrade != null ? (
                        student.calc.initialGrade.toFixed(2)
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                    </td>

                    {/* Reported (Transmuted) Grade */}
                    <td className="text-right font-mono final-grade-cell">
                      <strong>
                        {student.calc.reportedGrade != null ? (
                          student.calc.reportedGrade
                        ) : (
                          <span className="text-muted">—</span>
                        )}
                      </strong>
                    </td>

                    {/* Remarks Tag */}
                    <td className="text-center remarks-cell">
                      <span
                        className={`tag ${isPassing
                            ? 'tag-success'
                            : isIncomplete
                              ? 'tag-warning'
                              : 'tag-danger'
                          }`}
                      >
                        {student.calc.status}
                      </span>
                    </td>

                    {/* Calculation breakdown modal button */}
                    <td className="text-center action-cell">
                      <button
                        type="button"
                        className="btn-icon-sm"
                        title="View step-by-step DepEd computation formula"
                        onClick={() => onStudentBreakdown?.(student.person_id)}
                      >
                        <Calculator size={14} />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
