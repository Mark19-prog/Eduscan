import { useEffect, useMemo, useState } from 'react';
import { Users, Search, Phone, MoreVertical } from 'lucide-react';
import StudentProfileModal from '../../components/Teacher/StudentProfileModal';
import { api, localDate } from '../../api/client';
import { useToast } from '../../contexts/ToastContext';

export default function MyAdvisory() {
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [students, setStudents] = useState([]);
  const [query, setQuery] = useState('');
  const { showError } = useToast();
  useEffect(() => { Promise.all([api.get('/persons?role=Student'), api.get(`/attendance?date=${localDate()}`)]).then(([people, attendance]) => setStudents(people.map((person) => ({ ...person, name: person.full_name, attendance: attendance.find((row) => row.person_id === person.id) })))).catch((err) => showError(err.message)); }, [showError]);
  const roster = useMemo(() => students.filter((student) => `${student.full_name} ${student.lrn || ''}`.toLowerCase().includes(query.toLowerCase())), [students, query]);
  return <div className="page-stack animate-fade-in">    <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}><div style={{ position: 'relative', width: '300px' }}><Search size={16} style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)' }} /><input className="input-field" style={{ paddingLeft: 40 }} placeholder="Search name or LRN" value={query} onChange={(e) => setQuery(e.target.value)} /></div></div><div className="card-static table-scroll"><table className="interactive-table"><thead><tr><th>Student</th><th>LRN / ID</th><th>Grade & section</th><th>Today</th><th>Parent contact</th><th /></tr></thead><tbody>{roster.length === 0 && <tr><td colSpan="6" className="empty-cell">No registered learners found.</td></tr>}{roster.map((student) => <tr key={student.id} onClick={() => setSelectedStudent(student)}><td><strong>{student.full_name}</strong></td><td>{student.lrn || student.external_id}</td><td>Grade {student.grade} — {student.section}</td><td><span className={`tag ${student.attendance?.status === 'Absent' ? 'tag-danger' : student.attendance?.status === 'Late' ? 'tag-warning' : student.attendance?.time_in ? 'tag-success' : 'tag-gray'}`}>{student.attendance?.status || 'No scan'}</span></td><td><span className="status-inline"><Phone size={14} /> {student.guardian_phone || 'Not recorded'}</span></td><td><button className="icon-btn" onClick={(e) => { e.stopPropagation(); setSelectedStudent(student); }}><MoreVertical size={18} /></button></td></tr>)}</tbody></table></div><StudentProfileModal student={selectedStudent} onClose={() => setSelectedStudent(null)} /></div>;
}
