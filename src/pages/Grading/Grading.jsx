import { Lock, Unlock, Download, Printer, FileSearch, FileText, ShieldAlert, CheckCircle, Search, Filter, User } from 'lucide-react';

export default function Grading() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ margin: 0 }}>Grading Oversight</h1>
          <p style={{ margin: '4px 0 0 0', color: 'var(--text-secondary)' }}>Institutional control, document generation, and security audit.</p>
        </div>
      </div>
      
      {/* 1. Quarterly Lock/Unlock Controls */}
      <div style={{ display: 'flex', gap: '24px' }}>
        {[
          { q: 'Q1', status: 'Locked', deadline: 'Oct 30, 2026', color: 'var(--primary-color)' },
          { q: 'Q2', status: 'Locked', deadline: 'Jan 15, 2027', color: 'var(--primary-color)' },
          { q: 'Q3', status: 'Unlocked', deadline: 'Mar 30, 2027', color: 'var(--success)' },
          { q: 'Q4', status: 'Pending', deadline: 'Jun 10, 2027', color: 'var(--text-muted)' }
        ].map((quarter, idx) => (
          <div key={quarter.q} className={`card delay-${idx * 100} animate-fade-in`} style={{ flex: 1, padding: '20px' }}>
             <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
               <div>
                  <h3 style={{ fontSize: '24px', margin: 0, color: quarter.color }}>{quarter.q}</h3>
                  <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Deadline: {quarter.deadline}</span>
               </div>
               {quarter.status === 'Locked' ? <Lock size={20} color="var(--primary-color)" /> : 
                quarter.status === 'Unlocked' ? <Unlock size={20} color="var(--success)" /> : 
                <Lock size={20} color="var(--text-muted)" />}
             </div>
             
             <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
               <span className={`tag ${quarter.status === 'Locked' ? 'tag-dark' : quarter.status === 'Unlocked' ? 'tag-success' : 'tag-gray'}`}>
                 {quarter.status}
               </span>
             </div>
             
             <button 
               className="btn-secondary" 
               style={{ width: '100%', fontSize: '13px', padding: '8px', opacity: quarter.status === 'Pending' ? 0.5 : 1, cursor: quarter.status === 'Pending' ? 'not-allowed' : 'pointer' }}
               disabled={quarter.status === 'Pending'}
             >
               {quarter.status === 'Locked' ? 'Unlock Portal' : quarter.status === 'Unlocked' ? 'Lock Portal Now' : 'Not Active'}
             </button>
          </div>
        ))}
      </div>

      {/* 2. Consolidated Grades & Export */}
      <div className="card animate-fade-in delay-200">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h2 style={{ fontSize: '20px', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}><FileSearch size={20} /> Master Grading List</h2>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button className="btn-secondary" style={{ padding: '8px 16px', fontSize: '14px', gap: '8px', display: 'flex', alignItems: 'center' }}>
              <Filter size={16} /> Filters
            </button>
            <button className="btn-primary" style={{ padding: '8px 16px', fontSize: '14px', gap: '8px', display: 'flex', alignItems: 'center' }}>
               <Download size={16} /> Export Form 137
            </button>
            <button className="btn-primary" style={{ background: 'var(--success)', padding: '8px 16px', fontSize: '14px', gap: '8px', display: 'flex', alignItems: 'center', boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)' }}>
               <Printer size={16} /> Print Report Cards
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '16px', marginBottom: '24px' }}>
          <select className="input-field" style={{ width: '200px' }}>
            <option>Grade 10 - Rizal</option>
            <option>Grade 10 - Bonifacio</option>
          </select>
          <select className="input-field" style={{ width: '200px' }}>
            <option>Mathematics</option>
            <option>Science</option>
          </select>
          <div style={{ position: 'relative', flex: 1, maxWidth: '300px', marginLeft: 'auto' }}>
            <Search size={16} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input type="text" placeholder="Search student name..." className="input-field" style={{ paddingLeft: '40px', background: '#f8fafc' }} />
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="interactive-table">
            <thead>
              <tr>
                <th>Student ID</th>
                <th>Student Name</th>
                <th>Q1</th>
                <th>Q2</th>
                <th>Q3</th>
                <th>Q4</th>
                <th>Final Grade</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>2023-0192</td>
                <td style={{ fontWeight: 500, color: 'var(--text-primary)' }}>Rajvir Singh</td>
                <td>88</td>
                <td>90</td>
                <td><span style={{ color: 'var(--warning)', fontWeight: 600 }}>TBA</span></td>
                <td>-</td>
                <td style={{ fontWeight: 'bold' }}>-</td>
                <td><span className="tag tag-blue">In Progress</span></td>
              </tr>
              <tr>
                <td style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>2023-0144</td>
                <td style={{ fontWeight: 500, color: 'var(--text-primary)' }}>Maria Clara</td>
                <td>92</td>
                <td>94</td>
                <td><span style={{ color: 'var(--warning)', fontWeight: 600 }}>TBA</span></td>
                <td>-</td>
                <td style={{ fontWeight: 'bold' }}>-</td>
                <td><span className="tag tag-blue">In Progress</span></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* 3. Audit Trails */}
      <div className="card animate-fade-in delay-300" style={{ border: '2px solid rgba(211, 47, 47, 0.1)', background: 'linear-gradient(to right, white, #fffafa)' }}>
         <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h2 style={{ fontSize: '20px', margin: 0, display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--secondary-color)' }}>
            <ShieldAlert size={20} /> Administrative Audit Trail
          </h2>
        </div>
        <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '24px' }}>
          Security log of all post-deadline grade modifications and overrides. These actions require elevated administrative privileges.
        </p>

        <div style={{ overflowX: 'auto' }}>
          <table className="interactive-table" style={{ fontSize: '13px' }}>
            <thead>
              <tr>
                <th>Date & Time</th>
                <th>Authorized By</th>
                <th>Student</th>
                <th>Subject & Qtr</th>
                <th>Change</th>
                <th>Reason for Override</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Oct 31, 2026 - 14:32</td>
                <td><span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}><User size={14} color="var(--accent-blue)" /> Principal Ramos</span></td>
                <td>Juan Dela Cruz</td>
                <td>Math - Q1</td>
                <td><span style={{ color: 'var(--danger)', textDecoration: 'line-through', marginRight: '8px' }}>74</span> &rarr; <span style={{ color: 'var(--success)', fontWeight: 'bold', marginLeft: '8px' }}>76</span></td>
                <td style={{ color: 'var(--text-secondary)' }}>Computational error in teacher's spreadsheet. Correction verified.</td>
              </tr>
               <tr>
                <td>Nov 02, 2026 - 09:15</td>
                <td><span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}><User size={14} color="var(--accent-blue)" /> Admin Portal</span></td>
                <td>System Auto-Lock</td>
                <td>All Subjects - Q1</td>
                <td><span className="tag tag-success">Unlocked</span> &rarr; <span className="tag tag-dark">Locked</span></td>
                <td style={{ color: 'var(--text-secondary)' }}>Automated scheduled lock at end of grading period grace extension.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
