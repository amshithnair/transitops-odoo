import React, { useState } from 'react';
import client from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useData } from '../lib/useData';
import { demoVehicles } from '../lib/demo';
import type { Vehicle, PaginatedResponse } from '../lib/types';
import { canEdit } from '../lib/roles';
import { fmtNum, expiryInfo } from '../lib/status';
import { PageHead, Badge, ColorBadge, Modal, exportCsv, Loader } from '../components/ui';
import { IconPlus, IconDownload, IconEdit, IconTrash, IconAlert } from '../components/Icons';

const FUEL_TYPES = ['Diesel', 'Petrol', 'CNG', 'Electric'];
const VEH_TYPES = ['Van', 'Truck', 'Mini'];
const VEH_STATUSES = ['Available', 'On Trip', 'In Shop', 'Retired'];

const blank = (): Vehicle => ({ id: '', registration_number: '', name_model: '', type: 'Van', max_load_capacity_kg: 500, odometer_km: 0, acquisition_cost: 0, status: 'Available', region: '', manufacturer: '', fuel_type: 'Diesel', purchase_date: '', insurance_expiry: '', fitness_expiry: '', puc_expiry: '' });

export const VehiclesPage: React.FC = () => {
  const { user } = useAuth();
  const editable = canEdit(user?.role, 'fleet');

  const [q, setQ] = useState('');
  const [type, setType] = useState('');
  const [statusF, setStatusF] = useState('');
  const [fuelType, setFuelType] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const params: Record<string, unknown> = { page, page_size: pageSize };
  if (type) params.type = type;
  if (statusF) params.status = statusF;
  if (fuelType) params.fuel_type = fuelType;
  if (q) params.search = q;

  const { data, loading, reload } = useData<PaginatedResponse<Vehicle>>('/vehicles', { items: demoVehicles, total: demoVehicles.length, page: 1, page_size: 20 }, params);

  const rows = data?.items ?? demoVehicles;
  const total = data?.total ?? rows.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const [form, setForm] = useState<Vehicle | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form) return;
    setErr(null);
    try {
      if (form.id) await client.put(`/vehicles/${form.id}`, form);
      else await client.post('/vehicles', form);
      setForm(null); reload();
    } catch (e2: unknown) {
      const r = e2 as { response?: { data?: { detail?: string } } };
      setErr(r.response?.data?.detail || 'Save failed.');
    }
  };

  const remove = async (v: Vehicle) => {
    if (!confirm(`Remove ${v.registration_number}?`)) return;
    try { await client.delete(`/vehicles/${v.id}`); reload(); }
    catch { /* already deleted or offline */ }
  };

  return (
    <>
      <PageHead title="Vehicle Registry" sub={`${total} vehicles in fleet`}>
        <button className="btn btn-ghost" onClick={() => exportCsv('vehicles.csv', rows as unknown as Record<string, unknown>[])}><IconDownload size={15} />CSV</button>
        {editable && <button className="btn btn-primary" onClick={() => { setErr(null); setForm(blank()); }}><IconPlus size={15} />Add Vehicle</button>}
      </PageHead>

      {!editable && <div className="view-note"><IconAlert size={15} />You have view-only access to Fleet — contact a Fleet Manager to modify.</div>}

      <div className="filters">
        <div className="filter-group"><label>Search</label><input className="input" placeholder="Reg No, Model, Manufacturer…" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} /></div>
        <div className="filter-group"><label>Type</label><select className="select" value={type} onChange={(e) => { setType(e.target.value); setPage(1); }}><option value="">All</option>{VEH_TYPES.map(t => <option key={t}>{t}</option>)}</select></div>
        <div className="filter-group"><label>Status</label><select className="select" value={statusF} onChange={(e) => { setStatusF(e.target.value); setPage(1); }}><option value="">All</option>{VEH_STATUSES.map(s => <option key={s}>{s}</option>)}</select></div>
        <div className="filter-group"><label>Fuel Type</label><select className="select" value={fuelType} onChange={(e) => { setFuelType(e.target.value); setPage(1); }}><option value="">All</option>{FUEL_TYPES.map(f => <option key={f}>{f}</option>)}</select></div>
      </div>

      {loading ? <Loader /> : (
        <div className="card">
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>Reg. No.</th><th>Name / Model</th><th>Type</th><th>Fuel</th><th>Capacity</th><th>Odometer</th><th>Insurance</th><th>Status</th>{editable && <th></th>}</tr></thead>
              <tbody>
                {rows.map((v) => {
                  const insExp = v.insurance_expiry ? expiryInfo(v.insurance_expiry) : null;
                  return (
                    <tr key={v.id}>
                      <td className="mono td-strong">{v.registration_number}</td>
                      <td>{v.name_model}{v.manufacturer ? <span className="text-faint"> · {v.manufacturer}</span> : ''}</td>
                      <td>{v.type}</td>
                      <td>{v.fuel_type || '—'}</td>
                      <td>{fmtNum(v.max_load_capacity_kg)} kg</td>
                      <td>{fmtNum(v.odometer_km)} km</td>
                      <td>{insExp ? <ColorBadge color={insExp.color}>{insExp.label}</ColorBadge> : '—'}</td>
                      <td><Badge status={v.status} /></td>
                      {editable && <td><div className="flex gap-8"><button className="icon-btn" onClick={() => { setErr(null); setForm(v); }}><IconEdit size={15} /></button><button className="icon-btn" onClick={() => remove(v)}><IconTrash size={15} /></button></div></td>}
                    </tr>
                  );
                })}
                {!loading && rows.length === 0 && <tr><td colSpan={editable ? 9 : 8} className="empty-row">No vehicles match your filters.</td></tr>}
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

      <div className="rule-note"><IconAlert size={15} />Rule: Registration No. must be unique · Retired / In Shop vehicles are hidden from the Trip Dispatcher.</div>

      {form && (
        <Modal title={form.id ? 'Edit Vehicle' : 'Register New Vehicle'} onClose={() => setForm(null)}
          footer={<><button className="btn btn-ghost" onClick={() => setForm(null)}>Cancel</button><button className="btn btn-primary" form="veh-form">Save Vehicle</button></>}>
          <form id="veh-form" onSubmit={save}>
            {err && <div className="alert alert-danger">{err}</div>}
            <div className="field"><label>Registration Number (unique)</label><input className="input" required value={form.registration_number} onChange={(e) => setForm({ ...form, registration_number: e.target.value })} placeholder="VAN-05" /></div>
            <div className="field-row">
              <div className="field"><label>Name / Model</label><input className="input" required value={form.name_model} onChange={(e) => setForm({ ...form, name_model: e.target.value })} placeholder="Ford Transit 2024" /></div>
              <div className="field"><label>Manufacturer</label><input className="input" value={form.manufacturer || ''} onChange={(e) => setForm({ ...form, manufacturer: e.target.value })} placeholder="Ford" /></div>
            </div>
            <div className="field-row">
              <div className="field"><label>Type</label><select className="select" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>{VEH_TYPES.map(t => <option key={t}>{t}</option>)}</select></div>
              <div className="field"><label>Fuel Type</label><select className="select" value={form.fuel_type || 'Diesel'} onChange={(e) => setForm({ ...form, fuel_type: e.target.value })}>{FUEL_TYPES.map(f => <option key={f}>{f}</option>)}</select></div>
            </div>
            <div className="field-row">
              <div className="field"><label>Max Load (kg)</label><input className="input" type="number" min={1} required value={form.max_load_capacity_kg} onChange={(e) => setForm({ ...form, max_load_capacity_kg: +e.target.value })} /></div>
              <div className="field"><label>Odometer (km)</label><input className="input" type="number" min={0} value={form.odometer_km} onChange={(e) => setForm({ ...form, odometer_km: +e.target.value })} /></div>
            </div>
            <div className="field-row">
              <div className="field"><label>Acquisition Cost (₹)</label><input className="input" type="number" min={0} value={form.acquisition_cost} onChange={(e) => setForm({ ...form, acquisition_cost: +e.target.value })} /></div>
              <div className="field"><label>Purchase Date</label><input className="input" type="date" value={form.purchase_date || ''} onChange={(e) => setForm({ ...form, purchase_date: e.target.value || null })} /></div>
            </div>
            <div className="field-row">
              <div className="field"><label>Status</label><select className="select" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>{VEH_STATUSES.map(s => <option key={s}>{s}</option>)}</select></div>
              <div className="field"><label>Region</label><input className="input" value={form.region || ''} onChange={(e) => setForm({ ...form, region: e.target.value })} placeholder="North" /></div>
            </div>
            <div className="field-row">
              <div className="field"><label>Insurance Expiry</label><input className="input" type="date" value={form.insurance_expiry || ''} onChange={(e) => setForm({ ...form, insurance_expiry: e.target.value || null })} /></div>
              <div className="field"><label>Fitness Expiry</label><input className="input" type="date" value={form.fitness_expiry || ''} onChange={(e) => setForm({ ...form, fitness_expiry: e.target.value || null })} /></div>
            </div>
            <div className="field"><label>PUC Expiry</label><input className="input" type="date" value={form.puc_expiry || ''} onChange={(e) => setForm({ ...form, puc_expiry: e.target.value || null })} /></div>
          </form>
        </Modal>
      )}
    </>
  );
};
export default VehiclesPage;
