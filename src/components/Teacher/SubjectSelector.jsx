import { BookOpen } from 'lucide-react';
import { useEffect, useState } from 'react';
import { api } from '../../api/client';

export default function SubjectSelector({ currentClass, setCurrentClass, setCurrentSchedule }) {
  const [classes, setClasses] = useState([]);
  useEffect(() => { api.get('/schedules').then((rows) => {
    const options = rows.filter((row) => row.active).map((row) => ({ id: `${row.grade}-${row.section}-${row.subject}`.toLowerCase().replace(/[^a-z0-9]+/g, '-'), label: `Grade ${row.grade} ${row.section} — ${row.subject}`, schedule: row }));
    setClasses(options);
    const selected = options.find((item) => item.id === currentClass) || options[0];
    if (selected) { setCurrentClass(selected.id); setCurrentSchedule?.(selected.schedule); }
  }).catch(() => setClasses([])); }, [currentClass, setCurrentClass, setCurrentSchedule]);

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', background: 'white', padding: '12px 24px', borderRadius: '16px', boxShadow: '0 2px 12px rgba(0,0,0,0.03)', border: '1px solid var(--border-color)' }}>
      <BookOpen size={20} color="var(--accent-blue)" />
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Current Context</span>
        <select 
          className="input-field" 
          style={{ padding: '4px 32px 4px 0', border: 'none', background: 'transparent', fontSize: '18px', fontWeight: 600, color: 'var(--primary-color)', boxShadow: 'none', cursor: 'pointer' }}
          value={currentClass}
          onChange={(e) => { const selected = classes.find((item) => item.id === e.target.value); setCurrentClass(e.target.value); setCurrentSchedule?.(selected?.schedule || null); }}
        >
          {classes.length === 0 && <option value={currentClass}>No class schedule configured</option>}
          {classes.map(c => (
            <option key={c.id} value={c.id}>{c.label}</option>
          ))}
        </select>
      </div>
    </div>
  );
}
