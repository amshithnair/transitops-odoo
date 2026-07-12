import React, { useState } from 'react';
import client from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useData, filterBy } from '../lib/useData';
import { useSort } from '../lib/useSort';
import { demoDrivers } from '../lib/demo';
import type { Driver } from '../lib/types';
import { canEdit } from '../lib/roles';
import { safetyColor, expiryInfo, fmtDate } from '../lib/status';
import { PageHead, Badge, ColorBadge, Modal, exportCsv, Th, CustomSelect } from '../components/ui';
import { IconPlus, IconDownload, IconEdit, IconTrash, IconAlert, IconUsers } from '../components/Icons';

const DRIVER_STATUSES = ['Available', 'On Trip', 'Off Duty', 'Suspended'];
const blank = (): Driver => ({ id: '', name: '', license_number: '', license_category: 'LMV', license_expiry: '', contact_number: '', safety_score: 80, trip_completion_pct: 100, status: 'Available' });

export const DriversPage: React.FC = () => {
  const { user } = useAuth();
  const editable = canEdit(user?.role, 'drivers');
  const { data, reload, setData } = useData<Driver[]>('/drivers', demoDrivers);
  const rows = Array.isArray(data) ? data : demoDrivers;

  const [q, setQ] = useState('');
  const [selected, setSelected] = useState<string | null>(null);
  const [form, setForm] = useState<Driver | null>(null);
  const [override, setOverride] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const filtered = filterBy(rows, q, ['name', 'license_number', 'license_category']);
  const { sorted, toggle, arrow } = useSort<Driver>(filtered);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form) return;
    setErr(null);
    const exp = expiryInfo(form.license_expiry);
    if (exp.expired && !override) { setErr('License expiry is in the past. Tick the override to save anyway.'); return; }
    try {
      if (form.id) await client.put(`/drivers/${form.id}`, form);
      else await client.post('/drivers', form);
      setForm(null); reload();
    } catch (e2: unknown) {
      const r = e2 as { response?: { data?: { detail?: string } } };
      if (r.response) { setErr(r.response.data?.detail || 'Save failed.'); return; }
      setData(form.id ? rows.map((d) => (d.id === form.id ? form : d)) : [...rows, { ...form, id: `d${Date.now()}` }]);
      setForm(null);
    }
  };

  const setStatus = async (s: string) => {
    if (!selected) return;
    setData(rows.map((d) => (d.id === selected ? { ...d, status: s } : d)));
    try { await client.patch(`/drivers/${selected}`, { status: s }); } catch { /* offline demo: local only */ }
  };

  const remove = async (d: Driver) => {
    if (!confirm(`Remove driver ${d.name}?`)) return;
    try { await client.delete(`/drivers/${d.id}`); reload(); } catch { setData(rows.filter((x) => x.id !== d.id)); }
  };

  const selDriver = rows.find((d) => d.id === selected);

  return (
    <>
      <PageHead title="Drivers & Safety Profiles" sub={`${rows.length} drivers`}>
        <button className="btn btn-ghost" onClick={() => exportCsv('drivers.csv', filtered as unknown as Record<string, unknown>[])}><IconDownload size={15} />CSV</button>
        {editable && <button className="btn btn-primary" onClick={() => { setErr(null); setOverride(false); setForm(blank()); }}><IconPlus size={15} />Add Driver</button>}
      </PageHead>

      {!editable && <div className="view-note"><IconAlert size={15} />View-only access to Drivers — contact a Safety Officer or Fleet Manager to modify.</div>}

      <div className="filters">
        <div className="filter-group"><label>Search</label><input className="input" placeholder="Name or license…" value={q} onChange={(e) => setQ(e.target.value)} /></div>
      </div>

      <div className="card">
        <div className="table-wrap">
          <table className="table">
            <thead><tr>
              <Th label="Driver" arrow={arrow('name')} onClick={() => toggle('name')} />
              <Th label="License No." arrow={arrow('license_number')} onClick={() => toggle('license_number')} />
              <Th label="Category" arrow={arrow('license_category')} onClick={() => toggle('license_category')} />
              <Th label="Expiry" arrow={arrow('license_expiry')} onClick={() => toggle('license_expiry')} />
              <th>Contact</th>
              <Th label="Trip Compl." arrow={arrow('trip_completion_pct')} onClick={() => toggle('trip_completion_pct')} />
              <Th label="Safety" arrow={arrow('safety_score')} onClick={() => toggle('safety_score')} />
              <Th label="Status" arrow={arrow('status')} onClick={() => toggle('status')} />
              {editable && <th></th>}
            </tr></thead>
            <tbody>
              {sorted.map((d) => {
                const exp = expiryInfo(d.license_expiry);
                return (
                  <tr key={d.id} className={exp.expired ? 'row-danger' : ''} onClick={() => editable && setSelected(d.id)} style={{ cursor: editable ? 'pointer' : 'default', outline: selected === d.id ? '2px solid var(--accent)' : 'none', outlineOffset: -2 }}>
                    <td className="td-strong">{d.name}</td>
                    <td className="mono">{d.license_number}</td>
                    <td>{d.license_category}</td>
                    <td><ColorBadge color={exp.color}>{fmtDate(d.license_expiry)} · {exp.label}</ColorBadge></td>
                    <td className="text-muted">{d.contact_number}</td>
                    <td>{d.trip_completion_pct ?? '—'}%</td>
                    <td><ColorBadge color={safetyColor(d.safety_score)}>{d.safety_score}</ColorBadge></td>
                    <td><Badge status={d.status} /></td>
                    {editable && <td><div className="flex gap-8"><button className="icon-btn" onClick={(e) => { e.stopPropagation(); setErr(null); setOverride(false); setForm(d); }}><IconEdit size={15} /></button><button className="icon-btn" onClick={(e) => { e.stopPropagation(); remove(d); }}><IconTrash size={15} /></button></div></td>}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {editable && (
        <div className="card card-pad mt-16">
          <div className="klabel" style={{ marginBottom: 10 }}>Toggle Status {selDriver ? `— ${selDriver.name}` : '(select a driver row)'}</div>
          <div className="flex gap-8" style={{ flexWrap: 'wrap' }}>
            {DRIVER_STATUSES.map((s) => (
              <button key={s} className={`pill ${selDriver?.status === s ? 'active' : ''}`} disabled={!selected} onClick={() => setStatus(s)}>{s}</button>
            ))}
          </div>
        </div>
      )}

      <div className="rule-note"><IconAlert size={15} />Rule: Expired license or Suspended status → driver is blocked from trip assignment.</div>

      {form && (
        <Modal 
          title={form.id ? 'Edit Driver' : 'Register New Driver'} 
          splitIcon={<IconUsers size={32} />}
          splitTitle="Driver Profile"
          splitDesc="Manage driver licensing, safety scores, and operational status."
          onClose={() => setForm(null)}
          footer={<><button className="btn btn-ghost" onClick={() => setForm(null)}>Cancel</button><button className="btn btn-primary" form="drv-form">Save Driver</button></>}>
          <form id="drv-form" onSubmit={save}>
            {err && <div className="alert alert-danger">{err}</div>}
            <div className="field"><label>Name</label><input className="input" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div className="field-row">
              <div className="field"><label>License Number</label><input className="input" required value={form.license_number} onChange={(e) => setForm({ ...form, license_number: e.target.value })} placeholder="DL-88213" /></div>
              <div className="field"><label>Category</label><CustomSelect value={form.license_category} onChange={(v) => setForm({ ...form, license_category: v })} options={['LMV', 'HMV', 'MGV']} /></div>
            </div>
            <div className="field-row">
              <div className="field"><label>License Expiry</label><input className="input" type="date" required value={form.license_expiry} onChange={(e) => setForm({ ...form, license_expiry: e.target.value })} /></div>
              <div className="field"><label>Contact</label><input className="input" value={form.contact_number} onChange={(e) => setForm({ ...form, contact_number: e.target.value })} /></div>
            </div>
            <div className="field-row">
              <div className="field"><label>Safety Score</label><input className="input" type="number" min={0} max={100} value={form.safety_score} onChange={(e) => setForm({ ...form, safety_score: +e.target.value })} /></div>
              <div className="field"><label>Status</label><CustomSelect value={form.status} onChange={(v) => setForm({ ...form, status: v })} options={DRIVER_STATUSES} /></div>
            </div>
            <label className="checkbox"><input type="checkbox" checked={override} onChange={(e) => setOverride(e.target.checked)} />Override — allow save with expired license</label>
          </form>
        </Modal>
      )}
    </>
  );
};
export default DriversPage;
