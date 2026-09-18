import { useEffect, useState, useCallback, useMemo } from 'react';
import { api, auth } from '../../api/client';
import GradebookContext from '../../components/Grading/GradebookContext';
import GradebookSummary from '../../components/Grading/GradebookSummary';
import GradebookActions from '../../components/Grading/GradebookActions';
import GradingSheet from '../../components/Grading/GradingSheet';
import AssessmentConfig from '../../components/Grading/AssessmentConfig';
import CalculationBreakdown from '../../components/Grading/CalculationBreakdown';
import AuditHistory from '../../components/Grading/AuditHistory';
import AdjustmentRequestsModal from '../../components/Grading/AdjustmentRequestsModal';
import ValidationChecklist from '../../components/Grading/ValidationChecklist';
import GlobalAdjustmentsTab from '../../components/Grading/GlobalAdjustmentsTab';
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { useToast } from '../../contexts/ToastContext';

export default function Grading() {
  const [structure, setStructure] = useState({
    school_years: [],
    grading_periods: [],
    grade_levels: [],
    sections: [],
    subjects: [],
  });

  // Selector state
  const [schoolYearId, setSchoolYearId] = useState('');
  const [quarter, setQuarter] = useState(1);
  const [gradeId, setGradeId] = useState('');
  const [sectionId, setSectionId] = useState('');
  const [subjectId, setSubjectId] = useState('');

  // Active Gradebook data from API
  const [gradebookId, setGradebookId] = useState(null);
  const [fullGradebook, setFullGradebook] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const { showSuccess, showError } = useToast();

  // Unsaved score & status changes
  const [scoreEdits, setScoreEdits] = useState({});
  const [statusEdits, setStatusEdits] = useState({});
  const [isDirty, setIsDirty] = useState(false);

  // Modal / drawer states
  const [showConfig, setShowConfig] = useState(false);
  const [showAudit, setShowAudit] = useState(false);
  const [showAdjustments, setShowAdjustments] = useState(false);
  const [showValidation, setShowValidation] = useState(false);
  const [breakdownData, setBreakdownData] = useState(null);
  const [auditList, setAuditList] = useState([]);
  const [adjustmentsList, setAdjustmentsList] = useState([]);

  // Navigation State
  const [activeTab, setActiveTab] = useState('gradebook');

  // 1. Initial Load: Academic Structure
  useEffect(() => {
    api
      .get('/admin/academic-structure?context=grading')
      .then((data) => {
        setStructure(data);

        const activeYear = data.school_years?.find((y) => y.active) || data.school_years?.[0];
        if (activeYear) setSchoolYearId(activeYear.id);

        const activeGrade = data.grade_levels?.find((g) => g.active) || data.grade_levels?.[0];
        if (activeGrade) {
          setGradeId(activeGrade.id);
          const firstSection = data.sections?.find((s) => s.grade_level_id === activeGrade.id && s.active);
          if (firstSection) setSectionId(firstSection.id);
        }

        const activeSubject = data.subjects?.find((s) => s.active) || data.subjects?.[0];
        if (activeSubject) setSubjectId(activeSubject.id);
      })
      .catch((err) => showError(err.message));
  }, [showError]);


  // Filter sections when selected grade changes
  const availableSections = useMemo(() => {
    return (structure.sections || [])
      .filter((s) => !gradeId || s.grade_level_id === Number(gradeId))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [structure.sections, gradeId]);

  const sortedSchoolYears = useMemo(() => {
    return [...(structure.school_years || [])].sort((a, b) => b.name.localeCompare(a.name));
  }, [structure.school_years]);

  const sortedGradeLevels = useMemo(() => {
    return [...(structure.grade_levels || [])].sort((a, b) => {
      const numA = Number(a.name);
      const numB = Number(b.name);
      if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
      return a.name.localeCompare(b.name);
    });
  }, [structure.grade_levels]);

  const sortedSubjects = useMemo(() => {
    return [...(structure.subjects || [])].sort((a, b) => a.name.localeCompare(b.name));
  }, [structure.subjects]);

  // When gradeId changes, ensure valid sectionId
  useEffect(() => {
    if (availableSections.length > 0 && (!sectionId || !availableSections.some((s) => s.id === Number(sectionId)))) {
      setSectionId(availableSections[0].id);
    }
  }, [gradeId, availableSections, sectionId]);

  // Match grading_period_id for selected quarter & school year
  const gradingPeriodId = useMemo(() => {
    const period = (structure.grading_periods || []).find(
      (p) => p.school_year_id === Number(schoolYearId) && p.quarter === Number(quarter)
    );
    return period ? period.id : (structure.grading_periods?.[0]?.id || 1);
  }, [structure.grading_periods, schoolYearId, quarter]);

  // 2. Fetch or Create Gradebook
  const loadGradebook = useCallback(async () => {
    if (!schoolYearId || !gradeId || !sectionId || !subjectId) return;

    setLoading(true);
    setScoreEdits({});
    setStatusEdits({});
    setIsDirty(false);

    try {
      // Find or create gradebook
      const res = await api.post('/gradebooks', {
        school_year_id: Number(schoolYearId),
        grading_period_id: Number(gradingPeriodId),
        grade_level_id: Number(gradeId),
        section_id: Number(sectionId),
        subject_id: Number(subjectId),
      });

      const gbId = res.id;
      setGradebookId(gbId);

      // Load full gradebook data
      const full = await api.get(`/gradebooks/${gbId}`);
      setFullGradebook(full);
    } catch (err) {
      showError(err.message);
      setFullGradebook(null);
      setGradebookId(null);
    } finally {
      setLoading(false);
    }
  }, [schoolYearId, gradingPeriodId, gradeId, sectionId, subjectId]);

  useEffect(() => {
    loadGradebook();
  }, [loadGradebook]);

  // 3. Handle Score and Status Edits in Memory
  const handleScoreChange = (studentId, itemId, value) => {
    const sId = String(studentId);
    setScoreEdits((prev) => ({
      ...prev,
      [sId]: {
        ...(prev[sId] || {}),
        [itemId]: value,
      },
    }));
    setIsDirty(true);
  };

  const handleStatusChange = (studentId, itemId, status) => {
    const sId = String(studentId);
    setStatusEdits((prev) => ({
      ...prev,
      [sId]: {
        ...(prev[sId] || {}),
        [itemId]: status,
      },
    }));
    // If status changed to non-Scored, clear the entered score
    if (status !== 'Scored') {
      setScoreEdits((prev) => ({
        ...prev,
        [sId]: {
          ...(prev[sId] || {}),
          [itemId]: '',
        },
      }));
    }
    setIsDirty(true);
  };

  // 4. Save Draft
  const handleSaveDraft = async (silent = false) => {
    if (!gradebookId || !fullGradebook) return false;

    setSaving(true);

    try {
      // Format payload for /api/gradebooks/{id}/scores
      const payloadScores = {};
      const allStudents = fullGradebook.students || [];

      for (const student of allStudents) {
        const sId = String(student.person_id);
        const editedStudentScores = scoreEdits[sId] || {};
        const editedStudentStatuses = statusEdits[sId] || {};

        // Only include if modified or if we want to preserve
        const studentEntries = [];
        for (const comp of fullGradebook.components || []) {
          for (const item of comp.items || []) {
            const rawScore =
              editedStudentScores[item.id] !== undefined
                ? editedStudentScores[item.id]
                : student.scores?.[item.id];
            const explicitStatus = editedStudentStatuses[item.id] || student.score_statuses?.[item.id];
            const isEmptyScore = rawScore === '' || rawScore === undefined || rawScore === null;
            const rawStatus = isEmptyScore 
              ? (explicitStatus === 'Excused' ? 'Excused' : 'Missing') 
              : 'Scored';

            studentEntries.push({
              assessment_item_id: item.id,
              score: rawStatus === 'Scored' && rawScore !== '' && rawScore !== null && rawScore !== undefined
                ? Number(rawScore)
                : null,
              status: rawStatus,
            });
          }
        }
        payloadScores[sId] = studentEntries;
      }

      await api.put(`/gradebooks/${gradebookId}/scores`, {
        scores: payloadScores,
        change_reason: 'Teacher saved draft gradebook updates',
      });

      if (!silent) showSuccess('Gradebook draft and student scores saved successfully.');
      setIsDirty(false);
      setScoreEdits({});
      setStatusEdits({});

      // Reload gradebook calculations from authority
      const refreshed = await api.get(`/gradebooks/${gradebookId}`);
      setFullGradebook(refreshed);
      return true;
    } catch (err) {
      showError(err.message);
      if (silent) throw err;
      return false;
    } finally {
      setSaving(false);
    }
  };

  // 5. Update Assessment Components & Items
  const handleSaveComponents = async (updatedComponents, changeReason) => {
    if (!gradebookId) return;
    setSaving(true);
    try {
      await api.put(`/gradebooks/${gradebookId}/components`, {
        components: updatedComponents,
        change_reason: changeReason,
      });
      setShowConfig(false);
      showSuccess('Assessment components and activities updated successfully.');
      // Refresh
      const refreshed = await api.get(`/gradebooks/${gradebookId}`);
      setFullGradebook(refreshed);
      setScoreEdits({});
      setStatusEdits({});
      setIsDirty(false);
    } catch (err) {
      showError(err.message);
    } finally {
      setSaving(false);
    }
  };

  // 6. Workflow Transitions
  const handleSubmitGradebook = async (reason) => {
    if (!gradebookId) return;
    if (isDirty) {
      await handleSaveDraft(true);
    }
    setSaving(true);
    try {
      await api.post(`/gradebooks/${gradebookId}/submit`, { reason });
      showSuccess('Gradebook submitted for administrative review.');
      const refreshed = await api.get(`/gradebooks/${gradebookId}`);
      setFullGradebook(refreshed);
    } catch (err) {
      showError(err.message);
      throw err;
    } finally {
      setSaving(false);
    }
  };

  const handleFinalizeGradebook = async (reason) => {
    if (!gradebookId) return;
    if (isDirty) {
      await handleSaveDraft(true);
    }
    setSaving(true);
    try {
      await api.post(`/gradebooks/${gradebookId}/finalize`, { reason });
      showSuccess('Gradebook finalized! Quarterly grades have been officially computed.');
      const refreshed = await api.get(`/gradebooks/${gradebookId}`);
      setFullGradebook(refreshed);
    } catch (err) {
      showError(err.message);
      throw err;
    } finally {
      setSaving(false);
    }
  };

  const handleLockGradebook = async (reason) => {
    if (!gradebookId) return;
    setSaving(true);
    try {
      await api.post(`/gradebooks/${gradebookId}/lock`, { reason });
      showSuccess('Gradebook locked and archived.');
      const refreshed = await api.get(`/gradebooks/${gradebookId}`);
      setFullGradebook(refreshed);
    } catch (err) {
      showError(err.message);
      throw err;
    } finally {
      setSaving(false);
    }
  };

  const handleReopenGradebook = async (reason) => {
    if (!gradebookId) return;
    setSaving(true);
    try {
      await api.post(`/gradebooks/${gradebookId}/reopen`, { reason });
      showSuccess('Gradebook reopened into Draft status.');
      const refreshed = await api.get(`/gradebooks/${gradebookId}`);
      setFullGradebook(refreshed);
    } catch (err) {
      showError(err.message);
      throw err;
    } finally {
      setSaving(false);
    }
  };

  // 7. Audit and Adjustments Fetchers
  const handleOpenAudit = async () => {
    if (!gradebookId) return;
    try {
      const data = await api.get(`/gradebooks/${gradebookId}/audit`);
      setAuditList(data);
      setShowAudit(true);
    } catch (err) {
      showError(err.message);
    }
  };

  const handleOpenAdjustments = async () => {
    if (!gradebookId) return;
    try {
      const data = await api.get(`/gradebooks/${gradebookId}/adjustments`);
      setAdjustmentsList(data);
      setShowAdjustments(true);
    } catch (err) {
      showError(err.message);
    }
  };

  // 8. Breakdown Modal Fetcher
  const handleStudentBreakdown = async (personId) => {
    if (!gradebookId) return;
    try {
      const data = await api.get(`/gradebooks/${gradebookId}/calculation/${personId}`);
      setBreakdownData(data);
    } catch (err) {
      showError(err.message);
    }
  };

  // 9. Export & Print Handlers
  const handleExportXlsx = async () => {
    if (!gradebookId || !fullGradebook) return;
    const gb = fullGradebook.gradebook;
    const filename = `Gradebook-${gb.grade_name}-${gb.section_name}-${gb.subject_name}-Q${gb.quarter}.xlsx`;
    try {
      await api.download(`/gradebooks/${gradebookId}/report.xlsx`, filename);
    } catch (err) {
      showError(err.message);
    }
  };

  const handlePrintReport = async () => {
    if (!gradebookId) return;
    try {
      await api.printHtml(`/gradebooks/${gradebookId}/report/print`);
    } catch (err) {
      showError(err.message);
    }
  };

  const gb = fullGradebook?.gradebook;  // Teachers edit in Draft mode. Admins are read-only.
  const isEditable = gb && gb.status === 'Draft' && auth.role() === 'teacher';

  return (
    <div className="page-stack">


      {/* Tab Navigation */}
      <div className="setup-tabs mb-4">
        <button
          className={activeTab === 'gradebook' ? 'active' : ''}
          onClick={() => setActiveTab('gradebook')}
        >
          Gradebook
        </button>
        <button
          className={activeTab === 'metrics' ? 'active' : ''}
          onClick={() => setActiveTab('metrics')}
        >
          Class Performance Metrics
        </button>
        {auth.role() === 'admin' && (
          <button
            className={activeTab === 'adjustments' ? 'active' : ''}
            onClick={() => setActiveTab('adjustments')}
          >
            Adjustment Requests
          </button>
        )}
      </div>

      {activeTab === 'adjustments' && (
        <GlobalAdjustmentsTab />
      )}

      {(activeTab === 'gradebook' || activeTab === 'metrics') && (
        <>
          {/* Academic Selector Bar */}
          <section className="card-static compact-settings-card mt-2">
            <div className="compact-settings-grid">
              <label className="compact-setting-item">
                <span className="compact-label">School Year</span>
                <select
                  className="compact-select"
                  value={schoolYearId}
                  onChange={(e) => setSchoolYearId(Number(e.target.value))}
                >
                  {sortedSchoolYears.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="compact-setting-item">
                <span className="compact-label">Quarter</span>
                <select
                  className="compact-select"
                  value={quarter}
                  onChange={(e) => setQuarter(Number(e.target.value))}
                >
                  {[1, 2, 3, 4].map((q) => (
                    <option key={q} value={q}>
                      Quarter {q}
                    </option>
                  ))}
                </select>
              </label>

              <label className="compact-setting-item">
                <span className="compact-label">Grade Level</span>
                <select
                  className="compact-select"
                  value={gradeId}
                  onChange={(e) => setGradeId(Number(e.target.value))}
                >
                  {sortedGradeLevels.map((item) => (
                    <option key={item.id} value={item.id}>
                      Grade {item.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="compact-setting-item">
                <span className="compact-label">Section</span>
                <select
                  className="compact-select"
                  value={sectionId}
                  onChange={(e) => setSectionId(Number(e.target.value))}
                >
                  {availableSections.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="compact-setting-item">
                <span className="compact-label">Subject</span>
                <select
                  className="compact-select"
                  value={subjectId}
                  onChange={(e) => setSubjectId(Number(e.target.value))}
                >
                  {sortedSubjects.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </section>

          {/* Loading indicator */}
          {loading && (
            <div className="loading-state-card card-static text-center py-8">
              <Loader2 size={32} className="spin text-primary mx-auto mb-2" />
              <p className="text-muted">Loading gradebook and assessment records...</p>
            </div>
          )}

          {/* Main Gradebook Workspace */}
          {!loading && fullGradebook && (
            <>
              {/* Header Context Card */}
              <GradebookContext
                gradebook={fullGradebook.gradebook}
                policyName={fullGradebook.gradebook?.policy_name}
              />

              {activeTab === 'metrics' && (
                <GradebookSummary
                  statistics={fullGradebook.statistics}
                  passingGrade={fullGradebook.gradebook?.passing_grade || 75}
                />
              )}

              {activeTab === 'gradebook' && (
                <>
                  {/* Validation Checklist Panel (when toggled) */}
                  {showValidation && (
                    <ValidationChecklist
                      components={fullGradebook.components}
                      students={fullGradebook.students}
                      status={fullGradebook.gradebook?.status}
                      passingGrade={fullGradebook.gradebook?.passing_grade || 75}
                      onOpenConfig={() => setShowConfig(true)}
                      onClose={() => setShowValidation(false)}
                    />
                  )}

                  {/* Interactive Spreadsheet Sheet */}
                  <GradingSheet
                    students={fullGradebook.students}
                    components={fullGradebook.components}
                    scores={scoreEdits}
                    scoreStatuses={statusEdits}
                    passingGrade={fullGradebook.gradebook?.passing_grade || 75}
                    transmutationTable={fullGradebook.policy?.transmutation_table}
                    disabled={!isEditable}
                    onScoreChange={handleScoreChange}
                    onStatusChange={handleStatusChange}
                    onStudentBreakdown={handleStudentBreakdown}
                  />

                  {/* Action Toolbar */}
                  <GradebookActions
                    gradebook={fullGradebook.gradebook}
                    isDirty={isDirty}
                    isSaving={saving}
                    onSaveDraft={handleSaveDraft}
                    onOpenConfig={() => setShowConfig(true)}
                    onSubmit={handleSubmitGradebook}
                    onFinalize={handleFinalizeGradebook}
                    onLock={handleLockGradebook}
                    onReopen={handleReopenGradebook}
                    onOpenAudit={handleOpenAudit}
                    onOpenAdjustments={handleOpenAdjustments}
                    onToggleValidation={() => setShowValidation((prev) => !prev)}
                    onExportXlsx={handleExportXlsx}
                    onPrintReport={handlePrintReport}
                    disabled={loading || saving}
                  />
                </>
              )}
            </>
          )}

          {/* Assessment Component Setup Modal */}
          {showConfig && fullGradebook && (
            <AssessmentConfig
              components={fullGradebook.components}
              onSave={handleSaveComponents}
              onClose={() => setShowConfig(false)}
              disabled={saving}
            />
          )}

          {/* Step-by-Step Calculation Breakdown Modal */}
          {breakdownData && (
            <CalculationBreakdown
              breakdown={breakdownData}
              onClose={() => setBreakdownData(null)}
            />
          )}

          {/* Audit History Log Modal */}
          {showAudit && (
            <AuditHistory
              audit={auditList}
              onClose={() => setShowAudit(false)}
              onRefresh={handleOpenAudit}
            />
          )}

          {/* Post-Finalization Grade Adjustment Requests Modal */}
          {showAdjustments && fullGradebook && (
            <AdjustmentRequestsModal
              gradebookId={gradebookId}
              students={fullGradebook.students}
              components={fullGradebook.components}
              adjustments={adjustmentsList}
              onClose={() => setShowAdjustments(false)}
              onRefresh={handleOpenAdjustments}
            />
          )}
        </>
      )}
    </div>
  );
}
