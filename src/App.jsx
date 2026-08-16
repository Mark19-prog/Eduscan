import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

// Layouts
import PublicLayout from './layouts/PublicLayout';
import AdminLayout from './layouts/AdminLayout';
import TeacherLayout from './layouts/TeacherLayout';

// Pages
import Scanner from './pages/Scanner/Scanner';
import Login from './pages/Login/Login';
import Dashboard from './pages/Dashboard/Dashboard';
import Attendance from './pages/Attendance/Attendance';
import Grading from './pages/Grading/Grading';
import Reports from './pages/Reports/Reports';
import SF2Dashboard from './pages/Teacher/SF2Dashboard';
import TruancyInterventions from './pages/Teacher/TruancyInterventions';
import MyAdvisory from './pages/Teacher/MyAdvisory';
import SystemSetup from './pages/Setup/SystemSetup';
import Administration from './pages/Administration/Administration';
import { auth } from './api/client';

function RoleGuard({ roles, children }) {
  return auth.token() && roles.includes(auth.role()) ? children : <Navigate to="/login" replace />;
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public Routes (No authentication required) */}
        <Route element={<PublicLayout />}>
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<Login />} />
          <Route path="/scanner" element={<RoleGuard roles={['admin', 'scanner']}><Scanner /></RoleGuard>} />
        </Route>

        {/* Protected Routes (Authentication required in a real app) */}
        <Route path="/dashboard" element={<RoleGuard roles={['admin']}><AdminLayout /></RoleGuard>}>
          <Route index element={<Dashboard />} />
          <Route path="attendance" element={<Attendance />} />
          <Route path="grading" element={<Grading />} />
          <Route path="reports" element={<Reports />} />
          <Route path="setup" element={<SystemSetup />} />
          <Route path="administration" element={<Administration />} />
        </Route>

        {/* Teacher Routes */}
        <Route path="/teacher" element={<RoleGuard roles={['teacher']}><TeacherLayout /></RoleGuard>}>
          <Route index element={<SF2Dashboard />} />
          <Route path="truancy" element={<TruancyInterventions />} />
          <Route path="roster" element={<MyAdvisory />} />
          <Route path="attendance" element={<Attendance />} />
        </Route>

        {/* Fallback route */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
