import { Outlet, NavLink } from 'react-router-dom';
import { Search, Bell, Settings, User, LayoutDashboard, Users, FileSpreadsheet, FileText, Camera } from 'lucide-react';

export default function AdminLayout() {
  return (
    <div className="app-container">
      {/* Top Navigation Bar */}
      <header style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        padding: '20px 40px',
        background: 'rgba(255, 255, 255, 0.7)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.5)',
        position: 'sticky',
        top: 0,
        zIndex: 100
      }}>
        {/* Logo Area */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }} className="logo-container">
          <img 
            src="/logo.png" 
            alt="San Jose National High School Logo" 
            style={{ 
              width: '56px', 
              height: '56px', 
              objectFit: 'contain',
              transition: 'transform 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55)'
            }} 
            className="logo-icon"
          />
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <h2 style={{ margin: 0, fontSize: '24px', letterSpacing: '-0.5px', lineHeight: 1.1 }}>EduScan</h2>
            <span style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 500 }}>San Jose National High School</span>
          </div>
        </div>

        {/* Navigation Links */}
        <nav style={{ display: 'flex', gap: '8px', background: 'white', padding: '6px', borderRadius: '999px', boxShadow: '0 2px 10px rgba(0,0,0,0.02)' }}>
          <NavLink to="/dashboard" end className={({isActive}) => isActive ? 'nav-link active' : 'nav-link'}>
            <LayoutDashboard size={16} /> <span className="nav-text">Overview</span>
          </NavLink>
          <NavLink to="/dashboard/attendance" className={({isActive}) => isActive ? 'nav-link active' : 'nav-link'}>
            <Users size={16} /> <span className="nav-text">Attendance</span>
          </NavLink>
          <NavLink to="/dashboard/grading" className={({isActive}) => isActive ? 'nav-link active' : 'nav-link'}>
            <FileSpreadsheet size={16} /> <span className="nav-text">Grading</span>
          </NavLink>
          <NavLink to="/dashboard/reports" className={({isActive}) => isActive ? 'nav-link active' : 'nav-link'}>
            <FileText size={16} /> <span className="nav-text">SF2 Reports</span>
          </NavLink>
        </nav>

        {/* Right Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <button 
            className="btn-primary" 
            style={{ padding: '8px 16px', fontSize: '14px', gap: '8px', boxShadow: '0 4px 12px rgba(2, 136, 209, 0.3)' }}
            onClick={() => window.open('/scanner', '_blank')}
          >
            <Camera size={16} /> Launch Scanner
          </button>
          
          <div className="search-container" style={{ position: 'relative', width: '220px' }}>
            <Search size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', zIndex: 2 }} />
            <input type="text" placeholder="Search students, faculty..." className="input-field" style={{ paddingLeft: '44px', background: 'white' }} />
          </div>
          
          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="icon-btn">
              <Settings size={20} />
            </button>
            <button className="icon-btn" style={{ position: 'relative' }}>
              <Bell size={20} />
              <span style={{ position: 'absolute', top: '8px', right: '10px', width: '8px', height: '8px', background: 'var(--secondary-color)', borderRadius: '50%', border: '2px solid white' }}></span>
            </button>
          </div>
          
          <div style={{ width: '42px', height: '42px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--accent-light), #d0ebff)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', border: '2px solid white', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', transition: 'transform 0.2s' }} onMouseOver={e => e.currentTarget.style.transform = 'scale(1.05)'} onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'}>
            <User size={20} color="var(--accent-blue)" />
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main style={{ flex: 1, padding: '32px 40px', maxWidth: '1600px', margin: '0 auto', width: '100%' }}>
        <Outlet />
      </main>

      <style>{`
        .logo-container:hover .logo-icon {
          transform: rotate(-10deg) scale(1.1);
        }
        
        .nav-link {
          display: flex;
          align-items: center;
          gap: 6px;
          color: var(--text-secondary);
          text-decoration: none;
          font-weight: 500;
          font-size: 14px;
          padding: 8px 16px;
          border-radius: 999px;
          transition: all var(--transition-bounce);
        }
        .nav-link:hover {
          color: var(--primary-color);
          background: var(--bg-color);
        }
        .nav-link.active {
          color: white;
          background: var(--primary-color);
          box-shadow: 0 4px 12px rgba(15, 23, 42, 0.15);
        }
        .nav-text {
          margin-top: 1px;
        }

        .icon-btn {
          background: white;
          border: 1px solid transparent;
          width: 42px;
          height: 42px;
          borderRadius: 50%;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justifyContent: center;
          color: var(--text-secondary);
          cursor: pointer;
          transition: all var(--transition-bounce);
        }
        .icon-btn:hover {
          background: var(--accent-light);
          color: var(--accent-blue);
          transform: translateY(-2px);
        }
        
        .search-container:focus-within {
           transform: scale(1.02);
           transition: transform var(--transition-bounce);
        }
      `}</style>
    </div>
  );
}
