import React, { useState } from 'react';
import client from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useData } from '../lib/useData';
import { useSort } from '../lib/useSort';
import { demoFuel, demoExpenses, demoVehicles } from '../lib/demo';
import type { FuelLog, Expense, Vehicle } from '../lib/types';
import { canEdit } from '../lib/roles';
import { fmtNum, fmtDate } from '../lib/status';
import { PageHead, Modal, exportCsv, Th, StatBars } from '../components/ui';
import { IconPlus, IconDownload } from '../components/Icons';

type ModalKind = 'fuel' | 'expense' | null;

export const FuelExpensePage: React.FC = () => {
  const { user } = useAuth();
  const editable = canEdit(user?.role, 'fuel');
  const { data: fuelData } = useData<FuelLog[]>('/fuel-logs', demoFuel);
  const { data: expData } = useData<Expense[]>('/expenses', demoExpenses);
  const { data: vehicles } = useData<Vehicle[]>('/vehicles', demoVehicles);
  const fuelRows = Array.isArray(fuelData) ? fuelData : demoFuel;
  const expRows = Array.isArray(expData) ? expData : demoExpenses;
  const vehRows = Array.isArray(vehicles) ? vehicles : demoVehicles;
  const fuelSort = useSort<FuelLog>(fuelRows);
  const expSort = useSort<Expense>(expRows);

  const [modal, setModal] = useState<ModalKind>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  // Fuel form
  const [f, setF] = useState({ vehicle_label: '', date: new Date().toISOString().slice(0, 10), liters: 0, fuel_cost: 0 });
  // Expense form
  const [ex, setEx] = useState({ trip_code: '', vehicle_label: '', toll: 0, other_misc: 0, maintenance_cost: 0, total: 0 });

  const openFuelModal = (log?: FuelLog) => {
    setErr(null);
    if (log) {
      setEditId(log.id);
      setF({ vehicle_label: log.vehicle_label, date: log.date, liters: log.liters, fuel_cost: log.fuel_cost });
    } else {
      setEditId(null);
      setF({ vehicle_label: '', date: new Date().toISOString().slice(0, 10), liters: 0, fuel_cost: 0 });
    }
    setModal('fuel');
  };

  const openExpModal = (expense?: Expense) => {
    setErr(null);
    if (expense) {
      setEditId(expense.id);
      setEx({ trip_code: expense.trip_code, vehicle_label: expense.vehicle_label, toll: expense.toll, other_misc: expense.other_misc, maintenance_cost: expense.maintenance_cost, total: expense.total });
    } else {
      setEditId(null);
      setEx({ trip_code: '', vehicle_label: '', toll: 0, other_misc: 0, maintenance_cost: 0, total: 0 });
    }
    setModal('expense');
  };

  const saveFuel = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    try {
      const payload = { ...f };
      if (editId) await client.put(`/fuel-expense/fuel/${editId}`, payload);
      else await client.post('/fuel-expense/fuel', payload);
      setModal(null);
    } catch (e2: unknown) {
      const r = e2 as { response?: { data?: { detail?: string } } };
      setErr(r.response?.data?.detail || 'Save failed.');
    }
  };

  const saveExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    try {
      const payload = { ...ex };
      if (editId) await client.put(`/fuel-expense/expenses/${editId}`, payload);
      else await client.post('/fuel-expense/expenses', payload);
      setModal(null);
    } catch (e2: unknown) {
      const r = e2 as { response?: { data?: { detail?: string } } };
      setErr(r.response?.data?.detail || 'Save failed.');
    }
  };

  // Vehicle cost breakdown for stat bars
  const costByVehicle = new Map<string, number>();
  for (const log of fuelRows) costByVehicle.set(log.vehicle_label, (costByVehicle.get(log.vehicle_label) || 0) + log.fuel_cost);
  for (const exp of expRows) costByVehicle.set(exp.vehicle_label, (costByVehicle.get(exp.vehicle_label) || 0) + exp.maintenance_cost);
  const costBars = Array.from(costByVehicle.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5).map((v, i) => ({
    label: v[0], value: v[1], color: ['var(--red)', 'var(--amber)', 'var(--blue)', 'var(--green)', 'var(--gray)'][i] || 'var(--blue)',
  }));

  return (
    <>
      <PageHead title="Fuel & Expense Management" sub="Fuel logs, expenses & operational cost">
        <button className="btn btn-ghost" onClick={() => exportCsv('fuel_logs.csv', fuelRows as unknown as Record<string, unknown>[])}><IconDownload size={15} />CSV</button>
        {editable && <>
          <button className="btn btn-ghost" onClick={() => openFuelModal()}><IconPlus size={15} />Log Fuel</button>
          <button className="btn btn-primary" onClick={() => openExpModal()}><IconPlus size={15} />Add Expense</button>
        </>}
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

      {costBars.length > 0 && (
        <div className="card card-pad">
          <div className="card-title mb-20">Vehicle-wise Cost Breakdown</div>
          <StatBars data={costBars} />
        </div>
      )}

      {modal === 'fuel' && (
        <Modal title={editId ? 'Edit Fuel Log' : 'Log Fuel'} onClose={() => setModal(null)} footer={<><button className="btn btn-ghost" onClick={() => setModal(null)}>Cancel</button><button className="btn btn-primary" form="fuel-form">Save</button></>}>
          <form id="fuel-form" onSubmit={saveFuel}>
            {err && <div className="alert alert-danger">{err}</div>}
            <div className="field-row">
              <div className="field"><label>Vehicle</label><select className="select" required value={f.vehicle_label} onChange={(e) => setF({ ...f, vehicle_label: e.target.value })}><option value="">Select…</option>{vehRows.map((v) => <option key={v.id} value={v.registration_number}>{v.registration_number}</option>)}</select></div>
            </div>
            <div className="field-row">
              <div className="field"><label>Date</label><input className="input" type="date" required value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} /></div>
              <div className="field"><label>Liters</label><input className="input" type="number" min={0.1} step="0.1" required value={f.liters || ''} onChange={(e) => setF({ ...f, liters: +e.target.value })} /></div>
            </div>
            <div className="field-row">
              <div className="field"><label>Fuel Cost (₹)</label><input className="input" type="number" min={0.01} step="0.01" required value={f.fuel_cost || ''} onChange={(e) => setF({ ...f, fuel_cost: +e.target.value })} /></div>
            </div>
          </form>
        </Modal>
      )}

      {modal === 'expense' && (
        <Modal title={editId ? 'Edit Expense' : 'Add Expense'} onClose={() => setModal(null)} footer={<><button className="btn btn-ghost" onClick={() => setModal(null)}>Cancel</button><button className="btn btn-primary" form="exp-form">Save</button></>}>
          <form id="exp-form" onSubmit={saveExpense}>
            {err && <div className="alert alert-danger">{err}</div>}
            <div className="field-row">
              <div className="field"><label>Trip Code</label><input className="input" value={ex.trip_code} onChange={(e) => setEx({ ...ex, trip_code: e.target.value })} placeholder="TR001" /></div>
              <div className="field"><label>Vehicle</label><select className="select" required value={ex.vehicle_label} onChange={(e) => setEx({ ...ex, vehicle_label: e.target.value })}><option value="">Select…</option>{vehRows.map((v) => <option key={v.id} value={v.registration_number}>{v.registration_number}</option>)}</select></div>
            </div>
            <div className="field-row">
              <div className="field"><label>Toll (₹)</label><input className="input" type="number" min={0} step="0.01" required value={ex.toll || ''} onChange={(e) => setEx({ ...ex, toll: +e.target.value })} /></div>
              <div className="field"><label>Other Misc (₹)</label><input className="input" type="number" min={0} step="0.01" required value={ex.other_misc || ''} onChange={(e) => setEx({ ...ex, other_misc: +e.target.value })} /></div>
            </div>
            <div className="field-row">
              <div className="field"><label>Total (₹)</label><input className="input" type="number" min={0} step="0.01" required value={ex.total || ''} onChange={(e) => setEx({ ...ex, total: +e.target.value })} /></div>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
};
export default FuelExpensePage;
