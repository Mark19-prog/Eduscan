import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Download, FileSpreadsheet, ShieldCheck, Upload } from 'lucide-react';
import { api, auth, localDate } from '../../api/client';

export default function SF2ReportGenerator() {
  const [month, setMonth] = useState(localDate().slice(0, 7));
  const [grade, setGrade] = useState('10');
  const [section, setSection] = useState('Rizal');
  const [schoolId, setSchoolId] = useState('');
  const [schoolYear, setSchoolYear] = useState('2026-2027');
  const [students, setStudents] = useState([]);
  const [todayRows, setTodayRows] = useState([]);
  const [template, setTemplate] = useState({ configured: false });
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const [people, attendance, status] = await Promise.all([api.get(`/persons?role=Student&grade=${encodeURIComponent(grade)}&section=${encodeURIComponent(section)}`), api.get(`/attendance?date=${localDate()}`), api.get('/sf2/template')]);
      setStudents(people); setTodayRows(attendance.filter((row) => row.role === 'Student' && row.grade === grade && row.section === section)); setTemplate(status);
    } catch (err) { setError(err.message); }
  }, [grade, section]);
  useEffect(() => { load(); }, [load]);
  const male = students.filter((student) => student.sex === 'Male').length;
  const female = students.filter((student) => student.sex === 'Female').length;
  const overflow = male > 21 || female > 25;
  const sections = useMemo(() => [...new Set(students.map((student) => student.section).filter(Boolean))], [students]);

  const upload = async (event) => {
    const file = event.target.files?.[0]; if (!file) return;
    const form = new FormData(); form.append('file', file);
    try { await api.post('/sf2/template', form); setNotice('Official SF2 template uploaded and validated.'); await load(); } catch (err) { setError(err.message); }
  };
  const exportFile = async () => {
    const [year, monthNumber] = month.split('-').map(Number);
    const query = new URLSearchParams({ year, month: monthNumber, grade, section, school_id: schoolId, school_year: schoolYear, school_name: 'SAN JOSE NATIONAL HIGH SCHOOL' });
    try { await api.download(`/sf2/export?${query}`, `SF2-${month}-${grade}-${section}.xlsx`); setNotice('SF2 workbook generated. The records officer must verify it before submission.'); } catch (err) { setError(err.message); }
  };

  return <div className="page-stack">
    <section className="card-static"><div className="section-heading"><div><p className="eyebrow">Official XLSX generation</p><h2>SF2 monthly attendance report</h2></div><FileSpreadsheet size={28} /></div><p className="section-copy">EduScan copies the official workbook, places learners into the correct male/female block, writes school-day marks, monthly totals, and produces a separate downloadable XLSX.</p>
      {error && <div className="notice notice-danger"><AlertTriangle size={18} /> {error}</div>}{notice && <div className="notice notice-success"><ShieldCheck size={18} /> {notice}</div>}
      <div className="form-grid three-columns"><label><span className="field-label">Reporting month</span><input className="input-field" type="month" value={month} onChange={(e) => setMonth(e.target.value)} /></label><label><span className="field-label">Grade</span><input className="input-field" value={grade} onChange={(e) => setGrade(e.target.value)} /></label><label><span className="field-label">Section</span><input className="input-field" list="section-options" value={section} onChange={(e) => setSection(e.target.value)} /><datalist id="section-options">{sections.map((item) => <option key={item}>{item}</option>)}</datalist></label><label><span className="field-label">School ID</span><input className="input-field" value={schoolId} onChange={(e) => setSchoolId(e.target.value)} /></label><label><span className="field-label">School year</span><input className="input-field" value={schoolYear} onChange={(e) => setSchoolYear(e.target.value)} /></label></div>
      <div className="sf2-map-grid"><div><span>Learner placement</span><strong>Male rows 14–34</strong><strong>Female rows 36–60</strong></div><div><span>School-day marks</span><strong>D–AB · blank = present</strong><strong>X = absent · upper shade = tardy</strong></div><div><span>Monthly totals</span><strong>AC = absent</strong><strong>AD = tardy</strong></div></div>
      {overflow ? <div className="notice notice-danger"><AlertTriangle size={18} /> Roster exceeds template capacity ({male}/21 male, {female}/25 female). Generation is blocked to prevent wrong placement.</div> : <div className="notice notice-success"><ShieldCheck size={18} /> Placement check passed: {male} male learner(s), {female} female learner(s).</div>}
      <div className="action-row">{auth.role() === 'admin' && <label className="btn-secondary"><Upload size={17} /> {template.configured ? `Replace ${template.filename}` : 'Upload official SF2 template'}<input type="file" accept=".xlsx" onChange={upload} hidden /></label>}<button className="btn-secondary" onClick={() => api.download(`/attendance/temporary-log?date=${localDate()}`, `attendance-${localDate()}.xlsx`).catch((err) => setError(err.message))}><Download size={17} /> Download temporary log</button><button className="btn-primary" disabled={overflow || !template.configured || !month} onClick={exportFile}><Download size={17} /> Generate official SF2 XLSX</button></div>
    </section>
    <section className="card-static"><h2>Current-day placement preview</h2><p className="section-copy">“No scan” remains pending until authorized daily close or correction; it is not silently converted to absent.</p><div className="table-scroll"><table className="interactive-table"><thead><tr><th>SF2 row</th><th>Learner</th><th>Sex block</th><th>Today</th><th>Template mark</th></tr></thead><tbody>{todayRows.map((student) => { const block = todayRows.filter((item) => item.sex === student.sex).sort((a, b) => a.full_name.localeCompare(b.full_name)); const row = (student.sex === 'Male' ? 14 : 36) + block.findIndex((item) => item.person_id === student.person_id); const mark = student.status === 'Absent' ? 'X' : student.status === 'Late' ? 'Upper-half shade' : student.status === 'Present' || student.status === 'Time Out' ? 'Blank' : 'Pending'; return <tr key={student.person_id}><td><strong>{row}</strong></td><td>{student.full_name}</td><td>{student.sex}</td><td>{student.status}</td><td>{mark}</td></tr>; })}</tbody></table></div></section>
  </div>;
}
