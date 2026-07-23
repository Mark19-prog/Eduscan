import { useState, useEffect } from 'react';
import { X, Camera, ScanFace, CheckCircle, Database } from 'lucide-react';

export default function StudentRegistrationModal({ onClose }) {
  const [captureProgress, setCaptureProgress] = useState(0);
  const [isCapturing, setIsCapturing] = useState(false);

  // Simulate LBPH image dataset collection (30 frames)
  useEffect(() => {
    let interval;
    if (isCapturing) {
      interval = setInterval(() => {
        setCaptureProgress(prev => {
          if (prev >= 100) {
            clearInterval(interval);
            setIsCapturing(false);
            return 100;
          }
          return prev + (100 / 30); // Simulate 30 captures
        });
      }, 100); // 100ms per frame
    }
    return () => clearInterval(interval);
  }, [isCapturing]);

  const handleStartCapture = (e) => {
    e.preventDefault();
    setCaptureProgress(0);
    setIsCapturing(true);
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div className="card animate-fade-in" style={{ width: '800px', maxWidth: '95vw', padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        
        {/* Header */}
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc' }}>
          <h2 style={{ margin: 0, fontSize: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ScanFace size={24} color="var(--primary-color)" /> Enroll New Student (LBPH Dataset)
          </h2>
          <button onClick={onClose} className="icon-btn" style={{ border: 'none', background: 'transparent' }}>
            <X size={24} />
          </button>
        </div>

        {/* Content Body */}
        <div style={{ display: 'flex', padding: '24px', gap: '32px' }}>
          
          {/* Left: Form Fields */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>Learner Reference Number (LRN)</label>
              <input type="text" className="input-field" placeholder="12-digit LRN" />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>Full Name (Last, First, MI)</label>
              <input type="text" className="input-field" placeholder="e.g., Dela Cruz, Juan M." />
            </div>
            <div style={{ display: 'flex', gap: '12px' }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>Grade Level</label>
                <select className="input-field"><option>Grade 10</option><option>Grade 11</option></select>
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>Section</label>
                <select className="input-field"><option>Rizal</option><option>Bonifacio</option></select>
              </div>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>Parent/Guardian Mobile Number</label>
              <input type="text" className="input-field" placeholder="+63 9XX XXX XXXX (For SMS Alerts)" />
            </div>
          </div>

          {/* Right: LBPH Dataset Capture */}
          <div style={{ width: '320px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
             <div style={{ height: '240px', background: '#0f172a', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden', border: '4px solid var(--border-color)' }}>
               {/* Simulating Webcam Feed */}
               <Camera size={48} style={{ color: 'rgba(255,255,255,0.2)' }} />
               {isCapturing && (
                 <div style={{ position: 'absolute', inset: 0, border: '4px solid var(--success)', borderRadius: '8px', opacity: 0.8 }}>
                    <div style={{ position: 'absolute', top: 10, right: 10, width: '12px', height: '12px', background: 'var(--danger)', borderRadius: '50%', animation: 'pulse 1s infinite' }}></div>
                 </div>
               )}
               {captureProgress >= 100 && (
                 <div style={{ position: 'absolute', inset: 0, background: 'rgba(32, 201, 151, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                   <CheckCircle size={48} color="var(--success)" />
                 </div>
               )}
             </div>

             <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '8px', fontWeight: 500 }}>
                  <span>Dataset Collection Progress</span>
                  <span>{Math.round(captureProgress)}%</span>
                </div>
                <div style={{ height: '6px', background: 'var(--border-color)', borderRadius: '999px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', background: 'var(--primary-color)', width: `${captureProgress}%`, transition: 'width 0.1s linear' }}></div>
                </div>
                <p style={{ fontSize: '11px', color: 'var(--text-secondary)', margin: '8px 0 0 0', lineHeight: 1.4 }}>
                  The system requires ~30 sample frames from different angles to construct a reliable LBPH histogram for facial recognition.
                </p>
             </div>

             <button 
               className={captureProgress >= 100 ? "btn-secondary" : "btn-primary"} 
               onClick={handleStartCapture}
               disabled={isCapturing || captureProgress >= 100}
               style={{ width: '100%', display: 'flex', justifyContent: 'center', gap: '8px' }}
             >
               {captureProgress >= 100 ? <><CheckCircle size={16} /> Dataset Complete</> : <><Camera size={16} /> Capture 30 Frames</>}
             </button>
          </div>

        </div>

        {/* Footer */}
        <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'flex-end', gap: '12px', background: '#f8fafc' }}>
          <button className="btn-secondary" onClick={onClose} style={{ padding: '8px 24px' }}>Cancel</button>
          <button className="btn-primary" disabled={captureProgress < 100} style={{ padding: '8px 24px', display: 'flex', alignItems: 'center', gap: '8px', background: captureProgress < 100 ? 'var(--text-muted)' : 'var(--success)' }}>
            <Database size={16} /> Save & Train Model
          </button>
        </div>

      </div>
    </div>
  );
}
