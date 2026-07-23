import { Download } from 'lucide-react';

export default function Reports() {
  return (
    <div>
      <h1 style={{ marginBottom: '24px' }}>SF2 Reports Generation</h1>
      
      <div className="card" style={{ maxWidth: '600px' }}>
        <h3 style={{ marginBottom: '16px' }}>Generate Monthly Attendance Report (SF2)</h3>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>
          Select the section and month to generate the official DepEd School Form 2 in CSV format. 
          This file is interoperable with official Excel templates.
        </p>

        <form style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)' }}>Section</label>
            <select className="input-glass">
              <option>Grade 10 - Rizal</option>
              <option>Grade 10 - Bonifacio</option>
            </select>
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)' }}>Month</label>
            <input type="month" className="input-glass" />
          </div>
          <button type="button" className="btn-primary" style={{ marginTop: '16px' }}>
            <Download size={18} /> Generate SF2 CSV
          </button>
        </form>
      </div>
    </div>
  );
}
