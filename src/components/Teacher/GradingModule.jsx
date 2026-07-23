import { useState } from 'react';
import { Calculator, Save } from 'lucide-react';

export default function GradingModule({ students, onStudentClick }) {
  // Mocking state for demonstration of interactive grading grid
  const [grades, setGrades] = useState(
    students.reduce((acc, curr) => {
      acc[curr.id] = { qz1: 85, qz2: 90, pt1: 88, pt2: 92, exam: 85 };
      return acc;
    }, {})
  );

  const calculateGrade = (studentGrades) => {
    const quizAvg = (studentGrades.qz1 + studentGrades.qz2) / 2;
    const ptAvg = (studentGrades.pt1 + studentGrades.pt2) / 2;
    const exam = studentGrades.exam;
    
    // Example Weights: Quizzes 30%, PT 50%, Exams 20%
    const final = (quizAvg * 0.30) + (ptAvg * 0.50) + (exam * 0.20);
    return Math.round(final);
  };

  const handleGradeChange = (studentId, field, value) => {
    setGrades(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        [field]: Number(value) || 0
      }
    }));
  };

  return (
    <div className="card animate-fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h2 style={{ fontSize: '18px', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Calculator size={20} color="var(--accent-blue)" /> Interactive Grading Sheet
        </h2>
        <button className="btn-primary" style={{ padding: '8px 16px', fontSize: '14px', gap: '8px', display: 'flex', alignItems: 'center' }}>
          <Save size={16} /> Save to Database
        </button>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table className="interactive-table" style={{ minWidth: '800px' }}>
          <thead>
            <tr>
              <th rowSpan="2" style={{ borderRight: '1px solid var(--border-color)', minWidth: '200px' }}>Student Name</th>
              <th colSpan="2" style={{ textAlign: 'center', borderRight: '1px solid var(--border-color)', borderBottom: '1px solid var(--border-color)' }}>Quizzes (30%)</th>
              <th colSpan="2" style={{ textAlign: 'center', borderRight: '1px solid var(--border-color)', borderBottom: '1px solid var(--border-color)' }}>Performance Tasks (50%)</th>
              <th style={{ textAlign: 'center', borderRight: '1px solid var(--border-color)', borderBottom: '1px solid var(--border-color)' }}>Quarterly Exam (20%)</th>
              <th rowSpan="2" style={{ textAlign: 'center' }}>Tentative Grade</th>
            </tr>
            <tr>
              <th>Qz 1</th>
              <th style={{ borderRight: '1px solid var(--border-color)' }}>Qz 2</th>
              <th>PT 1</th>
              <th style={{ borderRight: '1px solid var(--border-color)' }}>PT 2</th>
              <th style={{ borderRight: '1px solid var(--border-color)' }}>Exam</th>
            </tr>
          </thead>
          <tbody>
            {students.map(student => {
              const studentGrades = grades[student.id];
              const finalGrade = calculateGrade(studentGrades);
              return (
                <tr key={student.id}>
                  <td style={{ fontWeight: 500, color: 'var(--text-primary)', cursor: 'pointer', borderRight: '1px solid var(--border-color)' }} onClick={() => onStudentClick(student)}>
                    {student.name}
                  </td>
                  <td><input type="number" min="0" max="100" value={studentGrades.qz1} onChange={e => handleGradeChange(student.id, 'qz1', e.target.value)} className="input-field" style={{ width: '70px', padding: '4px 8px', textAlign: 'center' }} /></td>
                  <td style={{ borderRight: '1px solid var(--border-color)' }}><input type="number" min="0" max="100" value={studentGrades.qz2} onChange={e => handleGradeChange(student.id, 'qz2', e.target.value)} className="input-field" style={{ width: '70px', padding: '4px 8px', textAlign: 'center' }} /></td>
                  <td><input type="number" min="0" max="100" value={studentGrades.pt1} onChange={e => handleGradeChange(student.id, 'pt1', e.target.value)} className="input-field" style={{ width: '70px', padding: '4px 8px', textAlign: 'center' }} /></td>
                  <td style={{ borderRight: '1px solid var(--border-color)' }}><input type="number" min="0" max="100" value={studentGrades.pt2} onChange={e => handleGradeChange(student.id, 'pt2', e.target.value)} className="input-field" style={{ width: '70px', padding: '4px 8px', textAlign: 'center' }} /></td>
                  <td style={{ borderRight: '1px solid var(--border-color)', textAlign: 'center' }}><input type="number" min="0" max="100" value={studentGrades.exam} onChange={e => handleGradeChange(student.id, 'exam', e.target.value)} className="input-field" style={{ width: '70px', padding: '4px 8px', textAlign: 'center' }} /></td>
                  <td style={{ textAlign: 'center', fontWeight: 'bold', fontSize: '18px', color: finalGrade < 75 ? 'var(--danger)' : 'var(--success)' }}>
                    {finalGrade}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
