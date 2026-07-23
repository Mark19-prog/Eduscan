import { Outlet } from 'react-router-dom';

export default function PublicLayout() {
  return (
    <div className="app-container">
      <main style={{ width: '100%', display: 'flex', flexDirection: 'column' }}>
        <Outlet />
      </main>
    </div>
  );
}
