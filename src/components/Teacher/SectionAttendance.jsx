import { CheckCircle, FileEdit, Search, XCircle } from 'lucide-react';
import { displayTime } from '../../api/client';

export default function SectionAttendance({ students, isLocked, onStudentClick }) {
  return (
    <div className="card-static animate-fade-in delay-200">
      <div className="section-heading">
        <div><p className="eyebrow">Read-only daily view</p><h2>Today’s roster & gate result</h2></div>
        <div style={{ position: 'relative', width: '300px' }}><Search size={16} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} /><input type="text" placeholder="Search student name..." className="input-field" style={{ paddingLeft: '40px', background: '#f8fafc' }} /></div>
      </div>
      <p className="section-copy">Use the Corrections page to change a record. That workflow preserves the gate event and requires an auditable reason.</p>
      <div className="table-scroll"><table className="interactive-table"><thead><tr><th>Student</th><th>Gate evidence</th><th>Current SF2 status</th><th>Latest reason</th><th>Action</th></tr></thead><tbody>
        {students.map((student) => <tr key={student.id}>
          <td className="student-cell" onClick={() => onStudentClick(student)}><strong>{student.name}</strong><span>{student.id} · {student.sex}</span></td>
          <td>{student.timeIn ? <span className="status-inline success-text"><CheckCircle size={14} /> Time in {displayTime(student.timeIn)}</span> : <span className="status-inline danger-text"><XCircle size={14} /> No time-in scan</span>}</td>
          <td><span className={`tag ${student.override === 'Absent' ? 'tag-danger' : student.override === 'Late' ? 'tag-warning' : 'tag-success'}`}>{student.override}</span></td>
          <td>{student.remark || '—'}</td>
          <td><button className="btn-link" disabled={isLocked} onClick={() => { window.location.href = '/teacher/attendance'; }}><FileEdit size={15} /> Open correction</button></td>
        </tr>)}
      </tbody></table></div>
    </div>
  );
}
