import { useState } from 'react';
import { AlertTriangle, MapPin, Phone, Calendar, Plus } from 'lucide-react';

export default function TruancyInterventions() {
  const [sardoList] = useState([
    { 
      id: '2023-0211', 
      name: 'Cruz, Jonathan', 
      absences: 5, 
      lastAbsence: 'Oct 28, 2026',
      contact: '+63 912 345 6789',
      address: 'Poblacion, Malilipot, Albay',
      logs: [
        { date: 'Oct 25, 2026', type: 'SMS Warning', note: 'Sent automated SMS to parent regarding 3 consecutive absences.' }
      ]
    },
    { 
      id: '2023-0418', 
      name: 'Esteban, Paulo', 
      absences: 6, 
      lastAbsence: 'Oct 29, 2026',
      contact: '+63 998 765 4321',
      address: 'San Jose, Malilipot, Albay',
      logs: [
        { date: 'Oct 20, 2026', type: 'Parent Conference', note: 'Mother visited the school. Discussed financial issues causing absences.' },
        { date: 'Oct 26, 2026', type: 'Home Visitation', note: 'Conducted home visit with Guidance Counselor. Student promised to return.' }
      ]
    }
  ]);

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(220, 38, 38, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--danger)' }}>
              <AlertTriangle size={24} />
            </div>
            Truancy Interventions (SARDO)
          </h1>
          <p style={{ margin: '8px 0 0 56px', color: 'var(--text-secondary)' }}>Track and manage Students at Risk of Dropping Out (5+ absences).</p>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {sardoList.map(student => (
          <div key={student.id} className="card" style={{ display: 'flex', gap: '32px', borderLeft: '4px solid var(--danger)' }}>
            
            {/* Student Info */}
            <div style={{ flex: '1', minWidth: '300px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                <div>
                  <h2 style={{ margin: '0 0 4px 0', fontSize: '20px' }}>{student.name}</h2>
                  <span style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>ID: {student.id}</span>
                </div>
                <span className="tag tag-danger">{student.absences} Consecutive Absences</span>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '14px', color: 'var(--text-secondary)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Calendar size={16} /> Last Absence: {student.lastAbsence}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Phone size={16} /> {student.contact}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><MapPin size={16} /> {student.address}</div>
              </div>
            </div>

            {/* Intervention Logs */}
            <div style={{ flex: '2', background: '#f8fafc', borderRadius: '12px', padding: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ margin: 0, fontSize: '16px' }}>Intervention History</h3>
                <button className="btn-secondary" style={{ padding: '6px 12px', fontSize: '12px', display: 'flex', gap: '6px', alignItems: 'center' }}>
                  <Plus size={14} /> Log New Intervention
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {student.logs.map((log, index) => (
                  <div key={index} style={{ background: 'white', padding: '16px', borderRadius: '8px', border: '1px solid var(--border-color)', display: 'flex', gap: '16px' }}>
                    <div style={{ width: '8px', background: 'var(--secondary-color)', borderRadius: '99px' }}></div>
                    <div>
                      <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '4px' }}>
                        <strong style={{ fontSize: '14px' }}>{log.type}</strong>
                        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{log.date}</span>
                      </div>
                      <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.4 }}>{log.note}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        ))}
      </div>

    </div>
  );
}
