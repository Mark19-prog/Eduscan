export default function Attendance() {
  return (
    <div>
      <div className="card delay-100 animate-fade-in" style={{ overflowX: 'auto' }}>
        <table className="interactive-table">
          <thead>
            <tr style={{ borderBottom: '1px solid var(--glass-border)', color: 'var(--text-secondary)' }}>
              <th style={{ padding: '12px' }}>Name</th>
              <th style={{ padding: '12px' }}>Role</th>
              <th style={{ padding: '12px' }}>Time In</th>
              <th style={{ padding: '12px' }}>Time Out</th>
              <th style={{ padding: '12px' }}>Status</th>
            </tr>
          </thead>
          <tbody>
            <tr style={{ borderBottom: '1px solid var(--glass-border)' }}>
              <td style={{ padding: '12px' }}>Mark Jervhyne</td>
              <td style={{ padding: '12px' }}>Student</td>
              <td style={{ padding: '12px' }}>07:05 AM</td>
              <td style={{ padding: '12px' }}>--</td>
              <td style={{ padding: '12px' }}><span style={{ color: 'var(--success)' }}>Present</span></td>
            </tr>
            <tr>
              <td style={{ padding: '12px' }}>Charles Darwish</td>
              <td style={{ padding: '12px' }}>Student</td>
              <td style={{ padding: '12px' }}>--</td>
              <td style={{ padding: '12px' }}>--</td>
              <td style={{ padding: '12px' }}><span style={{ color: 'var(--danger)' }}>Absent</span></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
