import { BarChart3, User, GraduationCap } from 'lucide-react';

export default function Dashboard() {
  return (
    <div className="animate-fade-in" style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
      
      {/* Left Column (Main Stats / Chart) */}
      <div style={{ flex: '2', minWidth: '600px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
        
        {/* Main Chart Card mimicking Income Tracker */}
        <div className="card delay-100">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ background: 'var(--bg-color)', padding: '8px', borderRadius: '8px', display: 'flex' }}>
                <BarChart3 size={24} color="var(--primary-color)" />
              </div>
              <h1 style={{ margin: 0 }}>Attendance Tracker</h1>
            </div>
            <select className="input-field" style={{ width: 'auto', background: 'white', border: '1px solid var(--border-color)' }}>
              <option>Week</option>
              <option>Month</option>
            </select>
          </div>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '32px', maxWidth: '400px' }}>
            Track daily ingress numbers over time and access detailed data on student and faculty attendance.
          </p>

          {/* Placeholder for the chart */}
          <div style={{ height: '200px', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', padding: '0 24px', position: 'relative' }}>
             {/* Simulating the bar chart in the image */}
             <div style={{ position: 'absolute', left: '24px', top: '0' }}>
               <h2 style={{ fontSize: '32px', margin: 0 }}>+12%</h2>
               <p style={{ fontSize: '12px' }}>This week's attendance is<br/>higher than last week's</p>
             </div>
             
             {[1, 2, 3, 4, 5, 6, 7].map((bar, i) => (
                <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                  {i === 3 && <div style={{ background: 'var(--primary-color)', color: 'white', padding: '4px 8px', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold' }}>1,284</div>}
                  <div style={{ width: '4px', height: `${Math.random() * 100 + 40}px`, background: 'var(--border-color)', borderRadius: '4px', position: 'relative' }}>
                     <div style={{ width: '12px', height: '12px', background: i === 3 ? 'var(--primary-color)' : 'var(--accent-blue)', borderRadius: '50%', position: 'absolute', top: '-6px', left: '-4px' }}></div>
                  </div>
                  <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: i === 3 ? 'var(--primary-color)' : 'var(--bg-color)', color: i === 3 ? 'white' : 'var(--text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: '500' }}>
                    {['S', 'M', 'T', 'W', 'T', 'F', 'S'][i]}
                  </div>
                </div>
             ))}
          </div>
        </div>

        {/* Lower Left Cards (Let's Connect / Premium Features) - Adapting to EduScan Context */}
        <div style={{ display: 'flex', gap: '24px' }}>
           <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ margin: 0 }}>Recent Absences</h3>
                <a href="#" style={{ color: 'var(--text-secondary)', textDecoration: 'none', fontSize: '14px' }}>See all</a>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div className="card" style={{ padding: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderRadius: '999px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--bg-color)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>JD</div>
                    <div>
                      <div style={{ fontWeight: '600', color: 'var(--primary-color)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        John Doe <span className="tag tag-gray">Grade 10</span>
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Unexcused</div>
                    </div>
                  </div>
                  <button style={{ width: '32px', height: '32px', borderRadius: '50%', border: '1px solid var(--border-color)', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>+</button>
                </div>
                <div className="card" style={{ padding: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderRadius: '999px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--bg-color)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>MS</div>
                    <div>
                      <div style={{ fontWeight: '600', color: 'var(--primary-color)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        Mary Smith <span className="tag tag-blue">Grade 11</span>
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Excused</div>
                    </div>
                  </div>
                  <button style={{ width: '32px', height: '32px', borderRadius: '50%', border: '1px solid var(--border-color)', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>+</button>
                </div>
              </div>
           </div>
           
           <div className="card" style={{ flex: 1, background: 'linear-gradient(135deg, #f8fafc, #e2e8f0)', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
             <h3 style={{ marginBottom: '8px' }}>Generate SF2 Report</h3>
             <p style={{ fontSize: '14px', marginBottom: '24px' }}>Export official DepEd attendance records for your section instantly.</p>
             <button className="btn-primary" style={{ background: 'white', color: 'var(--primary-color)', width: '100%', justifyContent: 'space-between', padding: '12px 24px' }}>
               <span>Export Now</span>
               <span>&gt;</span>
             </button>
           </div>
        </div>
      </div>

      {/* Right Column (Recent Projects / Proposal Progress) - Adapting to EduScan Context */}
      <div style={{ flex: '1', minWidth: '350px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
         <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '20px' }}>Recent Scans</h3>
              <a href="#" style={{ color: 'var(--text-secondary)', textDecoration: 'none', fontSize: '14px' }}>See all Scans</a>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Scan Item 1 */}
              <div style={{ background: 'transparent', padding: '16px 0', borderBottom: '1px solid var(--border-color)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'var(--secondary-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
                      <User size={24} />
                    </div>
                    <div>
                       <h4 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>Charles Darwish <span className="tag tag-dark">Student</span></h4>
                       <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>Grade 10 - Rizal</span>
                    </div>
                  </div>
                  <button style={{ width: '32px', height: '32px', borderRadius: '50%', border: 'none', background: 'var(--bg-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                    <span style={{ transform: 'rotate(90deg)' }}>...</span>
                  </button>
                </div>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                  <span className="tag tag-gray">Time In: 07:12 AM</span>
                  <span className="tag tag-gray">SMS Sent</span>
                </div>
                <p style={{ fontSize: '14px' }}>Successfully verified via LBPH scanner at Gate 1.</p>
              </div>

              {/* Scan Item 2 */}
              <div style={{ background: 'transparent', padding: '16px 0', borderBottom: '1px solid var(--border-color)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'var(--bg-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
                      <GraduationCap size={24} />
                    </div>
                    <div>
                       <h4 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>Mark Jervhyne <span className="tag tag-gray">Faculty</span></h4>
                       <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>Science Dept.</span>
                    </div>
                  </div>
                  <button style={{ width: '32px', height: '32px', borderRadius: '50%', border: 'none', background: 'var(--bg-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                    <span style={{ transform: 'rotate(90deg)' }}>...</span>
                  </button>
                </div>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                  <span className="tag tag-gray">Time In: 06:45 AM</span>
                </div>
              </div>
            </div>
         </div>

         {/* Bottom Right Card (Proposal Progress adapted to SMS Status) */}
         <div className="card" style={{ marginTop: 'auto' }}>
           <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h3 style={{ margin: 0 }}>SMS Dispatch Status</h3>
              <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>Today ▾</span>
           </div>
           
           <div style={{ display: 'flex', gap: '24px', marginBottom: '24px' }}>
             <div style={{ flex: 1, borderRight: '1px solid var(--border-color)' }}>
               <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Sent to Parents</div>
               <div style={{ fontSize: '32px', fontWeight: 'bold' }}>1,284</div>
             </div>
             <div style={{ flex: 1, borderRight: '1px solid var(--border-color)' }}>
               <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Failed/Retry</div>
               <div style={{ fontSize: '32px', fontWeight: 'bold' }}>12</div>
             </div>
             <div style={{ flex: 1 }}>
               <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Pending</div>
               <div style={{ fontSize: '32px', fontWeight: 'bold' }}>5</div>
             </div>
           </div>

           {/* Simulating the vertical barcode-like chart */}
           <div style={{ display: 'flex', alignItems: 'flex-end', height: '40px', gap: '4px' }}>
              {Array(30).fill(0).map((_, i) => (
                <div key={i} style={{ flex: 1, background: i > 15 && i < 22 ? 'var(--secondary-color)' : 'var(--primary-color)', height: `${Math.random() * 60 + 40}%`, opacity: i > 15 && i < 22 ? 1 : 0.2 }}></div>
              ))}
           </div>
         </div>
      </div>

    </div>
  );
}
