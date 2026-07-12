import React, { useEffect, useState } from 'react';
import { PageHead, CustomSelect } from '../components/ui';
import { ALL_ROLES, RBAC, ROLE_LABELS, SECTION_LABELS } from '../lib/roles';
import { getActivity, clearActivity, type ActivityEvent } from '../lib/activity';
import { fmtDate } from '../lib/status';
import { IconCheck, IconActivity, IconTrash, IconUsers } from '../components/Icons';
import { useAuth } from '../context/AuthContext';
import client from '../api/client';

export const SettingsPage: React.FC = () => {
  const { user } = useAuth();
  const role = user?.role || 'driver';
  const [depot, setDepot] = useState('Gandhinagar Depot #24');
  const [currency, setCurrency] = useState('INR (₹)');
  const [unit, setUnit] = useState('Kilometers');
  const [saved, setSaved] = useState(false);
  const [log, setLog] = useState<ActivityEvent[]>([]);
  const [entityFilter, setEntityFilter] = useState('');

  // User creation state
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserRole, setNewUserRole] = useState('driver');

  useEffect(() => {
    const refresh = () => setLog(getActivity());
    refresh();
    window.addEventListener('activity-log-updated', refresh);
    return () => window.removeEventListener('activity-log-updated', refresh);
  }, []);

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem('settings', JSON.stringify({ depot, currency, unit }));
    setSaved(true); setTimeout(() => setSaved(false), 2000);
  };

  const mark = (a: string) =>
    a === 'crud' ? <span className="rbac-mark rbac-crud">✓</span>
    : a === 'view' ? <span className="rbac-view">view</span>
    : <span className="rbac-none">—</span>;

  const filteredLog = entityFilter ? log.filter((e) => e.entityLabel.toLowerCase().includes(entityFilter.toLowerCase())) : log;

  return (
    <>
      <PageHead title="Settings & RBAC" sub="Depot configuration and role-based access matrix" />

      <div className="two-col">
        <div className="card card-pad">
          <div className="card-title mb-20">General</div>
          <form onSubmit={save}>
            <div className="field"><label>Depot Name</label><input className="input" value={depot} onChange={(e) => setDepot(e.target.value)} /></div>
            <div className="field"><label>Currency</label>
              <CustomSelect value={currency} onChange={setCurrency} options={['INR (₹)', 'USD ($)', 'EUR (€)']} />
            </div>
            <div className="field"><label>Distance Unit</label>
              <CustomSelect value={unit} onChange={setUnit} options={['Kilometers', 'Miles']} />
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
                {ALL_ROLES.map((r) => (
                  <tr key={r}>
                    <td>{ROLE_LABELS[r]}</td>
                    {SECTION_LABELS.map((s) => <td key={s.key}>{mark(RBAC[r][s.key])}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="text-faint" style={{ fontSize: 11.5, marginTop: 12 }}>✓ full CRUD · view read-only · — no access (nav hidden). Enforced at route + action level.</div>
        </div>
      </div>

      <div className="card mt-16">
        <div className="card-head">
          <h3><IconActivity size={13} style={{ verticalAlign: -2, marginRight: 6 }} />Activity Log ({filteredLog.length})</h3>
          <div className="flex gap-8 items-center">
            <input className="input" style={{ width: 160, padding: '6px 10px', fontSize: 12 }} placeholder="Filter by entity…" value={entityFilter} onChange={(e) => setEntityFilter(e.target.value)} />
            <button className="btn btn-ghost btn-sm" onClick={() => { clearActivity(); }}><IconTrash size={13} />Clear</button>
          </div>
        </div>
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Time</th><th>Entity</th><th>Action</th><th>Detail</th><th>Actor</th><th>Role</th></tr></thead>
            <tbody>
              {filteredLog.slice(0, 50).map((e) => (
                <tr key={e.id}>
                  <td className="text-muted" style={{ fontSize: 12 }}>{new Date(e.ts).toLocaleTimeString()} · {fmtDate(e.ts)}</td>
                  <td className="mono td-strong">{e.entity} · {e.entityLabel}</td>
                  <td>{e.action}</td>
                  <td className="text-muted">{e.detail || '—'}</td>
                  <td>{e.actor}</td>
                  <td className="text-faint">{e.role}</td>
                </tr>
              ))}
              {filteredLog.length === 0 && <tr><td colSpan={6} className="empty-row">No activity yet — dispatch a trip or log maintenance to see events here.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card mt-16">
        <div className="card-head">
          <h3><IconUsers size={13} style={{ verticalAlign: -2, marginRight: 6 }} />User Management (Fleet Manager)</h3>
        </div>
        <div className="card-pad" style={{ maxWidth: 600 }}>
          {role !== 'fleet_manager' ? (
            <div className="alert alert-warning">Only Fleet Managers can create new users.</div>
          ) : (
            <form onSubmit={async (e) => {
              e.preventDefault();
              try {
                await client.post('/users', { name: newUserName, email: newUserEmail, password: newUserPassword, role: newUserRole });
                alert('User created successfully!');
                setNewUserName(''); setNewUserEmail(''); setNewUserPassword('');
              } catch (err: any) {
                alert(err.response?.data?.detail || 'Failed to create user');
              }
            }}>
              <div className="field"><label>Name</label><input className="input" value={newUserName} onChange={(e) => setNewUserName(e.target.value)} required /></div>
              <div className="field"><label>Email</label><input className="input" type="email" value={newUserEmail} onChange={(e) => setNewUserEmail(e.target.value)} required /></div>
              <div className="field"><label>Password</label><input className="input" type="password" value={newUserPassword} onChange={(e) => setNewUserPassword(e.target.value)} required placeholder="Min 8 chars, 1 uppercase, 1 digit" /></div>
              <div className="field">
                <label>Role</label>
                <select className="select" value={newUserRole} onChange={(e) => setNewUserRole(e.target.value)}>
                  {ALL_ROLES.map(r => <option key={r} value={r}>{ROLE_LABELS[r as keyof typeof ROLE_LABELS]}</option>)}
                </select>
              </div>
              <button className="btn btn-primary">Create User</button>
            </form>
          )}
        </div>
      </div>
    </>
  );
};
export default SettingsPage;
