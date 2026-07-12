import React, { useState, useRef, useEffect } from 'react';
import { statusColor, type BadgeColor } from '../lib/status';
import { IconClose, IconCheck } from './Icons';

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
export const Modal: React.FC<{ 
  title: string; 
  onClose: () => void; 
  children: React.ReactNode; 
  footer?: React.ReactNode;
  splitIcon?: React.ReactNode;
  splitTitle?: string;
  splitDesc?: string;
  variant?: 'confirm' | 'default';
  icon?: React.ReactNode;
}> = ({ title, onClose, children, footer, splitIcon, splitTitle, splitDesc, variant = 'default', icon }) => (
  <div className="modal-backdrop" onClick={onClose}>
    <div className={`modal ${splitIcon ? 'modal-split' : ''} ${variant === 'confirm' ? 'modal-confirm' : ''}`} onClick={(e) => e.stopPropagation()}>
      {variant === 'confirm' ? (
        <div className="modal-confirm-content">
          <button className="modal-x" onClick={onClose}><IconClose size={18} /></button>
          {icon && <div className="modal-confirm-icon">{icon}</div>}
          <h3 className="modal-confirm-title">{title}</h3>
          <div className="modal-confirm-text">{children}</div>
          {footer && <div className="modal-confirm-foot">{footer}</div>}
        </div>
      ) : (
        <>
          {splitIcon && (
            <div className="modal-left-panel">
              <div className="mlp-content">
                <div className="mlp-icon">{splitIcon}</div>
                <h2 className="mlp-title">{splitTitle || title}</h2>
                {splitDesc && <p className="mlp-desc">{splitDesc}</p>}
              </div>
            </div>
          )}
          <div className="modal-right-panel">
            <div className="modal-head">
              <h3>{title}</h3>
              <button className="modal-x" onClick={onClose}><IconClose size={18} /></button>
            </div>
            <div className="modal-body">{children}</div>
            {footer && <div className="modal-foot">{footer}</div>}
          </div>
        </>
      )}
    </div>
  </div>
);

/* ── Sortable table header cell ── */
export const Th: React.FC<{ label: string; active?: boolean; arrow?: string; onClick?: () => void }> = ({ label, active, arrow, onClick }) =>
  onClick ? <th><span className="th-sort" onClick={onClick} style={active ? { color: 'var(--text)' } : undefined}>{label}<span className="arrow">{arrow}</span></span></th> : <th>{label}</th>;

/* ── Custom Select (Animated Dropdown) ── */
export const CustomSelect: React.FC<{
  value: string;
  onChange: (val: string) => void;
  options: ({ label: string; value: string } | string)[];
  placeholder?: string;
  disabled?: boolean;
}> = ({ value, onChange, options, placeholder = 'Select...', disabled }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    const clickOut = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', clickOut);
    return () => document.removeEventListener('mousedown', clickOut);
  }, []);

  const normalized = options.map(o => typeof o === 'string' ? { label: o || 'All', value: o } : o);
  const current = normalized.find(o => o.value === value) || { label: placeholder, value: '' };

  return (
    <div className="custom-select-wrap" ref={ref}>
      <button 
        type="button"
        className="custom-select-btn" 
        onClick={() => !disabled && setOpen(!open)}
        disabled={disabled}
        style={disabled ? { opacity: 0.7, cursor: 'not-allowed', background: 'var(--surface-card)' } : {}}
      >
        <span>{current.label}</span>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M6 9l6 6 6-6"/></svg>
      </button>
      {open && (
        <div className="custom-select-menu">
          {normalized.map(opt => {
            const isSelected = opt.value === value;
            return (
              <div 
                key={opt.value} 
                className={`custom-select-opt ${isSelected ? 'selected' : ''}`}
                onClick={() => { onChange(opt.value); setOpen(false); }}
              >
                <span>{opt.label}</span>
                {isSelected && <IconCheck size={14} />}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

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
