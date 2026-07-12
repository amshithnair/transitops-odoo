import React, { useState } from 'react';
import { PageHead } from '../components/ui';
import { ALL_ROLES, RBAC, ROLE_LABELS, SECTION_LABELS } from '../lib/roles';
import { IconCheck } from '../components/Icons';

export const SettingsPage: React.FC = () => {
  const [depot, setDepot] = useState('Gandhinagar Depot #24');
  const [currency, setCurrency] = useState('INR (₹)');
  const [unit, setUnit] = useState('Kilometers');
  const [saved, setSaved] = useState(false);

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem('settings', JSON.stringify({ depot, currency, unit }));
    setSaved(true); setTimeout(() => setSaved(false), 2000);
  };

  const mark = (a: string) =>
    a === 'crud' ? <span className="rbac-mark rbac-crud">✓</span>
    : a === 'view' ? <span className="rbac-view">view</span>
    : <span className="rbac-none">—</span>;

  return (
    <>
      <PageHead title="Settings & RBAC" sub="Depot configuration and role-based access matrix" />

      <div className="two-col">
        <div className="card card-pad">
          <div className="card-title mb-20">General</div>
          <form onSubmit={save}>
            <div className="field"><label>Depot Name</label><input className="input" value={depot} onChange={(e) => setDepot(e.target.value)} /></div>
            <div className="field"><label>Currency</label>
              <select className="select" value={currency} onChange={(e) => setCurrency(e.target.value)}><option>INR (₹)</option><option>USD ($)</option><option>EUR (€)</option></select>
            </div>
            <div className="field"><label>Distance Unit</label>
              <select className="select" value={unit} onChange={(e) => setUnit(e.target.value)}><option>Kilometers</option><option>Miles</option></select>
            </div>
            <button className="btn btn-primary">{saved ? <><IconCheck size={15} />Saved</> : 'Save Changes'}</button>
          </form>
        </div>

        <div className="card card-pad">
          <div className="card-title mb-20">Role-Based Access (RBAC)</div>
          <div className="table-wrap">
            <table className="rbac-table">
              <thead>
                <tr><th>Role</th>{SECTION_LABELS.map((s) => <th key={s.key}>{s.label}</th>)}</tr>
              </thead>
              <tbody>
                {ALL_ROLES.map((role) => (
                  <tr key={role}>
                    <td>{ROLE_LABELS[role]}</td>
                    {SECTION_LABELS.map((s) => <td key={s.key}>{mark(RBAC[role][s.key])}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="text-faint" style={{ fontSize: 11.5, marginTop: 12 }}>✓ full CRUD · view read-only · — no access (nav hidden). Enforced at route + action level.</div>
        </div>
      </div>
    </>
  );
};
export default SettingsPage;
