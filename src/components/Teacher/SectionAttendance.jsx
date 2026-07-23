import { Search, CheckCircle, XCircle } from 'lucide-react';

export default function SectionAttendance({ students, isLocked, onStudentClick }) {
  return (
    <div className="card animate-fade-in delay-200">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h2 style={{ fontSize: '18px', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
          Today's Roster & Overrides
        </h2>
        <div style={{ position: 'relative', width: '300px' }}>
          <Search size={16} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input type="text" placeholder="Search student name..." className="input-field" style={{ paddingLeft: '40px', background: '#f8fafc' }} />
        </div>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table className="interactive-table">
          <thead>
            <tr>
              <th>Student Name</th>
              <th>Automated Gate Scan</th>
              <th>Teacher Override (SF2)</th>
              <th>DepEd SF2 Remarks</th>
            </tr>
          </thead>
          <tbody>
            {students.map(student => (
              <tr key={student.id}>
                <td style={{ fontWeight: 500, color: 'var(--text-primary)', cursor: 'pointer' }} onClick={() => onStudentClick(student)}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--accent-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-blue)', fontSize: '12px', fontWeight: 'bold' }}>
                      {student.name.charAt(0)}
                    </div>
                    {student.name}
                  </div>
                </td>
                
                {/* Gate Status */}
                <td>
                  {student.gate === 'Present' ? (
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--success)', fontWeight: 500, fontSize: '13px' }}>
                      <CheckCircle size={14} /> Logged at 7:15 AM
                    </span>
                  ) : (
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--danger)', fontWeight: 500, fontSize: '13px' }}>
                      <XCircle size={14} /> No Scan Record
                    </span>
                  )}
                </td>
                
                {/* Override Dropdown */}
                <td>
                  <select 
                    className="input-field" 
                    style={{ 
                      padding: '6px 12px', 
                      width: '160px', 
                      fontSize: '13px',
                      borderColor: student.override === 'Cutting Classes' ? 'var(--warning)' : student.override === 'Absent' ? 'var(--danger)' : 'var(--border-color)',
                      color: student.override === 'Cutting Classes' ? '#b45309' : 'inherit'
                    }}
                    defaultValue={student.override}
                    disabled={isLocked}
                  >
                    <option value="Present">Present</option>
                    <option value="Absent">Absent</option>
                    <option value="Cutting Classes">Cutting Classes</option>
                  </select>
                </td>

                {/* Remarks Dropdown */}
                <td>
                  <select 
                    className="input-field" 
                    style={{ padding: '6px 12px', width: '200px', fontSize: '13px' }}
                    defaultValue={student.remark}
                    disabled={isLocked || student.override === 'Present'}
                  >
                    <option value="">-- Select DepEd Code --</option>
                    <option value="Illness">Illness / Health Reason</option>
                    <option value="Family Problem">Family Problem</option>
                    <option value="Distance/Transport">Distance / Transportation</option>
                    <option value="Financial">Financial Constraints</option>
                    <option value="Working">Child Labor / Working</option>
                    <option value="Others">Others (Specify in notes)</option>
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
