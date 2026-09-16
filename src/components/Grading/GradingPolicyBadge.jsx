import React from 'react';
import { Shield } from 'lucide-react';

export default function GradingPolicyBadge({ name, version, category, onClick }) {
  if (!name) return null;
  return (
    <button
      type="button"
      className="policy-badge-btn"
      onClick={onClick}
      title={`Active Policy: ${name} (v${version || '1.0'})${category ? ` • ${category}` : ''}. Click to view details.`}
    >
      <Shield size={14} className="policy-badge-icon" />
      <span className="policy-badge-name">{name}</span>
      {version && <span className="policy-badge-version">v{version}</span>}
    </button>
  );
}
