import { BookOpen } from 'lucide-react';

export default function SubjectSelector({ currentClass, setCurrentClass }) {
  const classes = [
    { id: '10-rizal-math', label: 'Grade 10 Rizal - Mathematics' },
    { id: '10-rizal-science', label: 'Grade 10 Rizal - Science' },
    { id: '9-bonifacio-math', label: 'Grade 9 Bonifacio - Mathematics' },
  ];

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', background: 'white', padding: '12px 24px', borderRadius: '16px', boxShadow: '0 2px 12px rgba(0,0,0,0.03)', border: '1px solid var(--border-color)' }}>
      <BookOpen size={20} color="var(--accent-blue)" />
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Current Context</span>
        <select 
          className="input-field" 
          style={{ padding: '4px 32px 4px 0', border: 'none', background: 'transparent', fontSize: '18px', fontWeight: 600, color: 'var(--primary-color)', boxShadow: 'none', cursor: 'pointer' }}
          value={currentClass}
          onChange={(e) => setCurrentClass(e.target.value)}
        >
          {classes.map(c => (
            <option key={c.id} value={c.id}>{c.label}</option>
          ))}
        </select>
      </div>
    </div>
  );
}
