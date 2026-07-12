import React from 'react';
import { statusColor, type BadgeColor } from '../utils/status';
import { IconClose } from './Icons';

/* ── Status badge ── */
export const Badge: React.FC<{ status: string }> = ({ status }) => (
  <span className={`badge b-${statusColor(status)}`}><span className="dot" />{status}</span>
);

export const ColorBadge: React.FC<{ color: BadgeColor; children: React.ReactNode }> = ({ color, children }) => (
  <span className={`badge b-${color}`}>{children}</span>
);

/* ── Page header ── */
export const PageHead: React.FC<{ title: string; sub?: string; children?: React.ReactNode }> = ({ title, sub, children }) => (
  <div className="page-head">
    <div>
      <h1>{title}</h1>
      {sub && <div className="sub">{sub}</div>}
    </div>
    {children && <div className="head-actions">{children}</div>}
  </div>
);

/* ── KPI card ── */
export const Kpi: React.FC<{
  label: string; value: React.ReactNode; sub?: string; color?: string;
  icon?: React.ReactNode; tip?: string;
}> = ({ label, value, sub, color, icon, tip }) => (
  <div className="kpi" style={{ ['--k' as string]: color || 'var(--accent)' }}>
    <div className="klabel">
      {label}
      {tip && <span className="help-dot">?<span className="tip">{tip}</span></span>}
    </div>
    <div className="kval">{value}</div>
    {sub && <div className="ksub">{sub}</div>}
    {icon && <div className="kicon">{icon}</div>}
  </div>
);

/* ── Horizontal stat bars (dashboard vehicle status / costliest vehicles) ── */
export const StatBars: React.FC<{ data: { label: string; value: number; color: string }[]; unit?: string }> = ({ data, unit }) => {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div>
      {data.map((d) => (
        <div className="statbar-row" key={d.label}>
          <span className="statbar-label">{d.label}</span>
          <span className="statbar-track"><span className="statbar-fill" style={{ width: `${(d.value / max) * 100}%`, background: d.color }} /></span>
          <span className="statbar-val">{d.value}{unit}</span>
        </div>
      ))}
    </div>
  );
};

/* ── Vertical bar chart (monthly revenue) ── */
export const BarChart: React.FC<{ data: { month: string; value: number }[] }> = ({ data }) => {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div className="bars">
      {data.map((d) => (
        <div className="bar-col" key={d.month}>
          <span className="bar-val">{d.value}</span>
          <div className="bar" style={{ height: `${(d.value / max) * 100}%` }} />
          <span className="bar-label">{d.month}</span>
        </div>
      ))}
    </div>
  );
};

/* ── Modal ── */
export const Modal: React.FC<{ title: string; onClose: () => void; children: React.ReactNode; footer?: React.ReactNode }> = ({ title, onClose, children, footer }) => (
  <div className="modal-backdrop" onClick={onClose}>
    <div className="modal" onClick={(e) => e.stopPropagation()}>
      <div className="modal-head">
        <h3>{title}</h3>
        <button className="modal-x" onClick={onClose}><IconClose size={18} /></button>
      </div>
      <div className="modal-body">{children}</div>
      {footer && <div className="modal-foot">{footer}</div>}
    </div>
  </div>
);

/* ── Loading spinner ── */
export const Loader: React.FC = () => <div className="center-load"><div className="spinner" /></div>;

/* ── CSV export helper ── */
export function exportCsv(filename: string, rows: Record<string, unknown>[]) {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const esc = (v: unknown) => {
    const s = String(v ?? '');
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = [headers.join(','), ...rows.map((r) => headers.map((h) => esc(r[h])).join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}
