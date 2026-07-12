import React, { useState } from 'react';
import client from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useData } from '../lib/useData';
import { demoDrivers, demoVehicles } from '../lib/demo';
import type { Driver, Vehicle, PaginatedResponse } from '../lib/types';
import { canEdit } from '../lib/roles';
import { safetyColor, expiryInfo, fmtDate } from '../lib/status';
import { PageHead, Badge, ColorBadge, Modal, exportCsv, Loader } from '../components/ui';
import { IconPlus, IconDownload, IconEdit, IconTrash, IconAlert } from '../components/Icons';

const DRIVER_STATUSES = ['Available', 'On Trip', 'Off Duty', 'Suspended'];
const blank = (): Driver => ({ id: '', name: '', license_number: '', license_category: 'LMV', license_expiry_date: '', contact_number: '', email: '', experience_years: 0, safety_score: 80, status: 'Available' });

export const DriversPage: React.FC = () => {
  const { user } = useAuth();
  const editable = canEdit(user?.role, 'drivers');

  const [q, setQ] = useState('');
  const [statusF, setStatusF] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const params: Record<string, unknown> = { page, page_size: pageSize };
  if (statusF) params.status = statusF;
  if (q) params.search = q;

  const { data, loading, reload } = useData<PaginatedResponse<Driver>>('/drivers', { items: demoDrivers, total: demoDrivers.length, page: 1, page_size: 20 }, params);
  const { data: vehData } = useData<PaginatedResponse<Vehicle>>('/vehicles', { items: demoVehicles, total: demoVehicles.length, page: 1, page_size: 100 });
  const vehicles = vehData?.items ?? demoVehicles;

  const rows = data?.items ?? demoDrivers;
  const total = data?.total ?? rows.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const [form, setForm] = useState<Driver | null>(null);
  const [override, setOverride] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form) return;
    setErr(null);
    const exp = expiryInfo(form.license_expiry_date);
    if (exp.expired && !override) { setErr('License expiry is in the past. Tick the override to save anyway.'); return; }
    try {
      if (form.id) await client.put(`/drivers/${form.id}`, form);
      else await client.post('/drivers', form);
      setForm(null); reload();
    } catch (e2: unknown) {
      const r = e2 as { response?: { data?: { detail?: string } } };
      setErr(r.response?.data?.detail || 'Save failed.');
    }
  };

  const remove = async (d: Driver) => {
    if (!confirm(`Remove driver ${d.name}?`)) return;
    try { await client.delete(`/drivers/${d.id}`); reload(); }
    catch { /* already deleted or offline */ }
  };

  return (
    <>
      <PageHead title="Drivers & Safety Profiles" sub={`${total} drivers`}>
        <button className="btn btn-ghost" onClick={() => exportCsv('drivers.csv', rows as unknown as Record<string, unknown>[])}><IconDownload size={15} />CSV</button>
        {editable && <button className="btn btn-primary" onClick={() => { setErr(null); setOverride(false); setForm(blank()); }}><IconPlus size={15} />Add Driver</button>}
      </PageHead>

      {!editable && <div className="view-note"><IconAlert size={15} />View-only access to Drivers — contact a Safety Officer or Fleet Manager to modify.</div>}

      <div className="filters">
        <div className="filter-group"><label>Search</label><input className="input" placeholder="Name, license, email…" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} /></div>
        <div className="filter-group"><label>Status</label><select className="select" value={statusF} onChange={(e) => { setStatusF(e.target.value); setPage(1); }}><option value="">All</option>{DRIVER_STATUSES.map(s => <option key={s}>{s}</option>)}</select></div>
      </div>

      {loading ? <Loader /> : (
        <div className="card">
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>Driver</th><th>License No.</th><th>Category</th><th>Expiry</th><th>Contact</th><th>Exp. (yrs)</th><th>Safety</th><th>Assigned Vehicle</th><th>Status</th>{editable && <th></th>}</tr></thead>
              <tbody>
                {rows.map((d) => {
                  const exp = expiryInfo(d.license_expiry_date);
                  return (
                    <tr key={d.id} className={exp.expired ? 'row-danger' : ''}>
                      <td className="td-strong">{d.name}{d.email ? <div className="text-faint" style={{ fontSize: 11 }}>{d.email}</div> : ''}</td>
                      <td className="mono">{d.license_number}</td>
                      <td>{d.license_category}</td>
                      <td><ColorBadge color={exp.color}>{fmtDate(d.license_expiry_date)} · {exp.label}</ColorBadge></td>
                      <td className="text-muted">{d.contact_number || '—'}</td>
                      <td>{d.experience_years ?? '—'}</td>
                      <td><ColorBadge color={safetyColor(d.safety_score)}>{d.safety_score}</ColorBadge></td>
                      <td className="mono text-muted">{d.assigned_vehicle_registration || '—'}</td>
                      <td><Badge status={d.status} /></td>
                      {editable && <td><div className="flex gap-8"><button className="icon-btn" onClick={() => { setErr(null); setOverride(false); setForm(d); }}><IconEdit size={15} /></button><button className="icon-btn" onClick={() => remove(d)}><IconTrash size={15} /></button></div></td>}
                    </tr>
                  );
                })}
                {rows.length === 0 && <tr><td colSpan={editable ? 10 : 9} className="empty-row">No drivers match your filters.</td></tr>}
              </tbody>
            </table>
          </div>
          {totalPages > 1 && (
            <div className="pagination">
              <button className="btn btn-sm btn-ghost" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>← Prev</button>
              <span className="page-info">Page {page} of {totalPages} ({total} total)</span>
              <button className="btn btn-sm btn-ghost" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Next →</button>
            </div>
          )}
        </div>
      )}

      <div className="rule-note"><IconAlert size={15} />Rule: Expired license or Suspended status → driver is blocked from trip assignment.</div>

      {form && (
        <Modal title={form.id ? 'Edit Driver' : 'Add Driver'} onClose={() => setForm(null)}
          footer={<><button className="btn btn-ghost" onClick={() => setForm(null)}>Cancel</button><button className="btn btn-primary" form="drv-form">Save Driver</button></>}>
          <form id="drv-form" onSubmit={save}>
            {err && <div className="alert alert-danger">{err}</div>}
            <div className="field-row">
              <div className="field"><label>Name</label><input className="input" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
              <div className="field"><label>Email</label><input className="input" type="email" value={form.email || ''} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="alex@transitops.com" /></div>
            </div>
            <div className="field-row">
              <div className="field"><label>License Number</label><input className="input" required value={form.license_number} onChange={(e) => setForm({ ...form, license_number: e.target.value })} placeholder="DL-2024-0042" /></div>
              <div className="field"><label>Category</label><select className="select" value={form.license_category} onChange={(e) => setForm({ ...form, license_category: e.target.value })}><option>LMV</option><option>HMV</option><option>MGV</option><option>B</option><option>C</option><option>C+E</option></select></div>
            </div>
            <div className="field-row">
              <div className="field"><label>License Expiry</label><input className="input" type="date" required value={form.license_expiry_date} onChange={(e) => setForm({ ...form, license_expiry_date: e.target.value })} /></div>
              <div className="field"><label>Contact</label><input className="input" value={form.contact_number || ''} onChange={(e) => setForm({ ...form, contact_number: e.target.value })} /></div>
            </div>
            <div className="field-row">
              <div className="field"><label>Experience (years)</label><input className="input" type="number" min={0} value={form.experience_years ?? ''} onChange={(e) => setForm({ ...form, experience_years: e.target.value ? +e.target.value : null })} /></div>
              <div className="field"><label>Safety Score</label><input className="input" type="number" min={0} max={100} value={form.safety_score} onChange={(e) => setForm({ ...form, safety_score: +e.target.value })} /></div>
            </div>
            <div className="field-row">
              <div className="field"><label>Status</label><select className="select" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>{DRIVER_STATUSES.map((s) => <option key={s}>{s}</option>)}</select></div>
              <div className="field"><label>Assigned Vehicle</label><select className="select" value={form.assigned_vehicle_id || ''} onChange={(e) => setForm({ ...form, assigned_vehicle_id: e.target.value || null })}><option value="">None</option>{vehicles.map(v => <option key={v.id} value={v.id}>{v.registration_number}</option>)}</select></div>
            </div>
            <label className="checkbox"><input type="checkbox" checked={override} onChange={(e) => setOverride(e.target.checked)} />Override — allow save with expired license</label>
          </form>
        </Modal>
      )}
    </>
  );
};
export default DriversPage;
