import React, { useState } from 'react';
import client from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useData } from '../hooks/useData';
import type { Maintenance, Vehicle, PaginatedResponse } from '../types';
import { canEdit } from '../utils/roles';
import { fmtNum, fmtDate } from '../utils/status';
import { PageHead, Badge, Loader } from '../components/ui';
import { IconAlert, IconCheck } from '../components/Icons';

export const MaintenancePage: React.FC = () => {
  const { user } = useAuth();
  const editable = canEdit(user?.role, 'fleet');
  const params = { page_size: 20 };
  const { data, loading, error, reload } = useData<PaginatedResponse<Maintenance>>('/maintenance', params);
  const { data: vehData } = useData<PaginatedResponse<Vehicle>>('/vehicles', { page_size: 1000 });

  const rows = data?.items ?? [];
  const vehicles = vehData?.items ?? [];

  const [vehicle, setVehicle] = useState('');
  const [service, setService] = useState('');
  const [cost, setCost] = useState<number>(0);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [status, setStatus] = useState<'Active' | 'Closed'>('Active');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vehicle || !service) return;
    try { 
      await client.post('/maintenance', { vehicle_label: vehicle, service_type: service, cost, date, status }); 
      reload();
    } catch (err) { console.error(err); }
    setVehicle(''); setService(''); setCost(0);
  };

  const toggleClose = async (m: Maintenance) => {
    const nextStatus = m.status === 'Active' ? 'Closed' : 'Active';
    try { 
      await client.patch(`/maintenance/${m.id}`, { status: nextStatus }); 
      reload();
    } catch (err) { console.error(err); }
  };

  return (
    <>
      <PageHead title="Maintenance" sub="Service records & vehicle shop status" />
      {!editable && <div className="view-note"><IconAlert size={15} />View-only — a Fleet Manager logs and closes service records.</div>}

      <div className="two-col">
        {loading ? <Loader /> : error ? (
          <div className="alert alert-danger">{error}</div>
        ) : (
          <>
            <div className="card card-pad">
          <div className="card-title mb-20">Log Service Record</div>
          <form onSubmit={submit}>
            <div className="field-row">
              <div className="field"><label>Vehicle</label>
                <select className="select" value={vehicle} onChange={(e) => setVehicle(e.target.value)} disabled={!editable} required>
                  <option value="">Select vehicle…</option>
                  {vehicles.map((v) => <option key={v.id} value={v.registration_number}>{v.registration_number}</option>)}
                </select>
              </div>
            </div>
            <div className="field"><label>Service Type</label><input className="input" value={service} onChange={(e) => setService(e.target.value)} placeholder="Oil Change" disabled={!editable} required /></div>
            <div className="field-row">
              <div className="field"><label>Cost (₹)</label><input className="input" type="number" min={0} value={cost || ''} onChange={(e) => setCost(+e.target.value)} placeholder="2500" disabled={!editable} /></div>
              <div className="field"><label>Date</label><input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} disabled={!editable} /></div>
            </div>
            <div className="field"><label>Status</label><select className="select" value={status} onChange={(e) => setStatus(e.target.value as 'Active' | 'Closed')} disabled={!editable}><option>Active</option><option>Closed</option></select></div>
            <button className="btn btn-primary btn-block" disabled={!editable}>Save Record</button>
          </form>

          <div className="mt-24" style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>
            <div className="flex items-center gap-8" style={{ marginBottom: 8 }}><span className="badge b-amber">Active</span> → <span className="badge b-amber">Vehicle: In Shop</span></div>
            <div className="flex items-center gap-8"><span className="badge b-green">Closed</span> → <span className="badge b-green">Vehicle: Available</span> <span className="text-faint">(unless Retired)</span></div>
            <div className="rule-note"><IconAlert size={14} />In Shop vehicles are removed from the dispatch pool.</div>
          </div>
        </div>

        <div className="card">
          <div className="card-head"><h3>Service Log</h3></div>
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>Vehicle</th><th>Service</th><th>Cost</th><th>Date</th><th>Status</th>{editable && <th></th>}</tr></thead>
              <tbody>
                {rows.map((m) => (
                  <tr key={m.id}>
                    <td className="mono td-strong">{m.vehicle_label}</td>
                    <td>{m.service_type}</td>
                    <td>₹{fmtNum(m.cost)}</td>
                    <td className="text-muted">{fmtDate(m.date)}</td>
                    <td><Badge status={m.status} /></td>
                    {editable && <td><button className="btn btn-ghost btn-sm" onClick={() => toggleClose(m)}>{m.status === 'Active' ? <><IconCheck size={13} />Close</> : 'Reopen'}</button></td>}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
          </>
        )}
      </div>
    </>
  );
};
export default MaintenancePage;
