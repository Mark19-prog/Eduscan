import { Download, FileText } from 'lucide-react';

export default function SF2ReportGenerator() {
  return (
    <div className="card animate-fade-in" style={{ display: 'flex', gap: '32px', alignItems: 'center' }}>
      <div style={{ flex: 1 }}>
        <h2 style={{ fontSize: '22px', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
          <FileText size={24} color="var(--accent-blue)" /> SF2 Monthly Report Generator
        </h2>
        <p style={{ color: 'var(--text-secondary)', lineHeight: 1.5 }}>
          Select a month to automatically compile the daily attendance records into an official DepEd SF2 CSV format. This process will trigger a backend Python/Pandas script to aggregate the data and generate a perfectly formatted file.
        </p>
      </div>
      
      <div style={{ background: '#f8fafc', padding: '24px', borderRadius: '16px', border: '1px solid var(--border-color)', minWidth: '300px' }}>
        <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '8px' }}>Select Reporting Month</label>
        <select className="input-field" style={{ marginBottom: '16px', background: 'white' }}>
          <option>August 2026</option>
          <option>September 2026</option>
          <option>October 2026</option>
        </select>
        <button className="btn-primary" style={{ width: '100%', display: 'flex', justifyContent: 'center', gap: '8px', padding: '12px' }}>
          <Download size={18} /> Export to SF2 (CSV)
        </button>
      </div>
    </div>
  );
}
