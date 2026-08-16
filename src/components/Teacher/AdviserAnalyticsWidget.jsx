import { Users, Clock, FileSpreadsheet } from 'lucide-react';

export default function AdviserAnalyticsWidget({ students = [] }) {
  const present = students.filter((student) => student.timeIn).length;
  const rate = students.length ? Math.round(present / students.length * 100) : 0;
  const pending = students.filter((student) => student.status === 'No scan').length;
  return (
    <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
      
      <div className="card animate-fade-in delay-100" style={{ flex: 1, minWidth: '250px', display: 'flex', alignItems: 'center', gap: '20px' }}>
        <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'var(--success-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--success)' }}>
          <Users size={28} />
        </div>
        <div>
          <h3 style={{ margin: 0, fontSize: '28px', color: 'var(--text-primary)' }}>{rate}%</h3>
          <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Today's Attendance Rate</span>
        </div>
      </div>

      <div className="card animate-fade-in delay-200" style={{ flex: 1, minWidth: '250px', display: 'flex', alignItems: 'center', gap: '20px' }}>
        <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'rgba(245, 159, 0, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f59f00' }}>
          <Clock size={28} />
        </div>
        <div>
          <h3 style={{ margin: 0, fontSize: '28px', color: 'var(--text-primary)' }}>{students.filter((student) => student.status === 'Late').length}</h3>
          <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Tardy Students Today</span>
        </div>
      </div>

      <div className="card animate-fade-in delay-300" style={{ flex: 1, minWidth: '250px', display: 'flex', alignItems: 'center', gap: '20px' }}>
        <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'rgba(2dc653, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-blue)' }}>
          <FileSpreadsheet size={28} />
        </div>
        <div>
          <h3 style={{ margin: 0, fontSize: '28px', color: 'var(--text-primary)' }}>{pending}</h3>
          <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Pending Gate Records</span>
        </div>
      </div>

    </div>
  );
}
