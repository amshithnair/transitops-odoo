import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import client from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useData, filterBy } from '../lib/useData';
import { useSort } from '../lib/useSort';
import type { Vehicle } from '../lib/types';
import { canEdit } from '../lib/roles';
import { fmtNum } from '../lib/status';
import { PageHead, Badge, Modal, exportCsv, Th } from '../components/ui';
import { IconPlus, IconDownload, IconEdit, IconTrash, IconAlert, IconFile, IconUpload } from '../components/Icons';

const blank = (): Vehicle => ({ id: '', registration_number: '', name_model: '', type: 'Van', max_load_capacity_kg: 500, odometer_km: 0, acquisition_cost: 0, status: 'Available', region: '' });

export const VehiclesPage: React.FC = () => {
  const { user } = useAuth();
  const editable = canEdit(user?.role, 'fleet');
  const { data, loading, reload, setData } = useData<Vehicle[]>('/vehicles', []);
  const rows = Array.isArray(data) ? data : [];

  const [q, setQ] = useState('');
  const [type, setType] = useState('');
  const [status, setStatus] = useState('');
  const [form, setForm] = useState<Vehicle | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const filtered = filterBy(rows, q, ['registration_number', 'name_model'])
    .filter((v) => !type || v.type === type)
    .filter((v) => !status || v.status === status);
  const { sorted, toggle, arrow } = useSort<Vehicle>(filtered);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form) return;
    setErr(null);
    // client-side uniqueness guard (server also enforces)
    const dupe = rows.some((v) => v.registration_number.toLowerCase() === form.registration_number.toLowerCase() && v.id !== form.id);
    if (dupe) { setErr(`Registration number "${form.registration_number}" already exists.`); return; }
    try {
      if (form.id) await client.put(`/vehicles/${form.id}`, form);
      else await client.post('/vehicles', form);
      setForm(null); reload();
    } catch (e2: unknown) {
      const r = e2 as { response?: { data?: { detail?: string } } };
      if (r.response) { setErr(r.response.data?.detail || 'Save failed.'); return; }
    }
  };

  const remove = async (v: Vehicle) => {
    if (!confirm(`Remove ${v.registration_number}?`)) return;
    try { await client.delete(`/vehicles/${v.id}`); reload(); }
    catch { setData(rows.filter((x) => x.id !== v.id)); }
  };

  return (
    <>
      <PageHead title="Vehicle Registry" sub={`${rows.length} vehicles in fleet`}>
        <button className="btn btn-ghost" onClick={() => exportCsv('vehicles.csv', filtered as unknown as Record<string, unknown>[])}><IconDownload size={15} />CSV</button>
        {editable && <button className="btn btn-primary" onClick={() => { setErr(null); setForm(blank()); }}><IconPlus size={15} />Add Vehicle</button>}
      </PageHead>

      {!editable && <div className="view-note"><IconAlert size={15} />You have view-only access to Fleet — contact a Fleet Manager to modify.</div>}

      <div className="filters">
        <div className="filter-group"><label>Search Reg. No.</label><input className="input" placeholder="e.g. VAN-05" value={q} onChange={(e) => setQ(e.target.value)} /></div>
        <div className="filter-group"><label>Type</label><select className="select" value={type} onChange={(e) => setType(e.target.value)}><option value="">All</option><option>Van</option><option>Truck</option><option>Mini</option></select></div>
        <div className="filter-group"><label>Status</label><select className="select" value={status} onChange={(e) => setStatus(e.target.value)}><option value="">All</option><option>Available</option><option>On Trip</option><option>In Shop</option><option>Retired</option></select></div>
      </div>

      <div className="card">
        <div className="table-wrap">
          <table className="table">
            <thead><tr>
              <Th label="Reg. No." arrow={arrow('registration_number')} onClick={() => toggle('registration_number')} />
              <Th label="Name / Model" arrow={arrow('name_model')} onClick={() => toggle('name_model')} />
              <Th label="Type" arrow={arrow('type')} onClick={() => toggle('type')} />
              <Th label="Capacity" arrow={arrow('max_load_capacity_kg')} onClick={() => toggle('max_load_capacity_kg')} />
              <Th label="Odometer" arrow={arrow('odometer_km')} onClick={() => toggle('odometer_km')} />
              <Th label="Acq. Cost" arrow={arrow('acquisition_cost')} onClick={() => toggle('acquisition_cost')} />
              <Th label="Status" arrow={arrow('status')} onClick={() => toggle('status')} />
              {editable && <th></th>}
            </tr></thead>
            <tbody>
              {sorted.map((v) => (
                <tr key={v.id}>
                  <td className="mono td-strong">
                    <Link to={`/vehicles/${v.id}/passport`} className="link">
                      {v.registration_number}
                    </Link>
                  </td>
                  <td>{v.name_model}</td>
                  <td>{v.type}</td>
                  <td>{fmtNum(v.max_load_capacity_kg)} kg</td>
                  <td>{fmtNum(v.odometer_km)} km</td>
                  <td>₹{fmtNum(v.acquisition_cost)}</td>
                  <td><Badge status={v.status} /></td>
                  {editable && <td><div className="flex gap-8"><button className="icon-btn" onClick={() => { setErr(null); setForm(v); }}><IconEdit size={15} /></button><button className="icon-btn" onClick={() => remove(v)}><IconTrash size={15} /></button></div></td>}
                </tr>
              ))}
              {!loading && filtered.length === 0 && <tr><td colSpan={editable ? 8 : 7} className="empty-row">No vehicles match your filters.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rule-note"><IconAlert size={15} />Rule: Registration No. must be unique · Retired / In Shop vehicles are hidden from the Trip Dispatcher.</div>

      {form && (
        <Modal title={form.id ? 'Edit Vehicle' : 'Register New Vehicle'} onClose={() => setForm(null)}
          footer={<><button className="btn btn-ghost" onClick={() => setForm(null)}>Cancel</button><button className="btn btn-primary" form="veh-form">Save Vehicle</button></>}>
          <form id="veh-form" onSubmit={save}>
            {err && <div className="alert alert-danger">{err}</div>}
            <div className="field"><label>Registration Number (unique)</label><input className="input" required value={form.registration_number} onChange={(e) => setForm({ ...form, registration_number: e.target.value })} placeholder="VAN-05" /></div>
            <div className="field"><label>Name / Model</label><input className="input" required value={form.name_model} onChange={(e) => setForm({ ...form, name_model: e.target.value })} placeholder="Force Traveller" /></div>
            <div className="field-row">
              <div className="field"><label>Type</label><select className="select" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}><option>Van</option><option>Truck</option><option>Mini</option></select></div>
              <div className="field"><label>Max Load (kg)</label><input className="input" type="number" min={1} required value={form.max_load_capacity_kg} onChange={(e) => setForm({ ...form, max_load_capacity_kg: +e.target.value })} /></div>
            </div>
            <div className="field-row">
              <div className="field"><label>Odometer (km)</label><input className="input" type="number" min={0} value={form.odometer_km} onChange={(e) => setForm({ ...form, odometer_km: +e.target.value })} /></div>
              <div className="field"><label>Acquisition Cost (₹)</label><input className="input" type="number" min={0} value={form.acquisition_cost} onChange={(e) => setForm({ ...form, acquisition_cost: +e.target.value })} /></div>
            </div>
            <div className="field-row">
              <div className="field"><label>Status</label><select className="select" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}><option>Available</option><option>On Trip</option><option>In Shop</option><option>Retired</option></select></div>
              <div className="field"><label>Region</label><input className="input" value={form.region || ''} onChange={(e) => setForm({ ...form, region: e.target.value })} placeholder="North" /></div>
            </div>

            <div className="field">
              <label>Documents (RC / Insurance / Permit)</label>
              <div className="flex gap-8" style={{ flexWrap: 'wrap', marginBottom: 8 }}>
                {(form.documents || []).map((d) => (
                  <span className="badge b-blue" key={d.id}><IconFile size={11} />{d.label}: {d.filename}</span>
                ))}
                {(!form.documents || form.documents.length === 0) && <span className="text-faint" style={{ fontSize: 12 }}>No documents uploaded yet.</span>}
              </div>
              <div className="field-row">
                {(['RC', 'Insurance', 'Permit'] as const).map((label) => (
                  <label key={label} className="btn btn-ghost btn-sm" style={{ cursor: 'pointer' }}>
                    <IconUpload size={13} />{label}
                    <input type="file" accept="image/*,.pdf" style={{ display: 'none' }} onChange={(e) => {
                      const file = e.target.files?.[0]; if (!file || !form) return;
                      const reader = new FileReader();
                      reader.onload = () => {
                        const doc = { id: `doc${Date.now()}`, label, filename: file.name, dataUrl: String(reader.result), uploaded_at: new Date().toISOString() };
                        setForm({ ...form, documents: [...(form.documents || []).filter((d) => d.label !== label), doc] });
                      };
                      reader.readAsDataURL(file);
                      e.target.value = '';
                    }} />
                  </label>
                ))}
              </div>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
};
export default VehiclesPage;
