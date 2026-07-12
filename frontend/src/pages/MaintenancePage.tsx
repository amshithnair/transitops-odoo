import React, { useState } from 'react';
import client from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useData } from '../lib/useData';
import { useSort } from '../lib/useSort';
import { demoMaintenance, demoVehicles } from '../lib/demo';
import type { Maintenance, Vehicle } from '../lib/types';
import { canEdit, roleLabel } from '../lib/roles';
import { fmtNum, fmtDate } from '../lib/status';
import { logActivity } from '../lib/activity';
import { PageHead, Badge, Th, CustomSelect } from '../components/ui';
import { IconAlert, IconCheck } from '../components/Icons';

export const MaintenancePage: React.FC = () => {
  const { user } = useAuth();
  const editable = canEdit(user?.role, 'fleet');
  const { data: logs, setData: setLogs } = useData<Maintenance[]>('/maintenance', demoMaintenance);
  const { data: vehicles, setData: setVehicles } = useData<Vehicle[]>('/vehicles', demoVehicles);
  const rows = Array.isArray(logs) ? logs : demoMaintenance;
  const vehRows = Array.isArray(vehicles) ? vehicles : demoVehicles;
  const { sorted, toggle, arrow } = useSort<Maintenance>(rows);

  const [vehicle, setVehicle] = useState('');
  const [service, setService] = useState('');
  const [cost, setCost] = useState<number>(0);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [status, setStatus] = useState<'Active' | 'Closed'>('Active');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vehicle || !service) return;
    const rec: Maintenance = { id: `m${Date.now()}`, vehicle_label: vehicle, service_type: service, cost, date, status };
    setLogs([rec, ...rows]);
    // cascade: Active -> vehicle In Shop
    if (status === 'Active') setVehicles(vehRows.map((v) => (v.registration_number === vehicle ? { ...v, status: 'In Shop' } : v)));
    logActivity({ actor: user?.name || 'Unknown', role: roleLabel(user?.role), entity: 'Maintenance', entityLabel: vehicle, action: `${service} logged (${status})`, detail: status === 'Active' ? 'Vehicle → In Shop' : undefined });
    setVehicle(''); setService(''); setCost(0);
    try { await client.post('/maintenance', { vehicle_label: vehicle, service_type: service, cost, date, status }); } catch { /* offline demo */ }
  };

  const toggleClose = async (m: Maintenance) => {
    const nextStatus = m.status === 'Active' ? 'Closed' : 'Active';
    setLogs(rows.map((x) => (x.id === m.id ? { ...x, status: nextStatus } : x)));
    logActivity({ actor: user?.name || 'Unknown', role: roleLabel(user?.role), entity: 'Maintenance', entityLabel: m.vehicle_label, action: nextStatus === 'Closed' ? 'Closed' : 'Reopened', detail: nextStatus === 'Closed' ? 'Vehicle → Available (unless Retired)' : 'Vehicle → In Shop' });
    // Closing -> vehicle Available (unless Retired); reopening -> In Shop
    setVehicles(vehRows.map((v) => {
      if (v.registration_number !== m.vehicle_label || v.status === 'Retired') return v;
      return { ...v, status: nextStatus === 'Closed' ? 'Available' : 'In Shop' };
    }));
    try { await client.patch(`/maintenance/${m.id}`, { status: nextStatus }); } catch { /* offline demo */ }
  };

  return (
    <>
      <PageHead title="Maintenance" sub="Service records & vehicle shop status" />
      {!editable && <div className="view-note"><IconAlert size={15} />View-only — a Fleet Manager logs and closes service records.</div>}

      <div className="two-col">
        <div className="card card-pad">
          <div className="card-title mb-20">Log Service Record</div>
          <form onSubmit={submit}>
            <div className="field"><label>Vehicle</label>
              <CustomSelect 
                value={vehicle} 
                onChange={setVehicle} 
                disabled={!editable} 
                options={[{value: '', label: 'Select vehicle…'}, ...vehRows.filter((v) => v.status !== 'Retired').map((v) => v.registration_number)]} 
                placeholder="Select vehicle…"
              />
            </div>
            <div className="field"><label>Service Type</label><input className="input" value={service} onChange={(e) => setService(e.target.value)} placeholder="Oil Change" disabled={!editable} required /></div>
            <div className="field-row">
              <div className="field"><label>Cost (₹)</label><input className="input" type="number" min={0} value={cost || ''} onChange={(e) => setCost(+e.target.value)} placeholder="2500" disabled={!editable} /></div>
              <div className="field"><label>Date</label><input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} disabled={!editable} /></div>
            </div>
            <div className="field"><label>Status</label><CustomSelect value={status} onChange={(v) => setStatus(v as any)} disabled={!editable} options={['Active', 'Closed']} /></div>
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
              <thead><tr>
                <Th label="Vehicle" arrow={arrow('vehicle_label')} onClick={() => toggle('vehicle_label')} />
                <Th label="Service" arrow={arrow('service_type')} onClick={() => toggle('service_type')} />
                <Th label="Cost" arrow={arrow('cost')} onClick={() => toggle('cost')} />
                <Th label="Date" arrow={arrow('date')} onClick={() => toggle('date')} />
                <Th label="Status" arrow={arrow('status')} onClick={() => toggle('status')} />
                {editable && <th></th>}
              </tr></thead>
              <tbody>
                {sorted.map((m) => (
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
      </div>
    </>
  );
};
export default MaintenancePage;
