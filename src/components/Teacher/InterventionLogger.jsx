import { AlertTriangle, Send } from 'lucide-react';

export default function InterventionLogger({ sardoList, isLocked }) {
  if (!sardoList || sardoList.length === 0) return null;

  return (
    <div className="card animate-fade-in delay-100" style={{ border: '2px solid rgba(220, 38, 38, 0.1)', background: 'linear-gradient(to right, white, #fffcfc)' }}>
      <h2 style={{ fontSize: '18px', margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--secondary-color)' }}>
        <AlertTriangle size={20} /> Truancy Interventions (SARDO Alert)
      </h2>
      <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
        DepEd Mandate: Students with 5 consecutive absences require immediate intervention (e.g., Home Visitation).
      </p>
      
      <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
        {sardoList.map(student => (
          <div key={student.id} style={{ background: 'white', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '16px', flex: '1', minWidth: '300px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <strong style={{ fontSize: '15px' }}>{student.name}</strong>
              <span className="tag tag-danger">{student.absences} Absences</span>
            </div>
            <textarea 
              className="input-field" 
              placeholder="Log Home Visitation or Parent Conference notes here..." 
              style={{ height: '80px', resize: 'none', borderRadius: '8px', fontSize: '13px' }}
              disabled={isLocked}
            ></textarea>
            <button className="btn-secondary" style={{ width: '100%', marginTop: '8px', fontSize: '13px', padding: '6px' }} disabled={isLocked}>
              <Send size={14} style={{ marginRight: '6px' }} /> Save Intervention Log
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
