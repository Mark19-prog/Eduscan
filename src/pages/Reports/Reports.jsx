import SF2ReportGenerator from '../../components/Teacher/SF2ReportGenerator';

export default function Reports() {
  return (
    <div className="page-stack">
      <div className="page-heading"><div><p className="eyebrow">Records officer review</p><h1>SF2 report preparation</h1><p>Validate roster placement and attendance marks before any official monthly submission.</p></div></div>
      <SF2ReportGenerator />
    </div>
  );
}
