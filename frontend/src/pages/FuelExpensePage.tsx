import React, { useState } from 'react';
import client from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useData } from '../lib/useData';
import { useSort } from '../lib/useSort';
import { demoFuel, demoExpenses, demoVehicles } from '../lib/demo';
import type { FuelLog, Expense, Vehicle } from '../lib/types';
import { canEdit } from '../lib/roles';
import { fmtNum, fmtDate } from '../lib/status';
import { PageHead, Modal, exportCsv, Th } from '../components/ui';
import { IconPlus, IconDownload } from '../components/Icons';

type ModalKind = 'fuel' | 'expense' | null;

export const FuelExpensePage: React.FC = () => {
  const { user } = useAuth();
  const editable = canEdit(user?.role, 'fuel');
  const { data: fuelData, setData: setFuel } = useData<FuelLog[]>('/fuel-logs', demoFuel);
  const { data: expData, setData: setExp } = useData<Expense[]>('/expenses', demoExpenses);
  const { data: vehicles } = useData<Vehicle[]>('/vehicles', demoVehicles);
  const fuelRows = Array.isArray(fuelData) ? fuelData : demoFuel;
  const expRows = Array.isArray(expData) ? expData : demoExpenses;
  const vehRows = Array.isArray(vehicles) ? vehicles : demoVehicles;
  const fuelSort = useSort<FuelLog>(fuelRows);
  const expSort = useSort<Expense>(expRows);

  const [modal, setModal] = useState<ModalKind>(null);
  const [f, setF] = useState<FuelLog>({ id: '', vehicle_label: '', date: new Date().toISOString().slice(0, 10), liters: 0, fuel_cost: 0 });
  const [ex, setEx] = useState<Expense>({ id: '', trip_code: '', vehicle_label: '', toll: 0, other_misc: 0, maintenance_cost: 0, total: 0 });

  // Auto-computed total operational cost = Fuel + Maintenance (kept in sync)
  const totalFuel = fuelRows.reduce((s, r) => s + r.fuel_cost, 0);
  const totalMaint = expRows.reduce((s, r) => s + r.maintenance_cost, 0);
  const totalOps = totalFuel + totalMaint;

  const saveFuel = async (e: React.FormEvent) => {
    e.preventDefault();
    setFuel([{ ...f, id: `f${Date.now()}` }, ...fuelRows]);
    setModal(null);
    try { await client.post('/fuel-logs', f); } catch { /* offline demo */ }
    setF({ id: '', vehicle_label: '', date: new Date().toISOString().slice(0, 10), liters: 0, fuel_cost: 0 });
  };

  const saveExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    const total = ex.toll + ex.other_misc + ex.maintenance_cost;
    setExp([{ ...ex, total, id: `e${Date.now()}` }, ...expRows]);
    setModal(null);
    try { await client.post('/expenses', { ...ex, total }); } catch { /* offline demo */ }
    setEx({ id: '', trip_code: '', vehicle_label: '', toll: 0, other_misc: 0, maintenance_cost: 0, total: 0 });
  };

  return (
    <>
      <PageHead title="Fuel & Expense Management" sub="Fuel logs, tolls, maintenance & operational cost">
        <button className="btn btn-ghost" onClick={() => exportCsv('expenses.csv', expRows as unknown as Record<string, unknown>[])}><IconDownload size={15} />CSV</button>
        {editable && <><button className="btn btn-ghost" onClick={() => setModal('fuel')}><IconPlus size={15} />Log Fuel</button>
          <button className="btn btn-primary" onClick={() => setModal('expense')}><IconPlus size={15} />Add Expense</button></>}
      </PageHead>

      <div className="card mb-16">
        <div className="card-head"><h3>Fuel Logs</h3></div>
        <div className="table-wrap">
          <table className="table">
            <thead><tr>
              <Th label="Vehicle" arrow={fuelSort.arrow('vehicle_label')} onClick={() => fuelSort.toggle('vehicle_label')} />
              <Th label="Date" arrow={fuelSort.arrow('date')} onClick={() => fuelSort.toggle('date')} />
              <Th label="Liters" arrow={fuelSort.arrow('liters')} onClick={() => fuelSort.toggle('liters')} />
              <Th label="Fuel Cost" arrow={fuelSort.arrow('fuel_cost')} onClick={() => fuelSort.toggle('fuel_cost')} />
            </tr></thead>
            <tbody>
              {fuelSort.sorted.map((r) => (
                <tr key={r.id}><td className="mono td-strong">{r.vehicle_label}</td><td className="text-muted">{fmtDate(r.date)}</td><td>{r.liters} L</td><td>₹{fmtNum(r.fuel_cost)}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card mb-16">
        <div className="card-head"><h3>Other Expenses (Toll / Misc)</h3></div>
        <div className="table-wrap">
          <table className="table">
            <thead><tr>
              <Th label="Trip" arrow={expSort.arrow('trip_code')} onClick={() => expSort.toggle('trip_code')} />
              <Th label="Vehicle" arrow={expSort.arrow('vehicle_label')} onClick={() => expSort.toggle('vehicle_label')} />
              <Th label="Toll" arrow={expSort.arrow('toll')} onClick={() => expSort.toggle('toll')} />
              <Th label="Other Misc" arrow={expSort.arrow('other_misc')} onClick={() => expSort.toggle('other_misc')} />
              <th>Maint. (linked)</th>
              <Th label="Total" arrow={expSort.arrow('total')} onClick={() => expSort.toggle('total')} />
            </tr></thead>
            <tbody>
              {expSort.sorted.map((r) => (
                <tr key={r.id}>
                  <td className="mono">{r.trip_code}</td><td className="mono">{r.vehicle_label}</td>
                  <td>₹{fmtNum(r.toll)}</td><td>₹{fmtNum(r.other_misc)}</td><td>₹{fmtNum(r.maintenance_cost)}</td>
                  <td className="td-strong">₹{fmtNum(r.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card card-pad">
        <div className="big-total">Total Operational Cost (auto) = Fuel + Maintenance <span className="amt">₹{fmtNum(totalOps)}</span></div>
        <div className="text-faint" style={{ fontSize: 12, marginTop: 6 }}>Fuel ₹{fmtNum(totalFuel)} + Maintenance ₹{fmtNum(totalMaint)} · recomputed live</div>
      </div>

      {modal === 'fuel' && (
        <Modal title="Log Fuel" onClose={() => setModal(null)} footer={<><button className="btn btn-ghost" onClick={() => setModal(null)}>Cancel</button><button className="btn btn-primary" form="fuel-form">Save</button></>}>
          <form id="fuel-form" onSubmit={saveFuel}>
            <div className="field"><label>Vehicle</label><select className="select" required value={f.vehicle_label} onChange={(e) => setF({ ...f, vehicle_label: e.target.value })}><option value="">Select…</option>{vehRows.map((v) => <option key={v.id}>{v.registration_number}</option>)}</select></div>
            <div className="field-row">
              <div className="field"><label>Date</label><input className="input" type="date" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} /></div>
              <div className="field"><label>Liters</label><input className="input" type="number" min={0} value={f.liters || ''} onChange={(e) => setF({ ...f, liters: +e.target.value })} /></div>
            </div>
            <div className="field"><label>Fuel Cost (₹)</label><input className="input" type="number" min={0} value={f.fuel_cost || ''} onChange={(e) => setF({ ...f, fuel_cost: +e.target.value })} /></div>
          </form>
        </Modal>
      )}

      {modal === 'expense' && (
        <Modal title="Add Expense" onClose={() => setModal(null)} footer={<><button className="btn btn-ghost" onClick={() => setModal(null)}>Cancel</button><button className="btn btn-primary" form="exp-form">Save</button></>}>
          <form id="exp-form" onSubmit={saveExpense}>
            <div className="field-row">
              <div className="field"><label>Trip Code</label><input className="input" value={ex.trip_code} onChange={(e) => setEx({ ...ex, trip_code: e.target.value })} placeholder="TR001" /></div>
              <div className="field"><label>Vehicle</label><select className="select" value={ex.vehicle_label} onChange={(e) => setEx({ ...ex, vehicle_label: e.target.value })}><option value="">Select…</option>{vehRows.map((v) => <option key={v.id}>{v.registration_number}</option>)}</select></div>
            </div>
            <div className="field-row">
              <div className="field"><label>Toll (₹)</label><input className="input" type="number" min={0} value={ex.toll || ''} onChange={(e) => setEx({ ...ex, toll: +e.target.value })} /></div>
              <div className="field"><label>Other Misc (₹)</label><input className="input" type="number" min={0} value={ex.other_misc || ''} onChange={(e) => setEx({ ...ex, other_misc: +e.target.value })} /></div>
            </div>
            <div className="field"><label>Linked Maintenance Cost (₹)</label><input className="input" type="number" min={0} value={ex.maintenance_cost || ''} onChange={(e) => setEx({ ...ex, maintenance_cost: +e.target.value })} /></div>
            <div className="big-total">Total <span className="amt">₹{fmtNum(ex.toll + ex.other_misc + ex.maintenance_cost)}</span></div>
          </form>
        </Modal>
      )}
    </>
  );
};
export default FuelExpensePage;
