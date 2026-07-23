import { useState } from 'react';
import { Users, Search, Phone, Mail, MoreVertical } from 'lucide-react';
import StudentProfileModal from '../../components/Teacher/StudentProfileModal';

export default function MyAdvisory() {
  const [selectedStudent, setSelectedStudent] = useState(null);
  
  const [roster] = useState([
    { id: '2023-0192', name: 'Alvarez, Marco', status: 'Regular', absences: 1 },
    { id: '2023-0144', name: 'Bautista, Sarah', status: 'Regular', absences: 2 },
    { id: '2023-0211', name: 'Cruz, Jonathan', status: 'SARDO', absences: 5 },
    { id: '2023-0305', name: 'Dela Torre, Mika', status: 'Regular', absences: 0 },
    { id: '2023-0418', name: 'Esteban, Paulo', status: 'SARDO', absences: 6 },
    { id: '2023-0501', name: 'Fernandez, Luis', status: 'Regular', absences: 0 },
    { id: '2023-0522', name: 'Garcia, Maria', status: 'Regular', absences: 1 },
    { id: '2023-0610', name: 'Hernandez, Jose', status: 'Regular', absences: 0 },
  ]);

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'var(--accent-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-blue)' }}>
              <Users size={24} />
            </div>
            My Advisory Class
          </h1>
          <p style={{ margin: '8px 0 0 56px', color: 'var(--text-secondary)' }}>Grade 10 - Rizal | Total Students: 42</p>
        </div>
        
        <div style={{ position: 'relative', width: '300px' }}>
          <Search size={16} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input type="text" placeholder="Search student name or LRN..." className="input-field" style={{ paddingLeft: '40px', background: 'white' }} />
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table className="interactive-table">
          <thead>
            <tr>
              <th style={{ paddingLeft: '24px' }}>Student Info</th>
              <th>LRN</th>
              <th>Status</th>
              <th>Total Absences</th>
              <th>Parent Contact</th>
              <th style={{ textAlign: 'right', paddingRight: '24px' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {roster.map((student, i) => (
              <tr key={student.id} onClick={() => setSelectedStudent(student)} style={{ cursor: 'pointer' }}>
                <td style={{ paddingLeft: '24px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--bg-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', fontWeight: 'bold' }}>
                      {student.name.charAt(0)}
                    </div>
                    <strong style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{student.name}</strong>
                  </div>
                </td>
                <td style={{ color: 'var(--text-secondary)' }}>{student.id}</td>
                <td>
                  <span className={`tag ${student.status === 'SARDO' ? 'tag-danger' : 'tag-success'}`}>
                    {student.status}
                  </span>
                </td>
                <td>
                  <span style={{ fontWeight: 600, color: student.absences >= 5 ? 'var(--danger)' : 'inherit' }}>
                    {student.absences}
                  </span>
                </td>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)', fontSize: '13px' }}>
                    <Phone size={14} /> +63 912 345 6789
                  </div>
                </td>
                <td style={{ textAlign: 'right', paddingRight: '24px' }}>
                  <button className="icon-btn" style={{ display: 'inline-flex', background: 'transparent' }} onClick={(e) => { e.stopPropagation(); setSelectedStudent(student); }}>
                    <MoreVertical size={18} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Re-using the Profile Modal built earlier */}
      <StudentProfileModal student={selectedStudent} onClose={() => setSelectedStudent(null)} />

    </div>
  );
}
