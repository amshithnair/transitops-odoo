import React, { useState } from 'react';
import client from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useData } from '../hooks/useData';
import type { FuelLog, Expense, Vehicle, Driver, PaginatedResponse, FuelExpenseSummary } from '../types';
import { canEdit } from '../utils/roles';
import { fmtNum, fmtDate } from '../utils/status';
import { PageHead, Modal, exportCsv, Loader, Kpi, StatBars, Badge } from '../components/ui';
import { IconPlus, IconDownload, IconEdit, IconTrash, IconFuel, IconChart } from '../components/Icons';

type ModalKind = 'fuel' | 'expense' | null;
const EXP_CATEGORIES = ['Toll', 'Fine', 'Parking', 'Other'];

export const FuelExpensePage: React.FC = () => {
  const { user } = useAuth();
  const editable = canEdit(user?.role, 'fuel');

  const [vehFilter, setVehFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [tab, setTab] = useState<'fuel' | 'expense'>('fuel');

  const fuelParams: Record<string, unknown> = { page: 1, page_size: 50 };
  if (vehFilter) fuelParams.vehicle_id = vehFilter;
  if (dateFrom) fuelParams.date_from = dateFrom;
  if (dateTo) fuelParams.date_to = dateTo;
  const params: Record<string, unknown> = { page: 1, page_size: 50 };
  if (vehFilter) params.vehicle_id = vehFilter;
  if (dateFrom) params.date_from = dateFrom;
  if (dateTo) params.date_to = dateTo;

  const { data: fuelData, loading: fLoad, error: fErr, reload: fRel } = useData<PaginatedResponse<FuelLog>>('/fuel-expense/fuel', params);
  const { data: expData, loading: eLoad, error: eErr, reload: eRel } = useData<PaginatedResponse<Expense>>('/fuel-expense/expenses', params);
  const { data: sumData } = useData<FuelExpenseSummary>('/fuel-expense/summary', { start_date: dateFrom, end_date: dateTo });

  const { data: vehData } = useData<PaginatedResponse<Vehicle>>('/vehicles', { page_size: 1000 });
  const { data: drvData } = useData<PaginatedResponse<Driver>>('/drivers', { page_size: 1000 });

  const fuels = fuelData?.items ?? [];
  const fTotal = fuelData?.total ?? 0;
  const exps = expData?.items ?? [];
  const eTotal = expData?.total ?? 0;
  const summary = sumData;

  const vehicles = vehData?.items ?? [];
  const drivers = drvData?.items ?? [];

  const [modal, setModal] = useState<ModalKind>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  // Fuel form
  const [f, setF] = useState({ vehicle_id: '', driver_id: '', date: new Date().toISOString().slice(0, 10), liters: 0, cost: 0, odometer_km: 0 });
  // Expense form
  const [ex, setEx] = useState({ vehicle_id: '', driver_id: '', category: 'Toll', amount: 0, date: new Date().toISOString().slice(0, 10), description: '', notes: '' });

  const openFuelModal = (log?: FuelLog) => {
    setErr(null);
    if (log) {
      setEditId(log.id);
      setF({ vehicle_id: log.vehicle_id, driver_id: log.driver_id || '', date: log.date, liters: log.liters, cost: log.cost, odometer_km: log.odometer_km || 0 });
    } else {
      setEditId(null);
      setF({ vehicle_id: '', driver_id: '', date: new Date().toISOString().slice(0, 10), liters: 0, cost: 0, odometer_km: 0 });
    }
    setModal('fuel');
  };

  const openExpModal = (expense?: Expense) => {
    setErr(null);
    if (expense) {
      setEditId(expense.id);
      setEx({ vehicle_id: expense.vehicle_id, driver_id: expense.driver_id || '', category: expense.category, amount: expense.amount, date: expense.date, description: expense.description || '', notes: expense.notes || '' });
    } else {
      setEditId(null);
      setEx({ vehicle_id: '', driver_id: '', category: 'Toll', amount: 0, date: new Date().toISOString().slice(0, 10), description: '', notes: '' });
    }
    setModal('expense');
  };

  const saveFuel = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    try {
      const payload = { ...f, driver_id: f.driver_id || null, odometer_km: f.odometer_km || null };
      if (editId) await client.put(`/fuel-expense/fuel/${editId}`, payload);
      else await client.post('/fuel-expense/fuel', payload);
      setModal(null); fRel();
    } catch (e2: unknown) {
      const r = e2 as { response?: { data?: { detail?: string } } };
      setErr(r.response?.data?.detail || 'Save failed.');
    }
  };

  const saveExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    try {
      const payload = { ...ex, driver_id: ex.driver_id || null, description: ex.description || null, notes: ex.notes || null };
      if (editId) await client.put(`/fuel-expense/expenses/${editId}`, payload);
      else await client.post('/fuel-expense/expenses', payload);
      setModal(null); eRel();
    } catch (e2: unknown) {
      const r = e2 as { response?: { data?: { detail?: string } } };
      setErr(r.response?.data?.detail || 'Save failed.');
    }
  };

  const deleteFuel = async (id: string) => {
    if (!confirm('Delete this fuel log?')) return;
    try { await client.delete(`/fuel-expense/fuel/${id}`); fRel(); } catch { /* */ }
  };

  const deleteExpense = async (id: string) => {
    if (!confirm('Delete this expense?')) return;
    try { await client.delete(`/fuel-expense/expenses/${id}`); eRel(); } catch { /* */ }
  };

  // Vehicle cost breakdown for stat bars
  const costBars = (summary?.vehicle_totals ?? []).slice(0, 5).map((v, i) => ({
    label: v.vehicle, value: v.total, color: ['var(--red)', 'var(--amber)', 'var(--blue)', 'var(--green)', 'var(--gray)'][i] || 'var(--blue)',
  }));

  return (
    <>
      <PageHead title="Fuel & Expense Management" sub="Fuel logs, expenses & operational cost">
        <button className="btn btn-ghost" onClick={() => exportCsv(tab === 'fuel' ? 'fuel_logs.csv' : 'expenses.csv', (tab === 'fuel' ? fuels : exps) as unknown as Record<string, unknown>[])}><IconDownload size={15} />CSV</button>
        {editable && <>
          <button className="btn btn-ghost" onClick={() => openFuelModal()}><IconPlus size={15} />Log Fuel</button>
          <button className="btn btn-primary" onClick={() => openExpModal()}><IconPlus size={15} />Add Expense</button>
        </>}
      </PageHead>

      <div className="kpi-row mb-20">
        <Kpi label="Total Fuel Cost" value={`₹${fmtNum(summary?.total_fuel_cost ?? 0)}`} color="var(--amber)" icon={<IconFuel />} sub={`${fmtNum(summary?.total_fuel_liters ?? 0)} liters`} />
        <Kpi label="Total Expenses" value={`₹${fmtNum(summary?.total_expense_amount ?? 0)}`} color="var(--red)" icon={<IconChart />} sub="Toll + Fine + Other" />
        <Kpi label="Operational Total" value={`₹${fmtNum((summary?.total_fuel_cost ?? 0) + (summary?.total_expense_amount ?? 0))}`} color="var(--accent)" icon={<IconChart />} sub="Fuel + Expenses" />
      </div>

      <div className="filters">
        <div className="filter-group"><label>Vehicle</label><select className="select" value={vehFilter} onChange={(e) => setVehFilter(e.target.value)}><option value="">All</option>{vehicles.map(v => <option key={v.id} value={v.id}>{v.registration_number}</option>)}</select></div>
        <div className="filter-group"><label>From</label><input className="input" type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} /></div>
        <div className="filter-group"><label>To</label><input className="input" type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} /></div>
      </div>

      <div className="flex gap-12 mb-16">
        <button className={`pill ${tab === 'fuel' ? 'active' : ''}`} onClick={() => setTab('fuel')}>Fuel Logs ({fTotal})</button>
        <button className={`pill ${tab === 'expense' ? 'active' : ''}`} onClick={() => setTab('expense')}>Expenses ({eTotal})</button>
      </div>

      {tab === 'fuel' && (
        fLoad ? <Loader /> : fErr ? <div className="alert alert-danger">{fErr}</div> : (
        <div className="card mb-16">
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>Vehicle</th><th>Driver</th><th>Date</th><th>Liters</th><th>Cost</th><th>Odometer</th>{editable && <th></th>}</tr></thead>
              <tbody>
                {fuels.map((r) => (
                  <tr key={r.id}>
                    <td className="mono td-strong">{r.vehicle_registration || '—'}</td>
                    <td>{r.driver_name || '—'}</td>
                    <td className="text-muted">{fmtDate(r.date)}</td>
                    <td>{r.liters} L</td>
                    <td>₹{fmtNum(r.cost)}</td>
                    <td className="text-muted">{r.odometer_km ? `${fmtNum(r.odometer_km)} km` : '—'}</td>
                    {editable && <td><div className="flex gap-8"><button className="icon-btn" onClick={() => openFuelModal(r)}><IconEdit size={15} /></button><button className="icon-btn" onClick={() => deleteFuel(r.id)}><IconTrash size={15} /></button></div></td>}
                  </tr>
                ))}
                {fuels.length === 0 && <tr><td colSpan={editable ? 7 : 6} className="empty-row">No fuel logs found.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
        )
      )}

      {tab === 'expense' && (
        eLoad ? <Loader /> : eErr ? <div className="alert alert-danger">{eErr}</div> : (
        <div className="card mb-16">
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>Vehicle</th><th>Driver</th><th>Category</th><th>Description</th><th>Date</th><th>Amount</th>{editable && <th></th>}</tr></thead>
              <tbody>
                {exps.map((r) => (
                  <tr key={r.id}>
                    <td className="mono td-strong">{r.vehicle_registration || '—'}</td>
                    <td>{r.driver_name || '—'}</td>
                    <td><Badge status={r.category || 'Other'} /></td>
                    <td>{r.description || '—'}</td>
                    <td className="text-muted">{fmtDate(r.date)}</td>
                    <td className="td-strong">₹{fmtNum(r.amount)}</td>
                    {editable && <td><div className="flex gap-8"><button className="icon-btn" onClick={() => openExpModal(r)}><IconEdit size={15} /></button><button className="icon-btn" onClick={() => deleteExpense(r.id)}><IconTrash size={15} /></button></div></td>}
                  </tr>
                ))}
                {exps.length === 0 && <tr><td colSpan={editable ? 7 : 6} className="empty-row">No expenses found.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      ))}

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
              <div className="field"><label>Vehicle</label><select className="select" required value={f.vehicle_id} onChange={(e) => setF({ ...f, vehicle_id: e.target.value })}><option value="">Select…</option>{vehicles.map((v) => <option key={v.id} value={v.id}>{v.registration_number}</option>)}</select></div>
              <div className="field"><label>Driver</label><select className="select" value={f.driver_id} onChange={(e) => setF({ ...f, driver_id: e.target.value })}><option value="">None</option>{drivers.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</select></div>
            </div>
            <div className="field-row">
              <div className="field"><label>Date</label><input className="input" type="date" required value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} /></div>
              <div className="field"><label>Liters</label><input className="input" type="number" min={0.1} step="0.1" required value={f.liters || ''} onChange={(e) => setF({ ...f, liters: +e.target.value })} /></div>
            </div>
            <div className="field-row">
              <div className="field"><label>Cost (₹)</label><input className="input" type="number" min={0.01} step="0.01" required value={f.cost || ''} onChange={(e) => setF({ ...f, cost: +e.target.value })} /></div>
              <div className="field"><label>Odometer (km)</label><input className="input" type="number" min={0} value={f.odometer_km || ''} onChange={(e) => setF({ ...f, odometer_km: +e.target.value })} /></div>
            </div>
          </form>
        </Modal>
      )}

      {modal === 'expense' && (
        <Modal title={editId ? 'Edit Expense' : 'Add Expense'} onClose={() => setModal(null)} footer={<><button className="btn btn-ghost" onClick={() => setModal(null)}>Cancel</button><button className="btn btn-primary" form="exp-form">Save</button></>}>
          <form id="exp-form" onSubmit={saveExpense}>
            {err && <div className="alert alert-danger">{err}</div>}
            <div className="field-row">
              <div className="field"><label>Vehicle</label><select className="select" required value={ex.vehicle_id} onChange={(e) => setEx({ ...ex, vehicle_id: e.target.value })}><option value="">Select…</option>{vehicles.map((v) => <option key={v.id} value={v.id}>{v.registration_number}</option>)}</select></div>
              <div className="field"><label>Driver</label><select className="select" value={ex.driver_id} onChange={(e) => setEx({ ...ex, driver_id: e.target.value })}><option value="">None</option>{drivers.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</select></div>
            </div>
            <div className="field-row">
              <div className="field"><label>Category</label><select className="select" required value={ex.category} onChange={(e) => setEx({ ...ex, category: e.target.value })}>{EXP_CATEGORIES.map(c => <option key={c}>{c}</option>)}</select></div>
              <div className="field"><label>Amount (₹)</label><input className="input" type="number" min={0.01} step="0.01" required value={ex.amount || ''} onChange={(e) => setEx({ ...ex, amount: +e.target.value })} /></div>
            </div>
            <div className="field"><label>Date</label><input className="input" type="date" required value={ex.date} onChange={(e) => setEx({ ...ex, date: e.target.value })} /></div>
            <div className="field"><label>Description</label><input className="input" value={ex.description} onChange={(e) => setEx({ ...ex, description: e.target.value })} placeholder="Highway toll — Route 66" /></div>
            <div className="field"><label>Notes</label><textarea className="textarea" value={ex.notes} onChange={(e) => setEx({ ...ex, notes: e.target.value })} /></div>
          </form>
        </Modal>
      )}
    </>
  );
};
export default FuelExpensePage;
