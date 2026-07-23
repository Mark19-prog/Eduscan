import { useState } from 'react';
import { Lock, Unlock } from 'lucide-react';
import AdviserAnalyticsWidget from '../../components/Teacher/AdviserAnalyticsWidget';
import SubjectSelector from '../../components/Teacher/SubjectSelector';
import SectionAttendance from '../../components/Teacher/SectionAttendance';
import GradingModule from '../../components/Teacher/GradingModule';
import SF2ReportGenerator from '../../components/Teacher/SF2ReportGenerator';
import InterventionLogger from '../../components/Teacher/InterventionLogger';
import StudentProfileModal from '../../components/Teacher/StudentProfileModal';

export default function SF2Dashboard() {
  const [activeTab, setActiveTab] = useState('attendance');
  const [currentClass, setCurrentClass] = useState('10-rizal-math');
  const [isLocked, setIsLocked] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);

  const students = [
    { id: '2023-0192', name: 'Alvarez, Marco', gate: 'Present', override: 'Present', remark: '', absences: 1 },
    { id: '2023-0144', name: 'Bautista, Sarah', gate: 'Present', override: 'Cutting Classes', remark: '', absences: 2 },
    { id: '2023-0211', name: 'Cruz, Jonathan', gate: 'Absent', override: 'Absent', remark: 'Illness', absences: 5 },
    { id: '2023-0305', name: 'Dela Torre, Mika', gate: 'Present', override: 'Present', remark: '', absences: 0 },
    { id: '2023-0418', name: 'Esteban, Paulo', gate: 'Absent', override: 'Absent', remark: 'Family Problem', absences: 6 },
  ];

  const sardoList = students.filter(s => s.absences >= 5);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      
      {/* Top Header & Analytics */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <SubjectSelector currentClass={currentClass} setCurrentClass={setCurrentClass} />
        <button 
          onClick={() => setIsLocked(!isLocked)}
          className={`btn-primary ${isLocked ? 'locked-btn' : ''}`} 
          style={{ 
            background: isLocked ? 'var(--text-secondary)' : 'var(--success)', 
            padding: '12px 24px',
            boxShadow: isLocked ? 'none' : '0 4px 12px rgba(32, 201, 151, 0.3)'
          }}
        >
          {isLocked ? <><Lock size={18} /> Month Submitted & Locked</> : <><Unlock size={18} /> Submit Monthly SF2</>}
        </button>
      </div>

      <AdviserAnalyticsWidget />

      {/* Module Tabs */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '2px solid var(--border-color)', paddingBottom: '16px' }}>
        <button 
          onClick={() => setActiveTab('attendance')}
          style={{ padding: '8px 16px', background: activeTab === 'attendance' ? 'var(--primary-color)' : 'transparent', color: activeTab === 'attendance' ? 'white' : 'var(--text-secondary)', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, transition: 'all 0.2s' }}
        >
          Daily SF2 Attendance
        </button>
        <button 
          onClick={() => setActiveTab('grading')}
          style={{ padding: '8px 16px', background: activeTab === 'grading' ? 'var(--primary-color)' : 'transparent', color: activeTab === 'grading' ? 'white' : 'var(--text-secondary)', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, transition: 'all 0.2s' }}
        >
          Grading Module
        </button>
        <button 
          onClick={() => setActiveTab('reports')}
          style={{ padding: '8px 16px', background: activeTab === 'reports' ? 'var(--primary-color)' : 'transparent', color: activeTab === 'reports' ? 'white' : 'var(--text-secondary)', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, transition: 'all 0.2s' }}
        >
          Reports & Exports
        </button>
      </div>

      {/* Dynamic Module Rendering */}
      {activeTab === 'attendance' && (
        <>
          <InterventionLogger sardoList={sardoList} isLocked={isLocked} />
          <SectionAttendance students={students} isLocked={isLocked} onStudentClick={setSelectedStudent} />
        </>
      )}

      {activeTab === 'grading' && (
        <GradingModule students={students} onStudentClick={setSelectedStudent} />
      )}

      {activeTab === 'reports' && (
        <SF2ReportGenerator />
      )}

      {/* Modals */}
      <StudentProfileModal student={selectedStudent} onClose={() => setSelectedStudent(null)} />

    </div>
  );
}
