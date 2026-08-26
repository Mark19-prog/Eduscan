import { useEffect, useMemo, useState } from 'react';
import { Calculator, CheckCircle2, Download, FileText, History, LockKeyhole, Plus, Save, Trash2, UnlockKeyhole } from 'lucide-react';
import { api, auth } from '../../api/client';

const defaultComponents = [
  { id: 'quizzes', label: 'Quizzes', weight: 30, assessments: [{ id: 'quiz-1', label: 'Quiz 1', max_score: 20 }] },
  { id: 'summative', label: 'Summative Tests', weight: 50, assessments: [{ id: 'summative-1', label: 'Summative 1', max_score: 50 }] },
  { id: 'periodic', label: 'Periodic Tests', weight: 20, assessments: [{ id: 'periodic-1', label: 'Periodic 1', max_score: 50 }] },
];

function transmuteGrade(initialGrade) {
  const grade = Math.max(0, Math.min(100, Number(initialGrade) || 0));
  if (grade >= 100) return 100;
  if (grade >= 60) return Math.floor((grade - 60 + 1e-9) / 1.6) + 75;
  return Math.floor((grade + 1e-9) / 4) + 60;
}

export default function GradingModule({ students, onStudentClick, classKey = '10-rizal-math', schoolYear = '2026-2027', quarter = 1, subject = 'Unspecified', grade = '10', section = 'Rizal' }) {
  const canEdit = ['admin', 'teacher'].includes(auth.role());
  const [components, setComponents] = useState(defaultComponents);
  const [passingGrade, setPassingGrade] = useState(75);
  const [manualOverall, setManualOverall] = useState(false);
  const [saved, setSaved] = useState(false);
  const [grades, setGrades] = useState({});
  const [statuses, setStatuses] = useState({});
  const [bookStatus, setBookStatus] = useState('Draft');
  const [error, setError] = useState('');
  const [changeReason, setChangeReason] = useState('');
  const [audit, setAudit] = useState([]);

  useEffect(() => {
    const accessQuery = `?grade=${encodeURIComponent(grade)}&section=${encodeURIComponent(section)}`;
    api.get(`/gradebook/${encodeURIComponent(classKey)}${accessQuery}`).then((book) => {
      if (!book.components.length) return;
      const groups = new Map();
      let hasManual = false;
      let manualId = null;
      book.components.forEach((item) => {
        if (item.category === 'Manual Overall') { hasManual = true; manualId = item.id; return; }
        const group = groups.get(item.category) || { id: item.category.toLowerCase().replace(/[^a-z0-9]+/g, '-'), label: item.category, weight: 0, assessments: [] };
        group.weight += Number(item.weight);
        group.assessments.push({ id: item.id, label: item.label, max_score: Number(item.max_score) });
        groups.set(item.category, group);
      });
      const loadedScores = Object.fromEntries(Object.entries(book.scores || {}).map(([personId, scoreMap]) => [personId, {
        ...scoreMap, ...(manualId && scoreMap[manualId] !== undefined ? { manualOverall: scoreMap[manualId] } : {}),
      }]));
      const loadedStatuses = Object.fromEntries(Object.entries(book.score_statuses || {}).map(([personId, statusMap]) => [personId, {
        ...statusMap, ...(manualId && statusMap[manualId] ? { manualOverall: statusMap[manualId] } : {}),
      }]));
      setComponents([...groups.values()]); setPassingGrade(book.passing_grade || 75); setManualOverall(hasManual);
      setGrades(loadedScores); setStatuses(loadedStatuses); setBookStatus(book.status || 'Draft');
    }).catch((err) => setError(err.message));
    api.get(`/gradebook/${encodeURIComponent(classKey)}/audit${accessQuery}`).then(setAudit).catch(() => setAudit([]));
  }, [classKey, grade, section]);

  const weightTotal = useMemo(() => components.reduce((sum, item) => sum + Number(item.weight), 0), [components]);
  const assessmentCount = components.reduce((sum, item) => sum + item.assessments.length, 0);

  const addAssessment = (componentId) => {
    setComponents((current) => current.map((component) => {
      if (component.id !== componentId) return component;
      const count = component.assessments.length + 1;
      const prefix = { quizzes: 'Quiz', summative: 'Summative Test', periodic: 'Periodic Test' }[componentId] || component.label;
      return { ...component, assessments: [...component.assessments, { id: `${componentId}-${crypto.randomUUID()}`, label: `${prefix} ${count}`, max_score: 20 }] };
    }));
  };

  const addOverall = () => setManualOverall((value) => !value);
  const updateScore = (studentId, field, value) => setGrades((current) => ({ ...current, [studentId]: { ...current[studentId], [field]: value } }));
  const updateStatus = (studentId, field, value) => setStatuses((current) => ({ ...current, [studentId]: { ...current[studentId], [field]: value } }));
  const updateComponent = (componentId, field, value) => setComponents((current) => current.map((item) => item.id === componentId ? { ...item, [field]: value } : item));
  const updateAssessment = (componentId, assessmentId, field, value) => setComponents((current) => current.map((component) => component.id === componentId ? {
    ...component, assessments: component.assessments.map((assessment) => assessment.id === assessmentId ? { ...assessment, [field]: value } : assessment),
  } : component));
  const removeAssessment = (componentId, assessmentId) => setComponents((current) => current.map((component) => component.id === componentId ? { ...component, assessments: component.assessments.filter((item) => item.id !== assessmentId) } : component));

  const calculate = (studentId) => {
    const studentGrades = grades[studentId] || {};
    const studentStatuses = statuses[studentId] || {};
    if (manualOverall && studentGrades.manualOverall !== '' && studentGrades.manualOverall !== undefined) {
      if ((studentStatuses.manualOverall || 'Scored') !== 'Scored') return { initial: null, transmuted: null, manual: true };
      const initial = (Number(studentGrades.manualOverall) / 100) * 100;
      return { initial, transmuted: transmuteGrade(initial), manual: true };
    }
    if (weightTotal !== 100) return { initial: null, transmuted: null, manual: false };
    if (components.some((component) => component.assessments.some((assessment) =>
      (studentStatuses[assessment.id] || (studentGrades[assessment.id] === '' || studentGrades[assessment.id] === undefined ? 'Missing' : 'Scored')) !== 'Scored'))) {
      return { initial: null, transmuted: null, manual: false };
    }
    const initial = components.reduce((total, component) => total + component.assessments.reduce((componentTotal, assessment) => {
      const percentage = (Number(studentGrades[assessment.id]) / Number(assessment.max_score)) * 100;
      const assessmentWeight = Number(component.weight) / component.assessments.length;
      return componentTotal + percentage * (assessmentWeight / 100);
    }, 0), 0);
    return { initial, transmuted: transmuteGrade(initial), manual: false };
  };

  const saveGradebook = async () => {
    setError(''); setSaved(false);
    if (changeReason.trim().length < 8) return setError('Enter a specific grade-change reason of at least 8 characters.');
    const flat = components.flatMap((component) => component.assessments.map((assessment) => ({
      id: assessment.id, category: component.label, label: assessment.label,
      weight: Number(component.weight) / component.assessments.length, max_score: Number(assessment.max_score),
    })));
    if (manualOverall) flat.push({ id: 'manualOverall', category: 'Manual Overall', label: 'Overall Grade', weight: 0, max_score: 100 });
    try { await api.put(`/gradebook/${encodeURIComponent(classKey)}`, { class_key: classKey, school_year: schoolYear, quarter, subject, grade, section, change_reason: changeReason.trim(), passing_grade: passingGrade, components: flat, scores: grades, score_statuses: statuses }); setSaved(true); setChangeReason(''); setAudit(await api.get(`/gradebook/${encodeURIComponent(classKey)}/audit?grade=${encodeURIComponent(grade)}&section=${encodeURIComponent(section)}`)); }
    catch (err) { setError(err.message); }
  };

  const gradeAction = async (action) => {
    setError('');
    if (changeReason.trim().length < 8) return setError(`Enter a specific reason before ${action === 'finalize' ? 'finalizing' : 'reopening'} this gradebook.`);
    try {
      await api.post(`/gradebook/${encodeURIComponent(classKey)}/${action}`, { reason: changeReason.trim() });
      setBookStatus(action === 'finalize' ? 'Finalized' : 'Draft'); setChangeReason('');
    } catch (err) { setError(err.message); }
  };

  const reportQuery = `?grade=${encodeURIComponent(grade)}&section=${encodeURIComponent(section)}`;

  return (
    <div className="page-stack">
      <section className="card-static">
        <div className="section-heading">
          <div><p className="eyebrow">Teacher-configurable · {bookStatus}</p><h2>Grade components & passing rule</h2></div>
          <Calculator size={24} />
        </div>
        <p className="section-copy">Scores are normalized to 100, weighted into an initial grade, then converted using the DepEd transmutation table requested for this capstone. Keep weights at exactly 100%.</p>
        <div className="component-config-grid">
          {components.map((component) => (
            <div className="component-config" key={component.id}>
              <label><span className="field-label">Component name</span><input className="input-field" disabled={!canEdit || bookStatus === 'Finalized'} value={component.label} onChange={(event) => updateComponent(component.id, 'label', event.target.value)} /></label>
              <label><span className="field-label">Weight (%)</span><input className="input-field" disabled={!canEdit || bookStatus === 'Finalized'} type="number" min="0" max="100" value={component.weight} onChange={(event) => updateComponent(component.id, 'weight', Number(event.target.value))} /></label>
            </div>
          ))}
          <label className="component-config"><span className="field-label">Passing transmuted grade</span><input className="input-field" type="number" min="60" max="100" value={passingGrade} onChange={(event) => setPassingGrade(Number(event.target.value))} /></label>
        </div>
        <div className={`weight-meter ${weightTotal === 100 ? 'weight-valid' : 'weight-invalid'}`}><span style={{ width: `${Math.min(weightTotal, 100)}%` }} /><strong>{weightTotal}% total</strong></div>
        <div className="action-row component-actions">
          {canEdit && <><button className="btn-secondary" disabled={bookStatus === 'Finalized'} onClick={() => addAssessment('quizzes')}><Plus size={16} /> Add quiz</button>
          <button className="btn-secondary" disabled={bookStatus === 'Finalized'} onClick={() => addAssessment('summative')}><Plus size={16} /> Add summative test</button>
          <button className="btn-secondary" disabled={bookStatus === 'Finalized'} onClick={() => addAssessment('periodic')}><Plus size={16} /> Add periodic test</button>
          <button className={manualOverall ? 'btn-primary' : 'btn-secondary'} disabled={bookStatus === 'Finalized'} onClick={addOverall}><Plus size={16} /> {manualOverall ? 'Manual overall input shown' : 'Add overall grade input'}</button></>}
          <input className="input-field" aria-label="Grade change reason" placeholder="Required reason for this grade save" value={changeReason} onChange={(event) => setChangeReason(event.target.value)} />
          {canEdit && <button className="btn-primary" onClick={saveGradebook} disabled={bookStatus === 'Finalized' || weightTotal !== 100 || changeReason.trim().length < 8}><Save size={16} /> Save gradebook</button>}
          {canEdit && bookStatus !== 'Finalized' && <button className="btn-secondary" onClick={() => gradeAction('finalize')} disabled={changeReason.trim().length < 8}><LockKeyhole size={16} /> Finalize & lock</button>}
          {bookStatus === 'Finalized' && ['admin', 'records_officer'].includes(auth.role()) && <button className="btn-secondary" onClick={() => gradeAction('reopen')} disabled={changeReason.trim().length < 8}><UnlockKeyhole size={16} /> Reopen with reason</button>}
          <button className="btn-secondary" onClick={() => api.download(`/gradebook/${encodeURIComponent(classKey)}/report.xlsx${reportQuery}`, 'grading-summary.xlsx').catch((err) => setError(err.message))}><Download size={16} /> Export XLSX</button>
          <button className="btn-secondary" onClick={() => api.printHtml(`/gradebook/${encodeURIComponent(classKey)}/report/print${reportQuery}`).catch((err) => setError(err.message))}><FileText size={16} /> Printable summary</button>
        </div>
        {saved && <div className="notice notice-success compact-notice"><CheckCircle2 size={17} /> Grading components and scores saved to the database.</div>}
        {error && <div className="notice notice-danger compact-notice">{error}</div>}
      </section>

      <section className="card-static">
        <div className="section-heading"><div><p className="eyebrow">Attributable changes</p><h2>Gradebook audit history</h2></div><History size={22} /></div>
        <div className="table-scroll"><table className="interactive-table"><thead><tr><th>Date</th><th>School year</th><th>Quarter</th><th>Subject</th><th>Actor</th><th>Reason</th></tr></thead><tbody>{audit.length === 0 && <tr><td colSpan="6" className="empty-cell">No grade changes recorded for this gradebook.</td></tr>}{audit.map((item) => <tr key={item.id}><td>{new Date(item.created_at).toLocaleString('en-PH')}</td><td>{item.school_year}</td><td>{item.quarter}</td><td>{item.subject}</td><td>{item.actor_name}</td><td>{item.reason}</td></tr>)}</tbody></table></div>
      </section>

      <section className="card-static">
        <div className="section-heading"><div><p className="eyebrow">{assessmentCount} score input(s) per learner</p><h2>Interactive grading sheet</h2></div></div>
        <div className="table-scroll">
          <table className="interactive-table grade-table">
            <thead>
              <tr><th rowSpan="2">Student</th>{components.map((component) => <th colSpan={Math.max(component.assessments.length, 1)} key={component.id}>{component.label} ({component.weight}%)</th>)}{manualOverall && <th rowSpan="2">Manual overall</th>}<th rowSpan="2">Initial grade</th><th rowSpan="2">Transmuted grade</th><th rowSpan="2">Result</th></tr>
              <tr>{components.flatMap((component) => component.assessments.length ? component.assessments.map((assessment) => <th key={assessment.id}><div className="assessment-header"><input className="grade-input" aria-label="Assessment label" disabled={!canEdit || bookStatus === 'Finalized'} value={assessment.label} onChange={(event) => updateAssessment(component.id, assessment.id, 'label', event.target.value)} /><label className="muted-small">Highest score<input className="grade-input" type="number" min="1" disabled={!canEdit || bookStatus === 'Finalized'} value={assessment.max_score} onChange={(event) => updateAssessment(component.id, assessment.id, 'max_score', Number(event.target.value))} /></label>{component.assessments.length > 1 && canEdit && <button disabled={bookStatus === 'Finalized'} title="Remove input" onClick={() => removeAssessment(component.id, assessment.id)}><Trash2 size={12} /></button>}</div></th>) : [<th key={`${component.id}-empty`}>No input</th>])}</tr>
            </thead>
            <tbody>
              {students.map((student) => {
                const result = calculate(student.id);
                return (
                  <tr key={student.id}>
                    <td className="student-cell" onClick={() => onStudentClick?.(student)}><strong>{student.name}</strong><span>{student.id}</span></td>
                    {components.flatMap((component) => component.assessments.length ? component.assessments.map((assessment) => <td key={assessment.id}><input className="grade-input" type="number" min="0" max={assessment.max_score} disabled={!canEdit || bookStatus === 'Finalized' || (statuses[student.id]?.[assessment.id] || 'Scored') !== 'Scored'} value={grades[student.id]?.[assessment.id] ?? ''} onChange={(event) => updateScore(student.id, assessment.id, event.target.value)} /><select className="grade-status-select" disabled={!canEdit || bookStatus === 'Finalized'} value={statuses[student.id]?.[assessment.id] || (grades[student.id]?.[assessment.id] === '' || grades[student.id]?.[assessment.id] === undefined ? 'Missing' : 'Scored')} onChange={(event) => updateStatus(student.id, assessment.id, event.target.value)}><option>Scored</option><option>Missing</option><option>Excused</option><option>Incomplete</option></select></td>) : [<td key={`${component.id}-empty`}>—</td>])}
                    {manualOverall && <td><input className="grade-input manual-input" type="number" min="0" max="100" disabled={!canEdit || bookStatus === 'Finalized' || (statuses[student.id]?.manualOverall || 'Scored') !== 'Scored'} value={grades[student.id]?.manualOverall ?? ''} onChange={(event) => updateScore(student.id, 'manualOverall', event.target.value)} /><select className="grade-status-select" disabled={!canEdit || bookStatus === 'Finalized'} value={statuses[student.id]?.manualOverall || 'Scored'} onChange={(event) => updateStatus(student.id, 'manualOverall', event.target.value)}><option>Scored</option><option>Missing</option><option>Excused</option><option>Incomplete</option></select></td>}
                    <td><strong>{result.initial === null ? 'Weights ≠ 100' : result.initial.toFixed(2)}</strong>{result.manual && <span className="muted-small">Manual</span>}</td>
                    <td className="final-grade">{result.transmuted ?? '—'}</td>
                    <td><span className={`tag ${result.transmuted >= passingGrade ? 'tag-success' : 'tag-danger'}`}>{result.transmuted === null ? 'Pending' : result.transmuted >= passingGrade ? 'Passed' : 'Below rule'}</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="card-static">
        <h2>Transmutation reference</h2>
        <p className="section-copy">Examples from the requested table: initial 100 → 100; 98.40–99.99 → 99; 60.00–61.59 → 75; 56.00–59.99 → 74; 0–3.99 → 60. This module applies the full piecewise table to every computed initial grade.</p>
        <a className="text-link" href="https://www.teacherph.com/transmutation-table/" target="_blank" rel="noreferrer">Open the transmutation table source</a>
      </section>
    </div>
  );
}
