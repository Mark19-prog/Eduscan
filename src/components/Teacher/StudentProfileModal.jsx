import { X, Phone, Mail, MapPin } from 'lucide-react';

export default function StudentProfileModal({ student, onClose }) {
  if (!student) return null;

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div className="card animate-fade-in" style={{ width: '600px', maxWidth: '90vw', maxHeight: '90vh', overflowY: 'auto', padding: '32px', position: 'relative' }}>
        
        <button onClick={onClose} className="icon-btn" style={{ position: 'absolute', top: '24px', right: '24px', background: 'var(--bg-color)' }}>
          <X size={20} />
        </button>

        <div style={{ display: 'flex', gap: '24px', marginBottom: '32px' }}>
          <div style={{ width: '100px', height: '100px', borderRadius: '16px', background: 'var(--accent-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
            <img src="/logo.png" alt="Profile placeholder" style={{ width: '100%', height: '100%', objectFit: 'contain', opacity: 0.5 }} />
          </div>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <h2 style={{ margin: '0 0 4px 0', fontSize: '28px' }}>{student.name}</h2>
            <span style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '12px' }}>ID: {student.id} | Grade 10 - Rizal</span>
            <div style={{ display: 'flex', gap: '8px' }}>
              <span className={`tag ${student.absences >= 5 ? 'tag-danger' : 'tag-success'}`}>
                {student.absences} Absences
              </span>
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '32px' }}>
          <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '12px' }}>
            <h3 style={{ fontSize: '14px', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '12px', letterSpacing: '0.05em' }}>Guardian Contact</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><User size={16} color="var(--text-secondary)" /> Maria {student.name.split(', ')[0]}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Phone size={16} color="var(--text-secondary)" /> +63 912 345 6789</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><MapPin size={16} color="var(--text-secondary)" /> Malilipot, Albay</div>
            </div>
          </div>
          
          <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '12px' }}>
            <h3 style={{ fontSize: '14px', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '12px', letterSpacing: '0.05em' }}>Grade Breakdown</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Quizzes (30%)</span> <strong>85%</strong></div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Perf Tasks (50%)</span> <strong>92%</strong></div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Exams (20%)</span> <strong>88%</strong></div>
              <hr style={{ border: 'none', borderTop: '1px solid var(--border-color)', margin: '4px 0' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--accent-blue)' }}><span>Tentative Grade</span> <strong>89%</strong></div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

// Importing User icon which was missing in the file above
import { User } from 'lucide-react';
