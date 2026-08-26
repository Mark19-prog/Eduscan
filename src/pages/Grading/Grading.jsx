import { useEffect, useState } from 'react';
import GradingModule from '../../components/Teacher/GradingModule';
import { api } from '../../api/client';

export default function Grading() {
  const [grade, setGrade] = useState('10');
  const [section, setSection] = useState('Rizal');
  const [subject, setSubject] = useState('Mathematics');
  const [schoolYear, setSchoolYear] = useState('2026-2027');
  const [quarter, setQuarter] = useState(1);
  const [structure, setStructure] = useState({ school_years: [], grade_levels: [], sections: [], subjects: [] });
  const [students, setStudents] = useState([]);
  const [error, setError] = useState('');
  useEffect(() => { api.get('/admin/academic-structure').then((data) => {
    setStructure(data);
    const activeYear = data.school_years.find((item) => item.active) || data.school_years[0];
    if (activeYear) setSchoolYear(activeYear.name);
    const firstGrade = data.grade_levels.find((item) => item.active) || data.grade_levels[0];
    if (firstGrade) {
      setGrade(firstGrade.name);
      const firstSection = data.sections.find((item) => item.active && item.grade_level_id === firstGrade.id);
      if (firstSection) setSection(firstSection.name);
    }
    const firstSubject = data.subjects.find((item) => item.active) || data.subjects[0];
    if (firstSubject) setSubject(firstSubject.name);
  }).catch((err) => setError(err.message)); }, []);
  useEffect(() => { api.get(`/persons?role=Student&grade=${encodeURIComponent(grade)}&section=${encodeURIComponent(section)}`).then((rows) => setStudents(rows.map((person) => ({ ...person, id: person.id, name: person.full_name })))).catch((err) => setError(err.message)); }, [grade, section]);
  const classKey = `${schoolYear}-q${quarter}-${grade}-${section}-${subject}`.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const gradeRecord = structure.grade_levels.find((item) => item.name === grade);
  const availableSections = structure.sections.filter((item) => !gradeRecord || item.grade_level_id === gradeRecord.id);
  return <div className="page-stack"><div className="page-heading"><div><p className="eyebrow">Persistent grade records</p><h1>Grading management</h1><p>Organize gradebooks by school year, quarter, grade, section, and subject.</p></div></div>{error && <div className="notice notice-danger">{error}</div>}<section className="card-static"><div className="form-grid three-columns">
    <label><span className="field-label">School year</span><select className="input-field" value={schoolYear} onChange={(e) => setSchoolYear(e.target.value)}>{structure.school_years.map((item) => <option key={item.id}>{item.name}</option>)}</select></label>
    <label><span className="field-label">Quarter</span><select className="input-field" value={quarter} onChange={(e) => setQuarter(Number(e.target.value))}>{[1,2,3,4].map((item) => <option key={item} value={item}>Quarter {item}</option>)}</select></label>
    <label><span className="field-label">Grade</span><select className="input-field" value={grade} onChange={(e) => setGrade(e.target.value)}>{structure.grade_levels.map((item) => <option key={item.id}>{item.name}</option>)}</select></label>
    <label><span className="field-label">Section</span><select className="input-field" value={section} onChange={(e) => setSection(e.target.value)}>{availableSections.map((item) => <option key={item.id}>{item.name}</option>)}</select></label>
    <label><span className="field-label">Subject</span><select className="input-field" value={subject} onChange={(e) => setSubject(e.target.value)}>{structure.subjects.map((item) => <option key={item.id}>{item.name}</option>)}</select></label>
  </div></section><GradingModule key={classKey} students={students} classKey={classKey} schoolYear={schoolYear} quarter={quarter} subject={subject} grade={grade} section={section} /></div>;
}
