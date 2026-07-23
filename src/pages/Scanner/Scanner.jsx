import { useState } from 'react';
import { Camera, UserPlus } from 'lucide-react';
import StudentRegistrationModal from '../../components/Scanner/StudentRegistrationModal';

export default function Scanner() {
  const [isEnrollModalOpen, setIsEnrollModalOpen] = useState(false);

  return (
    <div style={{ height: '100vh', width: '100vw', display: 'flex', flexDirection: 'column', background: 'var(--bg-color)' }}>
      {/* Top Header matching the new aesthetic */}
      <header style={{ 
        padding: '16px 32px', 
        background: 'white', 
        borderBottom: '1px solid var(--border-color)', 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        boxShadow: '0 4px 20px rgba(0,0,0,0.02)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <img 
            src="/logo.png" 
            alt="San Jose National High School Logo"
            style={{
              width: '48px',
              height: '48px',
              objectFit: 'contain'
            }}
          />
          <div>
            <h2 style={{ color: 'var(--primary-color)', margin: 0, fontSize: '20px' }}>EduScan Ingress</h2>
            <div style={{ color: 'var(--text-secondary)', fontSize: '12px', fontWeight: 500 }}>San Jose National High School</div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
           <button 
             onClick={() => setIsEnrollModalOpen(true)}
             className="btn-secondary" 
             style={{ padding: '8px 16px', fontSize: '13px', display: 'flex', gap: '8px', alignItems: 'center' }}
           >
             <UserPlus size={16} /> Enroll New Student
           </button>
           <span className="tag tag-success" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', padding: '6px 16px' }}>
             <span className="pulse-icon" style={{ width: '8px', height: '8px', background: 'var(--success)' }}></span>
             SYSTEM LIVE
           </span>
        </div>
      </header>
      
      <main style={{ flex: 1, display: 'flex', position: 'relative', overflow: 'hidden', padding: '24px', gap: '24px' }}>
        {/* Placeholder for actual webcam feed */}
        <div className="card" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0f172a', borderRadius: '32px', overflow: 'hidden', border: '8px solid white' }}>
          <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.5)' }}>
            <Camera size={72} style={{ opacity: 0.3, marginBottom: '20px' }} />
            <h3 style={{ color: 'white', fontSize: '24px', fontWeight: 500 }}>Camera Feed Inactive</h3>
            <p style={{ fontSize: '16px', marginTop: '8px' }}>Waiting for LBPH model initialization...</p>
          </div>
        </div>

        {/* Real-time scan logs sidebar */}
        <aside className="card" style={{ width: '380px', display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '24px', borderBottom: '1px solid var(--border-color)', background: 'white' }}>
            <h3 style={{ fontSize: '18px', margin: 0 }}>Recent Verifications</h3>
          </div>
          <div style={{ flex: 1, padding: '24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px', background: '#f8fafc' }}>
            
            <div className="animate-fade-in" style={{ padding: '16px', background: 'white', borderLeft: '4px solid var(--success)', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                 <strong style={{ fontSize: '15px', color: 'var(--text-primary)' }}>John Doe</strong>
                 <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 500 }}>07:15 AM</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="tag tag-gray">Grade 10 - Rizal</span>
                <span className="tag tag-success" style={{ background: 'transparent', padding: 0 }}>✓ Verified</span>
              </div>
            </div>

             <div className="animate-fade-in delay-100" style={{ padding: '16px', background: 'white', borderLeft: '4px solid var(--success)', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                 <strong style={{ fontSize: '15px', color: 'var(--text-primary)' }}>Jane Smith</strong>
                 <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 500 }}>07:14 AM</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="tag tag-gray">Grade 10 - Rizal</span>
                <span className="tag tag-success" style={{ background: 'transparent', padding: 0 }}>✓ Verified</span>
              </div>
            </div>

          </div>
        </aside>
      </main>

      {isEnrollModalOpen && (
        <StudentRegistrationModal onClose={() => setIsEnrollModalOpen(false)} />
      )}
    </div>
  );
}
